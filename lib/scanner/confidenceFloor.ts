// Phase 4.1.6 — CONFIDENCE FLOOR FOR LOW DISTINCTNESS
// lib/scanner/confidenceFloor.ts

export function applyConfidenceFloor(input: {
  confidence: number
  distinctnessScore: number
}): number {
  if (input.distinctnessScore < 0.25) {
    return Math.max(input.confidence, 68)
  }
  return input.confidence
}
