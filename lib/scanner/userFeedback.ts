// Phase 4.1.4 — USER-FACING FEEDBACK MESSAGE
// lib/scanner/userFeedback.ts

export function buildUserFeedback(input: {
  distinctnessScore: number
  usedGraceMode: boolean
}): string {
  if (input.usedGraceMode) {
    return "Multiple images appeared visually similar. Results are based on consistent features across images."
  }
  return "Analysis completed using multiple visual perspectives."
}
