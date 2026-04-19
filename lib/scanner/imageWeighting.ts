// Stub — image weighting (planned, not yet implemented)
export type ImageWeight = {
  index: number;
  weight: number;
  baseWeight: number;
  finalWeight: number;
  qualityMultiplier: number;
  qualityIssues: string[];
  reason: string;
};
export function assignImageWeights(count: number): ImageWeight[] {
  const w = 1 / Math.max(count, 1);
  return Array.from({ length: count }, (_, i) => ({
    index: i, weight: w, baseWeight: w, finalWeight: w,
    qualityMultiplier: 1, qualityIssues: [], reason: "equal",
  }));
}
export function applyQualityWeights(weights: ImageWeight[], _imageResults?: unknown[]): ImageWeight[] {
  return weights;
}
