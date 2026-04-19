// Stub — wiki engine (planned, not yet implemented)
// WikiEngineResult matches the WikiResult contract from types.ts
export type WikiEngineResult = {
  identity: { strainName: string; confidence: number; alternateMatches?: Array<{ strainName: string; confidence: number }> };
  genetics: { dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown"; lineage: string[]; breederNotes: string; confidenceNotes?: string };
  morphology: { budStructure: string; coloration: string; trichomes: string; visualTraits?: string[]; growthIndicators?: string[] };
  chemistry: { terpenes: Array<{ name: string; confidence: number }>; cannabinoids: { THC: string; CBD: string }; likelyTerpenes?: Array<{ name: string; confidence: number }>; cannabinoidRange?: string };
  experience: { effects: string[]; onset: string; duration: string; bestUse: string[]; primaryEffects?: string[]; secondaryEffects?: string[]; varianceNotes?: string };
  cultivation: { difficulty: string; floweringTime: string; yield: string; notes: string };
  reasoning?: { whyThisMatch: string; conflictingSignals?: string[] };
  disclaimer: string;
};

export async function runWikiEngine(_image: unknown, _imageCount?: number): Promise<WikiEngineResult> {
  return {
    identity: { strainName: "Unknown", confidence: 0 },
    genetics: { dominance: "Unknown", lineage: [], breederNotes: "" },
    morphology: { budStructure: "", coloration: "", trichomes: "" },
    chemistry: { terpenes: [], cannabinoids: { THC: "Unknown", CBD: "Unknown" } },
    experience: { effects: [], onset: "", duration: "", bestUse: [] },
    cultivation: { difficulty: "", floweringTime: "", yield: "", notes: "" },
    disclaimer: "",
  };
}

export async function queryWikiEngine(_strain: string): Promise<WikiEngineResult> {
  return runWikiEngine(_strain);
}
