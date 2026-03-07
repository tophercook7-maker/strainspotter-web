// lib/scanner/imageSimilarity.ts
// Phase 4.0.3 — Duplicate / Near-Duplicate Image Detection
// Phase 4.0.7 — Image Similarity Detection

export function imageFingerprint(base64: string): number {
  let hash = 0
  for (let i = 0; i < base64.length; i += 97) {
    hash = (hash << 5) - hash + base64.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function similarityScore(a: number, b: number): number {
  const diff = Math.abs(a - b)
  return 1 - Math.min(diff / 10_000_000, 1)
}

// Phase 4.0.7 — Compute image similarity from hash strings
export function computeImageSimilarity(hashes: string[]): number {
  if (hashes.length < 2) return 0
  let matches = 0
  let comparisons = 0

  for (let i = 0; i < hashes.length; i++) {
    for (let j = i + 1; j < hashes.length; j++) {
      comparisons++
      if (hashes[i] === hashes[j]) matches++
    }
  }

  return matches / comparisons
}
