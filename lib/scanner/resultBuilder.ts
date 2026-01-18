import type { ScannerResult } from "./types";

/**
 * Normalizes raw scanner inference into a stable result shape.
 * This is intentionally conservative and future-proof.
 */
export function buildScannerResult(raw: any): ScannerResult {
  return {
    strainName: raw?.strainName ?? "Unknown Strain",
    confidence: typeof raw?.confidence === "number" ? raw.confidence : 0,

    lineage: {
      parents: raw?.lineage?.parents ?? ["Unknown", "Unknown"],
      dominance: raw?.lineage?.dominance ?? "Unknown",
    },

    aromas: Array.isArray(raw?.aromas) ? raw.aromas : [],
    effects: Array.isArray(raw?.effects) ? raw.effects : [],
    bestTime: raw?.bestTime ?? "Unknown",

    // Reserved for future expansion
    genetics: raw?.genetics ?? null,
    labData: raw?.labData ?? null,
    notes: raw?.notes ?? "",
  };
}
