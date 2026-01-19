// lib/scanner/confidenceTier.ts
// Phase 3.8 Part C — Confidence Labeling Tiers

/**
 * Phase 3.8 Part C — Confidence Tier
 */
export type ConfidenceTier = "high" | "moderate" | "low";

/**
 * Phase 3.8 Part C — Confidence Tier Label
 */
export type ConfidenceTierLabel = {
  tier: ConfidenceTier;
  label: string;
  color: string;
  description: string;
};

/**
 * Phase 3.8 Part C — Determine confidence tier from confidence value
 * 
 * Rules:
 * - High Confidence: 85–95%
 * - Moderate Confidence: 70–84%
 * - Low Confidence: 55–69%
 * - Never display below 55%
 */
export function getConfidenceTier(confidence: number): ConfidenceTierLabel {
  // Phase 3.8 Part C — Ensure confidence is at least 55%
  const clampedConfidence = Math.max(55, Math.min(95, confidence));

  if (clampedConfidence >= 85) {
    return {
      tier: "high",
      label: "High Confidence",
      color: "green",
      description: "Strong visual match with high agreement across images and traits",
    };
  } else if (clampedConfidence >= 70) {
    return {
      tier: "moderate",
      label: "Moderate Confidence",
      color: "yellow",
      description: "Good visual match with some variation or limited image perspectives",
    };
  } else {
    return {
      tier: "low",
      label: "Low Confidence",
      color: "orange",
      description: "Closest known match, but significant uncertainty remains",
    };
  }
}

/**
 * Phase 3.8 Part C — Get confidence tier from confidence range
 */
export function getConfidenceTierFromRange(
  min: number,
  max: number
): ConfidenceTierLabel {
  // Use the midpoint of the range
  const midpoint = (min + max) / 2;
  return getConfidenceTier(midpoint);
}
