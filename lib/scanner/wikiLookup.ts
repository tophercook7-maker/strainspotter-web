// lib/scanner/wikiLookup.ts
// Phase 2.3 Part G — Wiki Lookup (Name Locked)

import type { CultivarReference } from "./cultivarLibrary";

export type WikiData = {
  summary: string;
  genetics: string;
  lineage: string[];
  history?: string;
  sources: string[];
};

/**
 * Fetch wiki data for a strain name
 * After primaryMatch.name is chosen
 */
export function fetchWiki(strainName: string, dbEntry?: CultivarReference): WikiData | null {
  // First check if we have a DB entry with wikiSummary
  if (dbEntry?.wikiSummary) {
    return {
      summary: dbEntry.wikiSummary,
      genetics: dbEntry.genetics,
      lineage: dbEntry.genetics.split(" × ").map(s => s.trim()),
      sources: dbEntry.sources || [],
    };
  }

  // Fallback: generate from known data
  if (dbEntry) {
    return {
      summary: `${dbEntry.name} is a ${dbEntry.type.toLowerCase()}-dominant cultivar known for ${dbEntry.effects.slice(0, 2).join(" and ")} effects.`,
      genetics: dbEntry.genetics,
      lineage: dbEntry.genetics.split(" × ").map(s => s.trim()),
      sources: dbEntry.sources || ["Curated Database"],
    };
  }

  return null;
}
