// Phase 4.1.7 — UI MESSAGE (NON-BLOCKING)
// lib/scanner/scanNotes.ts

export function buildScanNote(distinctnessScore: number): string | null {
  if (distinctnessScore < 0.25) {
    return "Images were visually similar. Results emphasize consistent traits."
  }
  return null
}

// Phase 4.0.2 — SAME-PLANT AWARENESS NOTE
// Phase 4.2.0 — USER-FACING NOTE (OPTIONAL)
// Phase 5.1.5 — Updated message for transparency
export function buildSamePlantNote(samePlantLikely: boolean): string | null {
  if (samePlantLikely) {
    return "Photos appear to be the same plant. Confidence reflects limited angle diversity."
  }
  return null
}

// Phase 4.2.3 — USER NOTE (SOFT)
export function buildAngleHintNote(score: number): string | null {
  if (score < 0.85) {
    return "Additional angles (top, side, close-up) can improve identification accuracy."
  }
  return null
}

// Phase 4.2.5 — NON-BLOCKING DUPLICATE HANDLING
export function buildDistinctivenessNote(score: number): string | null {
  if (score < 0.85) {
    return "Photos appear visually similar. Different lighting or angles may improve results."
  }
  return null
}

// Phase 5.2.4 — SAME-PLANT / SAME-ANGLE DETECTION NOTE
// Shows passive note when images are similar (same plant or same angle)
export function buildSimilarImagesNote(
  hasHighSimilarity: boolean,
  hasLowAngleDiversity: boolean
): string | null {
  if (hasHighSimilarity || hasLowAngleDiversity) {
    return "These photos appear very similar. Additional angles may improve confidence."
  }
  return null
}

// Phase 5.3.4 — SAME-PLANT PENALTY NOTE (SOFT)
// Note shown when same-plant penalty is applied (confidence capped at 82%)
export function buildSamePlantPenaltyNote(
  samePlantLikely: boolean,
  hasLowAngleDiversity: boolean
): string | null {
  if (samePlantLikely || hasLowAngleDiversity) {
    return "Additional angles could improve certainty."
  }
  return null
}
