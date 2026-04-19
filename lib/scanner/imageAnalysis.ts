// Stub — image analysis (planned, not yet implemented)
import type { ImageResult } from "./consensusEngine";
export type ImageAnalysisResult = ImageResult;
export async function analyzeImage(_imageData: unknown, _idx?: number, _total?: number): Promise<ImageResult> {
  return {
    imageIndex: _idx ?? 0,
    candidateStrains: [],
    detectedTraits: {},
    uncertaintySignals: [],
    wikiResult: {
      identity: { strainName: "Unknown", confidence: 0 },
      genetics: { dominance: "Unknown", lineage: [], breederNotes: "" },
      morphology: { budStructure: "", coloration: "", trichomes: "" },
      chemistry: { terpenes: [], cannabinoids: { THC: "Unknown", CBD: "Unknown" } },
      experience: { effects: [], onset: "", duration: "", bestUse: [] },
      cultivation: { difficulty: "", floweringTime: "", yield: "", notes: "" },
      disclaimer: "",
    },
  };
}
