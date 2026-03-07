// Phase 4.1.0 — NAME-FIRST MATCHING BOOST
// lib/scanner/nameBoost.ts

export function applyNameConsensusBoost(input: {
  candidateCounts: Record<string, number>
  baseConfidence: number
}): number {
  const maxVotes = Math.max(...Object.values(input.candidateCounts))
  if (maxVotes >= 2) return Math.min(99, input.baseConfidence + 7)
  return input.baseConfidence
}
