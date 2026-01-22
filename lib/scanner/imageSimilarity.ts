// lib/scanner/imageSimilarity.ts
// Phase 4.0.3 — Duplicate / Near-Duplicate Image Detection

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
