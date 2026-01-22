// Phase 4.0.9 — IMAGE DISTINCTNESS SCORING
// lib/scanner/imageDistinctness.ts

export function calculateImageDistinctness(images: {
  edgeScore: number
  colorVariance: number
  shapeVariance: number
}[]): number {
  if (images.length < 2) return 0

  let total = 0
  let comparisons = 0

  for (let i = 0; i < images.length; i++) {
    for (let j = i + 1; j < images.length; j++) {
      const delta =
        Math.abs(images[i].edgeScore - images[j].edgeScore) * 0.4 +
        Math.abs(images[i].colorVariance - images[j].colorVariance) * 0.3 +
        Math.abs(images[i].shapeVariance - images[j].shapeVariance) * 0.3

      total += delta
      comparisons++
    }
  }

  return total / comparisons
}
