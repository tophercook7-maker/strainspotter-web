// Phase 4.1.8 — SAME-PLANT IMAGE DETECTION (SOFT)
// lib/scanner/samePlantDetector.ts

export function detectSamePlant(images: Array<{ hash: string }>): boolean {
  if (images.length < 2) return true

  const unique = new Set(images.map(i => i.hash))
  return unique.size <= Math.ceil(images.length / 2)
}
