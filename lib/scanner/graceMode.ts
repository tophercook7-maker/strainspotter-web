// Phase 4.1.2 — SAME-PLANT GRACE MODE
// lib/scanner/graceMode.ts

export function applySamePlantGrace(input: {
  distinctnessScore: number
  confidence: number
}): {
  adjustedConfidence: number
  note?: string
} {
  if (input.distinctnessScore < 0.18) {
    return {
      adjustedConfidence: Math.max(72, input.confidence),
      note: "Images appear to be of the same plant. Confidence preserved using visual consistency.",
    }
  }

  return { adjustedConfidence: input.confidence }
}
