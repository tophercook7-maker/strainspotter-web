// Stub — name-first strain matching (planned, not yet implemented)
export type StrainMatch = {
  primaryMatch: { name: string; confidenceRange?: string; whyItWon?: string[] };
  alsoSimilar: Array<{ name: string; confidence?: number; whyNotPrimary: string }>;
};
export function matchStrainNameFirst(_features: unknown, _imageCount?: number): StrainMatch {
  return { primaryMatch: { name: "Unknown", confidenceRange: "0%" }, alsoSimilar: [] };
}
