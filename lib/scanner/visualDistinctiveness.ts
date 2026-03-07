// Phase 4.2.4 — VISUAL DISTINCTIVENESS SCORING (SOFT)
// lib/scanner/visualDistinctiveness.ts

export function computeVisualDistinctiveness(
  embeddings: number[][]
): number {
  if (embeddings.length < 2) return 1.0

  let totalDistance = 0
  let comparisons = 0

  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      const a = embeddings[i]
      const b = embeddings[j]
      let dist = 0
      for (let k = 0; k < a.length; k++) {
        dist += Math.pow(a[k] - b[k], 2)
      }
      totalDistance += Math.sqrt(dist)
      comparisons++
    }
  }

  const avg = totalDistance / comparisons

  if (avg > 0.45) return 1.0
  if (avg > 0.30) return 0.92
  if (avg > 0.18) return 0.85
  return 0.75
}
