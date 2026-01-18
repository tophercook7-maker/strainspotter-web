import type { WikiResult } from "./types";

export type ScannerViewModel = {
  title: string;
  confidence: number;
  summary: string;

  highlights: {
    dominance: string;
    aromas: string[];
    effects: string[];
    bestFor: string[];
  };

  genetics: {
    parents?: string[];
    family?: string;
  };

  chemistry?: {
    terpenes?: string[];
    cannabinoids?: string[];
  };
};

export function adaptWikiToScannerView(
  wiki: WikiResult
): ScannerViewModel {
  return {
    title: wiki.identity.strainName,
    confidence: wiki.identity.confidence ?? 0.75,

    summary:
      "This cultivar shows characteristics consistent with its genetic lineage.",

    highlights: {
      dominance: wiki.genetics?.dominance ?? "Unknown",
      aromas: [], // Not in current WikiResult structure
      effects: wiki.experience?.effects ?? [],
      bestFor: wiki.experience?.bestUse ?? [],
    },

    genetics: {
      parents: wiki.genetics?.lineage,
      family: undefined, // Not in current WikiResult structure
    },

    chemistry: {
      terpenes: wiki.chemistry?.terpenes.map((t) => t.name),
      cannabinoids: wiki.chemistry
        ? [
            `THC: ${wiki.chemistry.cannabinoids.THC}`,
            `CBD: ${wiki.chemistry.cannabinoids.CBD}`,
          ]
        : undefined,
    },
  };
}
