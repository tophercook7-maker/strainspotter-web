// lib/data/catalog10k.ts
//
// The 10,000-strain universe (built by scripts/build-10k-catalog.mjs from the
// normalized catalog, quality-ranked). Use this for the strain LIBRARY/search,
// the retrieval candidate set, and to RESOLVE a free-text model answer to a
// known strain — so the scanner can recognize 10k strains without inlining them
// into the prompt (the prompt only ever sees the top-K retrieved candidates).

import catalog from "@/data/strains-10k.json";

export type CatalogStrain = {
  slug: string;
  name: string;
  type: string;
  lineage: string[];
  effects: string[];
  flavors: string[];
  aliases: string[];
  curated: boolean;
};

export const CATALOG_10K = catalog as CatalogStrain[];

export function slugifyName(name: string): string {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const bySlug = new Map<string, CatalogStrain>();
const byAlias = new Map<string, string>(); // alias-slug -> canonical slug
for (const s of CATALOG_10K) {
  bySlug.set(s.slug, s);
  for (const a of s.aliases ?? []) {
    const as = slugifyName(a);
    if (as && !byAlias.has(as)) byAlias.set(as, s.slug);
  }
}

/**
 * Resolve a strain name (e.g. a model's candidate) to a catalog entry.
 * Tries exact slug, then alias, then a slug without a trailing descriptor
 * (e.g. "blue-dream-auto" -> "blue-dream"). Returns null if unknown.
 */
export function resolveStrain(name: string | undefined | null): CatalogStrain | null {
  if (!name) return null;
  const slug = slugifyName(name);
  if (!slug) return null;
  if (bySlug.has(slug)) return bySlug.get(slug)!;
  if (byAlias.has(slug)) return bySlug.get(byAlias.get(slug)!) ?? null;
  // Strip common trailing qualifiers and retry once.
  const stripped = slug.replace(/-(auto|autoflower|fem|feminized|ii|2|x)$/g, "");
  if (stripped !== slug && bySlug.has(stripped)) return bySlug.get(stripped)!;
  return null;
}

export const CATALOG_10K_SIZE = CATALOG_10K.length;
