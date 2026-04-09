// Stub — consensus weight adjustment (planned, not yet implemented)
export function adjustConsensusWeight(params: { baseWeight: number; samePlantLikely?: boolean }): number {
  return params.samePlantLikely ? params.baseWeight * 0.5 : params.baseWeight;
}
