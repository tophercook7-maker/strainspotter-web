// Stub — image quality scoring (planned, not yet implemented)
export type ImageQualityScores = {
  overall: number;
  focus: number;
  lighting: number;
  framing: number;
  issues: string[];
};
export type ImageQualityScore = { score: number; reasons: string[] };
export function scoreImageQuality(_imageData: unknown): ImageQualityScore { return { score: 0.8, reasons: [] }; }
