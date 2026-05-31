// app/api/strains/route.ts
import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const NORMALIZED_CATALOG_PATH = join(ROOT, "data", "normalized-strain-catalog.json");
const FALLBACK_STRAINS_PATH = join(ROOT, "lib", "data", "strains.json");
const VALID_TYPES = new Set(["Indica", "Sativa", "Hybrid"]);

type LocalStrain = {
  id: string;
  name: string;
  slug: string;
  type: "Indica" | "Sativa" | "Hybrid" | "Unknown";
  description: string | null;
  effects: string[];
  flavors: string[];
  thc: number | null;
  cbd: number | null;
  indica_percentage: number;
  sativa_percentage: number;
  popularity: number;
  aliases?: string[];
  sourceCount?: number;
};

async function readJson(path: string, fallback: unknown) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    return value
      .split(/[,|•/]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeType(value: unknown): LocalStrain["type"] {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("indica")) return "Indica";
  if (raw.includes("sativa")) return "Sativa";
  if (raw.includes("hybrid")) return "Hybrid";
  return "Unknown";
}

function ratioForType(type: LocalStrain["type"]) {
  if (type === "Indica") return { indica_percentage: 80, sativa_percentage: 20 };
  if (type === "Sativa") return { indica_percentage: 20, sativa_percentage: 80 };
  return { indica_percentage: 50, sativa_percentage: 50 };
}

function numberOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mapNormalizedCatalogStrain(strain: any, index: number): LocalStrain | null {
  const slug = String(strain?.slug ?? "").trim();
  const name = String(strain?.displayName ?? strain?.name ?? "").trim();
  if (!slug || !name) return null;
  const type = normalizeType(strain.type);
  const ratio = ratioForType(type);
  return {
    id: slug || String(index),
    name,
    slug,
    type,
    description: strain?.metadata?.description ?? strain?.description ?? null,
    effects: normalizeArray(strain.effects).slice(0, 8),
    flavors: normalizeArray(strain.flavors).slice(0, 8),
    thc: numberOrNull(strain?.metadata?.thc ?? strain?.thc),
    cbd: numberOrNull(strain?.metadata?.cbd ?? strain?.cbd),
    ...ratio,
    popularity:
      strain.confidence === "high"
        ? 3
        : strain.confidence === "medium"
          ? 2
          : 1,
    aliases: normalizeArray(strain.aliases),
    sourceCount: Array.isArray(strain.sourceRefs) ? strain.sourceRefs.length : 0,
  };
}

function mapLegacyStrain(strain: any, index: number): LocalStrain | null {
  const name = String(strain?.name ?? "").trim();
  if (!name) return null;
  const slug = String(strain?.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
  const type = normalizeType(strain.type ?? strain.dominantType);
  const ratio = strain.indicaSativaRatio
    ? {
        indica_percentage: Number(strain.indicaSativaRatio.indica ?? 50),
        sativa_percentage: Number(strain.indicaSativaRatio.sativa ?? 50),
      }
    : ratioForType(type);
  return {
    id: slug || String(index),
    name,
    slug,
    type,
    description: strain.description ?? strain.visualProfile?.colorProfile ?? null,
    effects: normalizeArray(strain.effects).slice(0, 8),
    flavors: normalizeArray(strain.flavors ?? strain.terpeneProfile ?? strain.commonTerpenes).slice(0, 8),
    thc: numberOrNull(strain.thc),
    cbd: numberOrNull(strain.cbd),
    ...ratio,
    popularity: 2,
    aliases: normalizeArray(strain.aliases),
    sourceCount: Array.isArray(strain.sources) ? strain.sources.length : 1,
  };
}

async function loadLocalStrains() {
  const normalized = await readJson(NORMALIZED_CATALOG_PATH, null);
  if (Array.isArray((normalized as any)?.strains) && (normalized as any).strains.length > 0) {
    return {
      source: "normalized-catalog",
      catalogSize: (normalized as any).strains.length,
      strains: (normalized as any).strains
        .map(mapNormalizedCatalogStrain)
        .filter(Boolean) as LocalStrain[],
    };
  }

  const fallback = await readJson(FALLBACK_STRAINS_PATH, []);
  const rows = Array.isArray(fallback) ? fallback : [];
  return {
    source: "local-fallback",
    catalogSize: rows.length,
    strains: rows.map(mapLegacyStrain).filter(Boolean) as LocalStrain[],
  };
}

function searchMatches(strain: LocalStrain, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    strain.name.toLowerCase().includes(needle) ||
    strain.slug.toLowerCase().includes(needle) ||
    (strain.aliases ?? []).some((alias) => alias.toLowerCase().includes(needle))
  );
}

async function fetchSupabaseStrains(req: NextRequest, page: number, limit: number, offset: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    return null;
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";
  const sort = searchParams.get("sort") || "popular";
  const supabase = createClient(supabaseUrl, serviceRole);

  let query = supabase
    .from("strains")
    .select("id, name, slug, type, description, effects, flavors, thc, cbd, indica_percentage, sativa_percentage, image_url, popularity, confidence", { count: "exact" });

  if (q) query = query.ilike("name", `%${q}%`);
  if (type && VALID_TYPES.has(type)) query = query.eq("type", type);
  if (sort === "popular") query = query.order("popularity", { ascending: false }).order("name");
  else if (sort === "name") query = query.order("name");
  else if (sort === "newest") query = query.order("created_at", { ascending: false });

  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;

  const strains = (data || []).map((s: any) => ({
    ...s,
    effects: typeof s.effects === "string" ? JSON.parse(s.effects || "[]") : (s.effects || []),
    flavors: typeof s.flavors === "string" ? JSON.parse(s.flavors || "[]") : (s.flavors || []),
  }));

  return {
    strains,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
    catalogSize: count || 0,
    catalogSource: "supabase",
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";         // Indica, Sativa, Hybrid
  const sort = searchParams.get("sort") || "popular";  // popular, name, newest
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = (page - 1) * limit;

  try {
    const local = await loadLocalStrains();
    let filtered = local.strains.filter((strain) => {
      const matchesType = !type || type === "Unknown" || strain.type === type;
      return matchesType && searchMatches(strain, q);
    });

    filtered = filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return b.popularity - a.popularity || a.name.localeCompare(b.name);
    });

    const total = filtered.length;
    const strains = filtered.slice(offset, offset + limit);

    if (local.source === "local-fallback" && total === 0) {
      const supabaseResult = await fetchSupabaseStrains(req, page, limit, offset);
      if (supabaseResult) return NextResponse.json(supabaseResult);
    }

    return NextResponse.json({
      strains,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      catalogSize: local.catalogSize,
      catalogSource: local.source,
    });
  } catch (err: any) {
    console.error("Strains API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
