// lib/scanner/similarityGuard.ts
// Phase 4.0.6 — prevent hard failure on similar images

export function normalizeSimilarityFailure(
  diversityScore: number,
  confidence: number
) {
  if (diversityScore < 0.6) {
    return {
      confidenceCap: Math.min(confidence, 72),
      warning:
        "Results limited due to similar images. Accuracy improves with different angles.",
    }
  }

  return {
    confidenceCap: confidence,
    warning: null,
  }
}
