// Phase 4.1.5 — IMAGE DISTINCTNESS SCORING
// lib/scanner/distinctness.ts

export function computeDistinctness(images: Array<{ hash: string }>): number {
  if (images.length < 2) return 1

  let comparisons = 0
  let similaritySum = 0

  for (let i = 0; i < images.length; i++) {
    for (let j = i + 1; j < images.length; j++) {
      comparisons++
      similaritySum += images[i].hash === images[j].hash ? 1 : 0
    }
  }

  const similarityRatio = similaritySum / comparisons
  return Math.max(0, 1 - similarityRatio)
}
