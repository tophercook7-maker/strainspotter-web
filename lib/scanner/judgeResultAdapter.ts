// STEP J7 — Adapt judge API response to ScanResult for scanner UI

import type { ScanResult } from "./types";
import type { ScannerViewModel } from "./viewModel";
import type { ConsensusResult } from "./consensusEngine";
import type { JudgeResponse } from "./runJudge";

/**
 * Build a ScanResult from the judge API response so the existing ResultPanel/WikiStyleResultPanel can display it.
 */
/** Placeholder/generic phrases that indicate no real cultivar match. */
const WEAK_NAMES = new Set([
  "closest known cultivar",
  "closest cultivar",
  "closest known strain",
  "unknown",
  "unknown cultivar",
  "unverified cultivar (visual match only)",
]);

function isWeakCultivarName(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") return true;
  const lower = name.toLowerCase().trim();
  return WEAK_NAMES.has(lower) || lower.length < 3;
}

export function judgeResultToScanResult(
  judge: JudgeResponse & { noRealMatch?: boolean; userMessage?: string },
  imageCount: number
): ScanResult {
  const hasNoRealMatch = judge.noRealMatch || !judge.best;
  const rawStrainName = judge.best?.strain_name;
  const isPlaceholder = hasNoRealMatch || isWeakCultivarName(rawStrainName);
  const strainName = isPlaceholder
    ? "Low-confidence scan result"
    : (rawStrainName ?? "Low-confidence scan result");
  const confidencePercent = judge.best
    ? Math.round(judge.best.similarity * 100)
    : 50;
  const userMessage =
    (judge as { userMessage?: string }).userMessage ??
    "We could not confidently identify a known cultivar from this scan.";
  const description = judge.description ?? "No description.";
  const guidance = isPlaceholder ? userMessage : (judge.guidance ?? "Try a sharper, front-on photo of the label.");
  const askForBetterPics = judge.askForBetterPics ?? true;

  const confidenceTier: "very_high" | "high" | "medium" | "low" =
    confidencePercent >= 85 ? "very_high" : confidencePercent >= 65 ? "high" : confidencePercent >= 50 ? "medium" : "low";

  const result: ScannerViewModel = {
    name: strainName,
    title: strainName,
    confidenceRange: {
      min: Math.max(0, confidencePercent - 5),
      max: Math.min(100, confidencePercent + 5),
      explanation: description,
    },
    matchBasis: description,
    visualMatchSummary: description,
    flowerStructureAnalysis: "",
    trichomeDensityMaturity: "",
    leafShapeInternode: "",
    colorPistilIndicators: "",
    growthPatternClues: "",
    primaryMatch: {
      name: strainName,
      confidenceRange: {
        min: Math.max(0, confidencePercent - 5),
        max: Math.min(100, confidencePercent + 5),
      },
      whyThisMatch: description,
    },
    secondaryMatches: (judge.candidates ?? [])
      .filter((c) => c.strain_id !== judge.best?.strain_id)
      .slice(0, 5)
      .map((c) => ({
        name: c.strain_name,
        whyNotPrimary: `Similarity ${(c.similarity * 100).toFixed(0)}%`,
      })),
    trustLayer: {
      confidenceBreakdown: {
        visualSimilarity: confidencePercent,
        traitOverlap: confidencePercent,
        consensusStrength: confidencePercent,
      },
      whyThisMatch: [description],
      sourcesUsed: ["Vault image match"],
      confidenceLanguage:
        confidencePercent >= 82 ? "High-confidence match" : "Best match shown",
    },
    aiWikiBlend: description,
    uncertaintyExplanation: askForBetterPics ? guidance : "",
    accuracyTips: askForBetterPics ? [guidance] : [],
    confidence: confidencePercent,
    whyThisMatch: description,
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
    disclaimer: guidance,
    nameFirstDisplay: {
      primaryStrainName: strainName,
      primaryName: strainName,
      confidencePercent,
      confidence: confidencePercent,
      confidenceTier,
      tagline: isPlaceholder
        ? userMessage
        : confidencePercent >= 82
          ? "High-confidence match from vault"
          : "Best match from vault — add another angle to confirm",
      explanation: {
        whyThisNameWon: isPlaceholder ? [userMessage] : [description],
        whatRuledOutOthers: [],
        varianceNotes: [],
      },
      alternateMatches: (judge.candidates ?? [])
        .filter((c) => c.strain_id !== judge.best?.strain_id)
        .slice(0, 3)
        .map((c) => ({
          name: c.strain_name,
          confidence: Math.round(c.similarity * 100),
          whyNotPrimary: `Similarity ${(c.similarity * 100).toFixed(0)}%`,
        })),
    },
  };

  const consensus: ConsensusResult = {
    primaryMatch: {
      name: strainName,
      confidence: confidencePercent,
      reason: description,
    },
    alternates: (judge.candidates ?? [])
      .filter((c) => c.strain_id !== judge.best?.strain_id)
      .slice(0, 5)
      .map((c) => ({ name: c.strain_name, confidence: Math.round(c.similarity * 100) })),
    agreementScore: confidencePercent,
    strainName,
    confidenceRange: {
      min: Math.max(0, confidencePercent - 5),
      max: Math.min(100, confidencePercent + 5),
      explanation: description,
    },
    whyThisMatch: description,
    alternateMatches: (judge.candidates ?? [])
      .filter((c) => c.strain_id !== judge.best?.strain_id)
      .slice(0, 5)
      .map((c) => ({
        name: c.strain_name,
        whyNotPrimary: `Similarity ${(c.similarity * 100).toFixed(0)}%`,
      })),
    lowConfidence: askForBetterPics,
    agreementLevel: confidencePercent >= 82 ? "high" : confidencePercent >= 65 ? "medium" : "low",
  };

  if (askForBetterPics) {
    return {
      status: "partial",
      guard: { status: "low-confidence" as const, reason: guidance },
      consensus,
      confidence: confidencePercent,
      result,
      synthesis: {} as any,
    };
  }

  return {
    status: "success",
    consensus,
    confidence: confidencePercent,
    result,
    synthesis: {} as any,
  };
}
