// lib/scanner/duplicateImageDetection.ts
// Phase 4.0.4 — detect near-duplicate images (same plant / same angle)

export function computeImageSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export function detectDuplicates(
  embeddings: number[][],
  threshold = 0.93
) {
  const duplicates = new Set<number>()

  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      const sim = computeImageSimilarity(embeddings[i], embeddings[j])
      if (sim > threshold) {
        duplicates.add(j)
      }
    }
  }

  return duplicates
}
