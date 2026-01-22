// lib/scanner/confidenceCaps.ts
// Phase 4.0.7 — diversity-based confidence modulation

export function applyDiversityConfidenceCap(
  confidence: number,
  diversityScore: number
) {
  if (diversityScore >= 0.8) return confidence
  if (diversityScore >= 0.6) return Math.min(confidence, 90)
  if (diversityScore >= 0.4) return Math.min(confidence, 82)
  return Math.min(confidence, 72)
}
