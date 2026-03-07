// Phase 4.2.6 — IMAGE GUIDANCE HINTS (NON-BLOCKING)
// lib/scanner/imageGuidance.ts

export type ImageGuidanceHint =
  | "TRY_DIFFERENT_ANGLE"
  | "TRY_DIFFERENT_DISTANCE"
  | "TRY_DIFFERENT_LIGHTING"

export function deriveImageGuidance(
  distinctivenessScore: number
): ImageGuidanceHint[] {
  if (distinctivenessScore >= 0.9) return []

  const hints: ImageGuidanceHint[] = []

  if (distinctivenessScore < 0.85) {
    hints.push("TRY_DIFFERENT_ANGLE")
  }
  if (distinctivenessScore < 0.8) {
    hints.push("TRY_DIFFERENT_DISTANCE")
  }
  if (distinctivenessScore < 0.75) {
    hints.push("TRY_DIFFERENT_LIGHTING")
  }

  return hints
}
