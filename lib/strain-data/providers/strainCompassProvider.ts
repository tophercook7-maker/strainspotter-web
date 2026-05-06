import type {
  NormalizedExternalStrain,
  ProviderStatus,
  StrainDataProvider,
} from "./types";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_BASE_URL = "https://straincompass.com/api";
const BACKEND_ENV_KEYS = new Set([
  "STRAINCOMPASS_API_KEY",
  "TERPSCOUT_API_KEY",
  "STRAINCOMPASS_BASE_URL",
]);
let loadedLocalEnv = false;

function parseEnvLine(line: string): { key: string; value: string } | null {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match) return null;
  let value = match[2] ?? "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key: match[1], value };
}

function loadLocalBackendEnv() {
  if (loadedLocalEnv) return;
  loadedLocalEnv = true;

  const envPath = path.join(process.cwd(), "env", ".env.local");
  if (!fs.existsSync(envPath)) return;

  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed || !BACKEND_ENV_KEYS.has(parsed.key)) continue;
    if (parsed.key in process.env && process.env[parsed.key]) continue;
    process.env[parsed.key] = parsed.value;
  }
}

export function getStrainCompassBaseUrl(): string {
  loadLocalBackendEnv();
  return process.env.STRAINCOMPASS_BASE_URL || DEFAULT_BASE_URL;
}

function getStrainCompassApiKey(): string {
  loadLocalBackendEnv();
  return process.env.STRAINCOMPASS_API_KEY || process.env.TERPSCOUT_API_KEY || "";
}

export function isStrainCompassAuthConfigured(): boolean {
  return Boolean(getStrainCompassApiKey());
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pickArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  for (const key of ["data", "results", "strains", "items"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalize(row: unknown): NormalizedExternalStrain | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const name =
    typeof r.name === "string"
      ? r.name
      : typeof r.strainName === "string"
        ? r.strainName
        : "";
  if (!name.trim()) return null;
  const slug =
    typeof r.slug === "string" && r.slug.trim() ? r.slug.trim() : slugify(name);

  return {
    slug,
    name,
    type: typeof r.type === "string" ? r.type : null,
    thcMin: numberOrNull(r.thcMin ?? r.thc_min),
    thcMax: numberOrNull(r.thcMax ?? r.thc_max ?? r.thc),
    cbdMin: numberOrNull(r.cbdMin ?? r.cbd_min),
    cbdMax: numberOrNull(r.cbdMax ?? r.cbd_max ?? r.cbd),
    effects: Array.isArray(r.effects) ? r.effects : [],
    flavors: Array.isArray(r.flavors) ? r.flavors : [],
    terpenes: Array.isArray(r.terpenes) ? r.terpenes : [],
    lineage: typeof r.lineage === "string" ? r.lineage : null,
    breeder: typeof r.breeder === "string" ? r.breeder : null,
    description: typeof r.description === "string" ? r.description : null,
    imageUrl: typeof r.imageUrl === "string" ? r.imageUrl : null,
    source: "straincompass",
    sourceUrl: `https://straincompass.com/strains/${slug}`,
    raw: r,
  };
}

async function fetchCandidate(path: string): Promise<NormalizedExternalStrain[]> {
  const key = getStrainCompassApiKey();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "StrainSpotter/0.1 external strain metadata",
  };
  if (key) {
    headers.Authorization = `Bearer ${key}`;
    headers["x-api-key"] = key;
  }

  const res = await fetch(`${getStrainCompassBaseUrl()}${path}`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];
  const payload = await res.json();
  return pickArray(payload)
    .map(normalize)
    .filter((item): item is NormalizedExternalStrain => Boolean(item));
}

export const strainCompassProvider: StrainDataProvider = {
  id: "straincompass",
  status(): ProviderStatus {
    return "enabled";
  },
  async searchStrains(query: string, limit = 10) {
    const q = encodeURIComponent(query);
    const paths = [
      `/strains/search?q=${q}`,
      `/strains?q=${q}&limit=${Math.max(1, Math.min(50, limit))}`,
    ];
    for (const path of paths) {
      const results = await fetchCandidate(path);
      if (results.length) return results;
    }
    return [];
  },
  async getStrainCandidates(query: string, limit = 10) {
    const q = encodeURIComponent(query);
    return fetchCandidate(`/strains?q=${q}&limit=${Math.max(1, Math.min(50, limit))}`);
  },
  async getStrainByName(name: string) {
    const results = await this.searchStrains(name);
    const normalized = name.trim().toLowerCase();
    return (
      results.find((result) => result.name.trim().toLowerCase() === normalized) ??
      results[0] ??
      null
    );
  },
};
