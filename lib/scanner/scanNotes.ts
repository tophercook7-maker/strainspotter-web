// Phase 4.1.7 — UI MESSAGE (NON-BLOCKING)
// lib/scanner/scanNotes.ts

export function buildScanNote(distinctnessScore: number): string | null {
  if (distinctnessScore < 0.25) {
    return "Images were visually similar. Results emphasize consistent traits."
  }
  return null
}

// Phase 4.2.0 — USER-FACING NOTE (OPTIONAL)
export function buildSamePlantNote(samePlantLikely: boolean): string | null {
  if (samePlantLikely) {
    return "Photos appear to be the same plant. Results focus on stable, shared traits."
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
