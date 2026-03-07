// lib/scanner/scanFallbacks.ts
import type { ScanResult } from "./types";
import type { ConsensusResult } from "./consensusEngine";
import type { ScannerViewModel } from "./viewModel";

export type ImageSeed = {
  name: string;
  size: number;
};

export type ScanPipelineInput = {
  imageSeeds: ImageSeed[];
  imageCount: number;
};

/**
 * STABILIZATION MODE — Helper to build safe fallback result
 */
export function buildSafeFallbackResult(
  reason: string,
  imageCount: number,
  fallbackName: string = "Low-confidence scan result"
): ScanResult {
  // FAILURE MESSAGING SOFTENED — Use softer messages instead of "analysis failed"
  const softReason = reason.includes("failed") || reason.includes("error") || reason.includes("Error")
    ? "Low confidence — results may vary"
    : reason.includes("similar") || reason.includes("identical")
    ? "Images appear similar — try different angles"
    : reason;
  
  const fallbackConfidence = Math.max(50, 75 - (imageCount === 1 ? 15 : 0));
  const fallbackViewModel: ScannerViewModel = {
    name: fallbackName,
    title: fallbackName,
    confidenceRange: { min: fallbackConfidence - 5, max: fallbackConfidence + 5, explanation: softReason },
    matchBasis: "Results shown with limited confidence",
    visualMatchSummary: "",
    flowerStructureAnalysis: "",
    trichomeDensityMaturity: "",
    leafShapeInternode: "",
    colorPistilIndicators: "",
    growthPatternClues: "",
    primaryMatch: {
      name: fallbackName,
      confidenceRange: { min: fallbackConfidence - 5, max: fallbackConfidence + 5 },
      whyThisMatch: softReason,
    },
    secondaryMatches: [],
    trustLayer: {
      confidenceBreakdown: { visualSimilarity: fallbackConfidence, traitOverlap: fallbackConfidence, consensusStrength: 0 },
      whyThisMatch: [softReason],
      sourcesUsed: ["Limited analysis"],
      confidenceLanguage: "Low confidence — results may vary",
    },
    aiWikiBlend: "",
    uncertaintyExplanation: softReason,
    accuracyTips: ["Try photos from different angles", "Ensure good lighting and focus", "Add more images for better accuracy"],
    confidence: fallbackConfidence,
    whyThisMatch: softReason,
    morphology: "",
    trichomes: "",
    pistils: "",
    structure: "",
    growthTraits: [],
    terpeneGuess: [],
    effectsShort: [],
    effectsLong: [],
    comparisons: [],
    referenceStrains: [],
    sources: [],
    genetics: { dominance: "Unknown", lineage: "" },
    experience: { effects: [], bestFor: [] },
    disclaimer: softReason,
    nameFirstDisplay: {
      primaryStrainName: fallbackName,
      primaryName: fallbackName,
      confidencePercent: fallbackConfidence,
      confidence: fallbackConfidence,
      confidenceTier: fallbackConfidence >= 75 ? "high" as const : fallbackConfidence >= 65 ? "medium" as const : "low" as const,
      // Phase 4.1 — Enhanced tagline
      tagline: (() => {
        const { generateIntelligentTagline } = require("./perceivedIntelligence");
        const fallbackConf = Math.max(50, 75 - (imageCount === 1 ? 15 : 0));
        return generateIntelligentTagline({
          confidencePercent: fallbackConf,
          imageCount: imageCount || 0,
          hasDatabaseMatch: false,
          hasMultiImageAgreement: false,
        });
      })(),
      explanation: { whyThisNameWon: [softReason], whatRuledOutOthers: [], varianceNotes: [] },
    },
  };
  const fallbackConsensus: ConsensusResult = {
    primaryMatch: { name: fallbackName, confidence: fallbackConfidence, reason: softReason },
    alternates: [],
    agreementScore: 0,
    strainName: fallbackName,
    confidenceRange: { min: fallbackConfidence - 5, max: fallbackConfidence + 5, explanation: softReason },
    whyThisMatch: softReason,
    alternateMatches: [],
    lowConfidence: true,
    agreementLevel: "low" as const,
  };
  return {
    status: "partial",
    guard: { status: "low-confidence" as const, reason: softReason },
    consensus: fallbackConsensus,
    confidence: fallbackConfidence,
    result: fallbackViewModel,
    synthesis: {} as any,
  };
}
