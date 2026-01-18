import type { ScannerResult } from "./types";

/**
 * Normalizes raw scanner inference into a stable result shape.
 * This is intentionally conservative and future-proof.
 */
export function buildScannerResult(raw: any): ScannerResult {
  return {
    strainName: raw?.strainName ?? "Unknown Strain",
    confidence: typeof raw?.confidence === "number" ? raw.confidence : 0,

    closestCultivarMatch: {
      name: raw?.strainName ?? "Unknown Strain",
      confidence: typeof raw?.confidence === "number" ? raw.confidence : 0,
    },

    inferredGenetics: {
      dominance: raw?.lineage?.dominance ?? "Unknown",
      parents: raw?.lineage?.parents ?? ["Unknown", "Unknown"],
      lineageFamilies: raw?.lineage?.families ?? [],
    },

    userFacingHighlights: {
      aromaProfile: Array.isArray(raw?.aromas) ? raw.aromas : [],
      effects: Array.isArray(raw?.effects) ? raw.effects : [],
      bestFor: Array.isArray(raw?.bestFor) ? raw.bestFor : [],
      bestUseTime: raw?.bestTime ?? "Unknown",
    },
  };
}
