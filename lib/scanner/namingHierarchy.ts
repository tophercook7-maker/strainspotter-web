// Stub — strain naming hierarchy (planned, not yet implemented)
export type NamingResult = {
  name: string;
  confidenceRange: { min: number; max: number };
  rationale: string;
};
export function determineStrainName(
  _features: unknown,
  _imageCount?: number,
  candidates?: Array<{ name?: string; confidence?: number }>
): NamingResult {
  const top = candidates?.[0];
  return {
    name: (top as any)?.name ?? "Unknown",
    confidenceRange: { min: 50, max: 70 },
    rationale: "fallback",
  };
}
