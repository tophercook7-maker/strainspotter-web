// Phase 4.0.8 — SOFT FAIL → GUIDED RECOVERY
// lib/scanner/analysisGuards.ts

export type AnalysisGuardResult =
  | { status: "ok" }
  | { status: "low-diversity"; reason: string }
  | { status: "low-confidence"; reason: string }

export function evaluateAnalysisGuards(input: {
  diversityScore: number
  imageCount: number
  consensusConfidence: number
}): AnalysisGuardResult {
  if (input.imageCount < 2) {
    return {
      status: "low-diversity",
      reason: "Only one image detected. Multiple angles improve accuracy.",
    }
  }

  if (input.diversityScore < 0.45) {
    return {
      status: "low-diversity",
      reason:
        "Images appear too similar. Try a top view and a side or close-up.",
    }
  }

  if (input.consensusConfidence < 65) {
    return {
      status: "low-confidence",
      reason:
        "Plant traits are ambiguous. This may be an uncommon phenotype.",
    }
  }

  return { status: "ok" }
}
