// Phase 4.1.9 — CONSENSUS WEIGHT ADJUSTMENT
// lib/scanner/consensusWeights.ts

export function adjustConsensusWeight(input: {
  baseWeight: number
  samePlantLikely: boolean
}): number {
  if (input.samePlantLikely) return input.baseWeight * 0.85
  return input.baseWeight
}
