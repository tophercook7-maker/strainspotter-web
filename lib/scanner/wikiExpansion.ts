// lib/scanner/wikiExpansion.ts
// Phase 3.9 — Deep Wiki Expansion Helper Functions

import type { ExtendedStrainProfile } from "./extendedProfile";
import type { CultivarReference } from "./cultivarLibrary";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 3.9 Part G — Find closely related strains
 */
export function findRelatedStrains(
  strainName: string,
  strainFamily?: string,
  dbEntry?: CultivarReference
): Array<{
  name: string;
  relationship: string;
  reason: string;
}> {
  const related: Array<{ name: string; relationship: string; reason: string }> = [];

  // Find strains in same family
  if (strainFamily) {
    const familyMatches = CULTIVAR_LIBRARY.filter(s => {
      const name = s.name.toLowerCase();
      const genetics = s.genetics?.toLowerCase() || "";
      return (
        (name.includes(strainFamily.toLowerCase()) ||
          genetics.includes(strainFamily.toLowerCase())) &&
        s.name !== strainName
      );
    });

    familyMatches.slice(0, 3).forEach(s => {
      related.push({
        name: s.name,
        relationship: "Same Family",
        reason: `Both belong to the ${strainFamily} lineage`,
      });
    });
  }

  // Find strains with similar genetics
  if (dbEntry?.genetics) {
    const parentMatches = CULTIVAR_LIBRARY.filter(s => {
      if (s.name === strainName) return false;
      const genetics = s.genetics?.toLowerCase() || "";
      const parents = extractParents(dbEntry.genetics);
      return parents.some(p => genetics.includes(p.toLowerCase()));
    });

    parentMatches.slice(0, 2).forEach(s => {
      related.push({
        name: s.name,
        relationship: "Shared Genetics",
        reason: "Shares common parent strain",
      });
    });
  }

  // Find strains with similar type/dominance
  if (dbEntry?.type || dbEntry?.dominantType) {
    const type = dbEntry.type || dbEntry.dominantType;
    const typeMatches = CULTIVAR_LIBRARY.filter(
      s =>
        (s.type === type || s.dominantType === type) &&
        s.name !== strainName &&
        !related.some(r => r.name === s.name)
    );

    typeMatches.slice(0, 2).forEach(s => {
      related.push({
        name: s.name,
        relationship: "Similar Type",
        reason: `Both are ${type.toLowerCase()}-dominant`,
      });
    });
  }

  return related.slice(0, 5);
}

/**
 * Extract parent strain names from genetics string
 */
function extractParents(genetics: string): string[] {
  const parents: string[] = [];
  const patterns = [
    /([^×x/]+)\s*[×x/]\s*([^×x/]+)/gi,
    /([^×x/]+)\s+and\s+([^×x/]+)/gi,
  ];

  for (const pattern of patterns) {
    const match = genetics.match(pattern);
    if (match) {
      match.forEach(m => {
        const parts = m.split(/[×x/]/).map(p => p.trim());
        parents.push(...parts);
      });
    }
  }

  return parents
    .map(p => p.trim())
    .filter(p => p.length > 0 && !p.toLowerCase().includes("unknown"));
}

/**
 * Phase 3.9 Part A — Generate origin story
 */
export function generateOriginStory(
  strainName: string,
  dbEntry?: CultivarReference,
  wikiData?: { summary?: string }
): string {
  if (wikiData?.summary) {
    // Extract origin information from summary if available
    const summary = wikiData.summary;
    if (summary.toLowerCase().includes("origin")) {
      return summary;
    }
  }

  if (dbEntry?.wikiSummary) {
    return dbEntry.wikiSummary;
  }

  // Fallback: Generate basic origin story
  return `${strainName} is a well-known cultivar in the cannabis community. While specific origin details may vary, this strain has established itself as a reliable option for many consumers.`;
}

/**
 * Phase 3.9 Part B — Generate family tree text
 */
export function generateFamilyTree(
  lineage: string,
  dbEntry?: CultivarReference
): string {
  if (!lineage || lineage === "Unknown") {
    return "Genetic lineage information is not available for this cultivar. Lineage tracking requires documented breeding records.";
  }

  const parents = extractParents(lineage);
  if (parents.length === 0) {
    return lineage;
  }

  if (parents.length === 2) {
    return `${parents[0]} × ${parents[1]}. This cross combines the characteristics of both parent strains, creating a unique hybrid cultivar.`;
  }

  return lineage;
}

/**
 * Phase 3.9 Part D — Generate entourage effect explanation
 */
export function generateEntourageExplanation(
  primaryTerpenes: string[],
  thcRange?: string
): string {
  if (primaryTerpenes.length === 0) {
    return "The entourage effect refers to how cannabinoids and terpenes work together to create unique effects beyond what any single compound can produce alone.";
  }

  const terpeneCount = primaryTerpenes.length;
  return `The entourage effect suggests that ${primaryTerpenes.slice(0, 2).join(" and ")}${terpeneCount > 2 ? ` (along with other terpenes)` : ""} interact with ${thcRange || "cannabinoids"} to produce effects that differ from THC alone. Each terpene contributes its own characteristics—from aroma to potential therapeutic properties—creating a complex, synergistic experience unique to this cultivar.`;
}
