// lib/scanner/similarityGuard.ts
// Phase 4.0.5 — Similar-Image Tolerance & Retry Guard
// Phase 4.0.6 — prevent hard failure on similar images

// Phase 4.0.5 — Check if images are too similar based on base64 length variance
export function imagesTooSimilar(seeds: string[]): boolean {
  if (seeds.length < 2) return false

  const lengths = seeds.map(s => s.length)
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length

  const variance =
    lengths.reduce((sum, l) => sum + Math.abs(l - avg), 0) / lengths.length

  return variance < 150
}

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
