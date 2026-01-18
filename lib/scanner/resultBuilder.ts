// lib/scanner/resultBuilder.ts
import { ScannerResult } from "./types";

export function buildScannerResult(raw: any): ScannerResult {
  return {
    strainName: raw?.strainName ?? "Unknown Strain",
    confidence: typeof raw?.confidence === "number" ? raw.confidence : 0,

    closestCultivarMatch: raw?.closestCultivarMatch
      ? {
          name: raw.closestCultivarMatch.name,
          similarity: raw.closestCultivarMatch.similarity ?? 0,
        }
      : undefined,

    inferredGenetics: {
      dominance: raw?.inferredGenetics?.dominance ?? "Unknown",
      parents: raw?.inferredGenetics?.parents,
      confidence: raw?.inferredGenetics?.confidence,
    },

    userFacingHighlights: raw?.userFacingHighlights
      ? {
          aromaProfile: raw.userFacingHighlights.aromaProfile,
          effects: raw.userFacingHighlights.effects,
          bestFor: raw.userFacingHighlights.bestFor,
          bestTime: raw.userFacingHighlights.bestTime,
        }
      : undefined,

    scienceLayer: raw?.scienceLayer,
  };
}
