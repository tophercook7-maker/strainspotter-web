// Phase 4.0.1 — IMAGE DISTINCTIVENESS GUARD
// lib/scanner/imageDistinctiveness.ts

export function areImagesDistinctEnough(
  imageFingerprints: number[][],
  threshold = 0.92
): boolean {
  if (imageFingerprints.length < 2) return true

  for (let i = 0; i < imageFingerprints.length; i++) {
    for (let j = i + 1; j < imageFingerprints.length; j++) {
      const similarity = cosineSimilarity(
        imageFingerprints[i],
        imageFingerprints[j]
      )
      if (similarity > threshold) return false
    }
  }
  return true
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0))
  return dot / (magA * magB)
}
