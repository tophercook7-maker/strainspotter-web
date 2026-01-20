// lib/scanner/confidenceTier.ts
// Phase 3.8 Part C — Confidence Labeling Tiers

/**
 * Phase 4.0 Part D — Confidence Tier (Enhanced)
 */
export type ConfidenceTier = "very_high" | "high" | "medium" | "low";

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
 * Phase 4.0 Part D — Determine confidence tier from confidence value
 * Phase 4.9 Step 4.9.4 — CONFIDENCE BANDING
 * 
 * Assign Name Confidence Tier:
 * - Very High (93–99%)
 * - High (85–92%)
 * - Medium (70–84%)
 * - Low (55–69%)
 * 
 * Never show 100%.
 * 
 * Rules:
 * - Very High Confidence: 93–99%
 * - High Confidence: 85–92%
 * - Medium Confidence: 70–84%
 * - Low Confidence: 55–69%
 * - Never display below 55%
 */
export function getConfidenceTier(confidence: number): ConfidenceTierLabel {
  // Phase 4.0 Part D — Ensure confidence is at least 55%, cap at 99% (never 100%)
  // Phase 4.9 Step 4.9.4 — Explicit confidence banding
  const clampedConfidence = Math.max(55, Math.min(99, confidence));

  // Phase 4.9 Step 4.9.4 — Explicit confidence banding ranges
  if (clampedConfidence >= 93 && clampedConfidence <= 99) {
    return {
      tier: "very_high",
      label: "Very High Confidence",
      color: "green",
      description: "Excellent visual match with strong multi-image agreement and trait consistency",
    };
  } else if (clampedConfidence >= 85 && clampedConfidence <= 92) {
    return {
      tier: "high",
      label: "High Confidence",
      color: "green",
      description: "Strong visual match with high agreement across images and traits",
    };
  } else if (clampedConfidence >= 70 && clampedConfidence <= 84) {
    return {
      tier: "medium",
      label: "Medium Confidence",
      color: "yellow",
      description: "Good visual match with some variation or limited image perspectives",
    };
  } else {
    // 55-69
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
