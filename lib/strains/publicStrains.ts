// lib/strains/publicStrains.ts
//
// Server-side data access for the PUBLIC strain pages (/strains/*) — the
// programmatic-SEO surface built on the 35k Supabase `strains` table
// (public-read RLS). No auth, no client JS: these pages exist to rank.

import { createServerClient } from "@/app/_server/supabase/server";

export interface PublicStrain {
  slug: string;
  name: string;
  type: string | null;
  indica_percentage: number | null;
  sativa_percentage: number | null;
  thc_min: number | null;
  thc_max: number | null;
  cbd_min: number | null;
  cbd_max: number | null;
  description: string | null;
  genetics: string | null;
  breeder: string | null;
  flowering_time_min: number | null;
  flowering_time_max: number | null;
  yield_indoor: string | null;
  yield_outdoor: string | null;
  difficulty: string | null;
  effects: unknown;
  flavors: unknown;
}

const STRAIN_COLUMNS =
  "slug, name, type, indica_percentage, sativa_percentage, thc_min, thc_max, cbd_min, cbd_max, description, genetics, breeder, flowering_time_min, flowering_time_max, yield_indoor, yield_outdoor, difficulty, effects, flavors";

export async function getStrainBySlug(slug: string): Promise<PublicStrain | null> {
  const { data, error } = await createServerClient()
    .from("strains")
    .select(STRAIN_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) return null;
  return (data as PublicStrain) ?? null;
}

/** Same-type neighbors for internal linking (SEO crawl paths). */
export async function getRelatedStrains(
  slug: string,
  type: string | null,
  limit = 10
): Promise<{ slug: string; name: string }[]> {
  let query = createServerClient()
    .from("strains")
    .select("slug, name")
    .neq("slug", slug)
    .limit(limit);
  if (type) query = query.eq("type", type);
  const { data } = await query;
  return (data as { slug: string; name: string }[]) ?? [];
}

export async function getStrainsByLetter(letter: string): Promise<{ slug: string; name: string }[]> {
  const client = createServerClient();
  const pageSize = 1000;
  const all: { slug: string; name: string }[] = [];
  // Letter buckets can exceed PostgREST's row cap — page through.
  for (let from = 0; from < 10000; from += pageSize) {
    const { data, error } = await client
      .from("strains")
      .select("slug, name")
      .ilike("name", `${letter}%`)
      .order("name")
      .range(from, from + pageSize - 1);
    if (error || !data?.length) break;
    all.push(...(data as { slug: string; name: string }[]));
    if (data.length < pageSize) break;
  }
  return all;
}

/** One sitemap chunk of slugs (stable order for consistent chunking). */
export async function getSlugChunk(chunk: number, chunkSize: number): Promise<string[]> {
  const client = createServerClient();
  const pageSize = 1000;
  const out: string[] = [];
  const start = chunk * chunkSize;
  for (let off = 0; off < chunkSize; off += pageSize) {
    const { data, error } = await client
      .from("strains")
      .select("slug")
      .order("slug")
      .range(start + off, start + off + pageSize - 1);
    if (error || !data?.length) break;
    out.push(...(data as { slug: string }[]).map((r) => r.slug));
    if (data.length < pageSize) break;
  }
  return out;
}

/* ── display helpers (pure) ─────────────────────────────────────── */

export function asStringArray(v: unknown, max = 12): string[] {
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max);
  }
  return [];
}

export function thcLabel(s: PublicStrain): string | null {
  if (s.thc_min != null && s.thc_max != null && s.thc_max > 0) {
    return s.thc_min === s.thc_max ? `${s.thc_max}%` : `${s.thc_min}–${s.thc_max}%`;
  }
  if (s.thc_max != null && s.thc_max > 0) return `up to ${s.thc_max}%`;
  return null;
}

export function typeLabel(s: PublicStrain): string {
  const t = (s.type ?? "").toLowerCase();
  if (t.includes("indica") && s.indica_percentage && s.indica_percentage > 50)
    return `Indica-dominant (${s.indica_percentage}% indica)`;
  if (t.includes("sativa") && s.sativa_percentage && s.sativa_percentage > 50)
    return `Sativa-dominant (${s.sativa_percentage}% sativa)`;
  return s.type ?? "Hybrid";
}

export const BROWSE_LETTERS = ["0", ..."abcdefghijklmnopqrstuvwxyz".split("")];
