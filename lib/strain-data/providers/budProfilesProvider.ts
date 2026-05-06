import type {
  NormalizedExternalStrain,
  ProviderStatus,
  StrainDataProvider,
} from "./types";

const BASE_URL = "https://budprofiles.com/api/v1";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function extractReferenceImageUrls(row: Record<string, unknown>): string[] {
  const values = [
    row.image,
    row.image_url,
    row.imageUrl,
    row.photo,
    row.thumbnail,
    row.cover,
    row.media,
    row.photos,
    row.images,
  ];
  const urls = new Set<string>();

  function add(value: unknown) {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) {
      urls.add(value);
    } else if (Array.isArray(value)) {
      for (const item of value) add(item);
    } else if (value && typeof value === "object") {
      for (const child of Object.values(value as Record<string, unknown>)) add(child);
    }
  }

  for (const value of values) add(value);
  return [...urls];
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

function normalizeBudProfile(row: unknown): NormalizedExternalStrain | null {
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
    type:
      typeof r.type === "string"
        ? r.type
        : typeof r.category === "string"
          ? r.category
          : null,
    thcMin: numberOrNull(r.thcMin ?? r.thc_min),
    thcMax: numberOrNull(r.thcMax ?? r.thc_max ?? r.thc ?? r.thcLevel),
    cbdMin: numberOrNull(r.cbdMin ?? r.cbd_min),
    cbdMax: numberOrNull(r.cbdMax ?? r.cbd_max ?? r.cbd ?? r.cbdLevel),
    effects: asArray(r.effects),
    flavors: asArray(r.flavors ?? r.aromas),
    terpenes: asArray(r.terpenes),
    lineage:
      typeof r.lineage === "string"
        ? r.lineage
        : typeof r.genetics === "string"
          ? r.genetics
          : null,
    breeder: typeof r.breeder === "string" ? r.breeder : null,
    description: typeof r.description === "string" ? r.description : null,
    imageUrl: extractReferenceImageUrls(r)[0] ?? null,
    source: "budprofiles",
    sourceUrl:
      typeof r.url === "string"
        ? r.url
        : `https://budprofiles.com/strains/${slug}`,
    raw: r,
  };
}

async function fetchCandidate(path: string): Promise<NormalizedExternalStrain[]> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "StrainSpotter/0.1 external strain metadata",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];
  const payload = await res.json();
  return pickArray(payload)
    .map(normalizeBudProfile)
    .filter((item): item is NormalizedExternalStrain => Boolean(item));
}

export const budProfilesProvider: StrainDataProvider = {
  id: "budprofiles",
  status(): ProviderStatus {
    return "enabled";
  },
  async searchStrains(query: string, limit = 10) {
    const q = encodeURIComponent(query);
    const paths = [
      `/strains?search=${q}`,
      `/strains?query=${q}`,
      `/search/strains?q=${q}`,
      `/strains/search?q=${q}`,
    ];

    for (const path of paths) {
      const results = await fetchCandidate(path);
      if (results.length) return results.slice(0, limit);
    }
    return [];
  },
  async getStrainBySlug(slug: string) {
    const results = await fetchCandidate(`/strains/${encodeURIComponent(slug)}`);
    return results[0] ?? null;
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
