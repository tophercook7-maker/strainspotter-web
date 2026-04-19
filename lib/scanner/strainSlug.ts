import strainDb from "@/lib/data/strains.json";
import { resolveStrainSlug } from "@/lib/scanner/rankedScanPipeline";

interface StrainRow {
  name: string;
}

/** Title-case a folder slug for UI when no catalog match exists. */
export function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Prefer canonical catalog casing; fall back to hint or title-cased slug.
 */
export function displayStrainNameForSlug(
  slug: string,
  hint?: string
): string {
  const rows = strainDb as StrainRow[];
  for (const row of rows) {
    if (resolveStrainSlug(row.name) === slug) return row.name;
  }
  if (hint?.trim() && resolveStrainSlug(hint) === slug) return hint.trim();
  return titleCaseSlug(slug);
}
