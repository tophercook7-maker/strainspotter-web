import fs from "node:fs";
import path from "node:path";
import { budProfilesProvider } from "./providers/budProfilesProvider";
import { strainCompassProvider } from "./providers/strainCompassProvider";
import type {
  ExternalStrainSource,
  NormalizedExternalStrain,
  ProviderStatus,
  StrainDataProvider,
} from "./providers/types";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_DIR = path.join(process.cwd(), "data", "external-strain-cache");

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function configuredProviderIds(): Set<string> {
  return new Set(
    (process.env.STRAIN_DATA_PROVIDERS || "local,straincompass,budprofiles")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

function allProviders(): StrainDataProvider[] {
  return [strainCompassProvider, budProfilesProvider];
}

function activeProviders(): StrainDataProvider[] {
  const configured = configuredProviderIds();
  return allProviders().filter(
    (provider) => configured.has(provider.id) && provider.status() === "enabled"
  );
}

function cachePath(providerId: ExternalStrainSource, query: string): string {
  return path.join(CACHE_DIR, `${providerId}-${slugify(query)}.json`);
}

function readCache(providerId: ExternalStrainSource, query: string): NormalizedExternalStrain[] | null {
  const file = cachePath(providerId, query);
  if (!fs.existsSync(file)) return null;
  try {
    const payload = JSON.parse(fs.readFileSync(file, "utf8")) as {
      createdAt: string;
      results: NormalizedExternalStrain[];
    };
    if (Date.now() - new Date(payload.createdAt).getTime() > CACHE_TTL_MS) {
      return null;
    }
    return Array.isArray(payload.results) ? payload.results : [];
  } catch {
    return null;
  }
}

function writeCache(providerId: ExternalStrainSource, query: string, results: NormalizedExternalStrain[]) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(
    cachePath(providerId, query),
    JSON.stringify({ createdAt: new Date().toISOString(), results }, null, 2)
  );
}

export function getExternalProviderStatuses(): Record<string, ProviderStatus> {
  const configured = configuredProviderIds();
  const statuses: Record<string, ProviderStatus> = {};
  for (const provider of allProviders()) {
    statuses[provider.id] = configured.has(provider.id)
      ? provider.status()
      : "disabled_by_config";
  }
  return statuses;
}

export async function getStrainCompassCandidates(
  query: string,
  limit = 10
): Promise<NormalizedExternalStrain[]> {
  const clean = query.trim();
  if (clean.length < 3 || strainCompassProvider.status() !== "enabled") return [];
  const cached = readCache(strainCompassProvider.id, `candidates-${clean}`);
  if (cached) return cached;
  const results = await (
    strainCompassProvider.getStrainCandidates?.(clean, limit) ??
    strainCompassProvider.searchStrains(clean, limit)
  );
  writeCache(strainCompassProvider.id, `candidates-${clean}`, results);
  return results;
}

export async function searchExternalStrains(
  query: string
): Promise<NormalizedExternalStrain[]> {
  const clean = query.trim();
  if (clean.length < 3) return [];

  const merged = new Map<string, NormalizedExternalStrain>();
  for (const provider of activeProviders()) {
    try {
      const cached = readCache(provider.id, clean);
      const results = cached ?? (await provider.searchStrains(clean));
      if (!cached) writeCache(provider.id, clean, results);
      for (const result of results) {
        merged.set(`${result.source}:${result.slug}`, result);
      }
    } catch (error) {
      console.warn(`External strain provider ${provider.id} failed for query "${clean}":`, String(error));
    }
  }

  return [...merged.values()];
}
