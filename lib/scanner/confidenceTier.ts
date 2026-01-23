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
 * Phase 5.3.1 — CONFIDENCE BANDS (LOCK)
 * 
 * Assign Name Confidence Tier:
 * - Very High (90–99%)
 * - High (75–89%)
 * - Moderate (60–74%)
 * - Low (0–59%)
 * 
 * Never show 100%.
 * Never imply lab certainty.
 * 
 * Rules:
 * - Very High Confidence: 90–99%
 * - High Confidence: 75–89%
 * - Moderate Confidence: 60–74%
 * - Low Confidence: 0–59%
 */
export function getConfidenceTier(confidence: number): ConfidenceTierLabel {
  // Phase 5.3.1 — Cap at 99% (never 100%), no floor (allow 0-59% for low confidence)
  const clampedConfidence = Math.max(0, Math.min(99, confidence));

  // Phase 5.3.1 — Explicit confidence banding ranges (LOCK)
  if (clampedConfidence >= 90 && clampedConfidence <= 99) {
    return {
      tier: "very_high",
      label: "Very High Confidence",
      color: "green",
      description: "Excellent visual match with strong multi-image agreement and trait consistency",
    };
  } else if (clampedConfidence >= 75 && clampedConfidence <= 89) {
    return {
      tier: "high",
      label: "High Confidence",
      color: "green",
      description: "Strong visual match with high agreement across images and traits",
    };
  } else if (clampedConfidence >= 60 && clampedConfidence <= 74) {
    return {
      tier: "medium",
      label: "Moderate Confidence",
      color: "yellow",
      description: "Good visual match with some variation or limited image perspectives",
    };
  } else {
    // 0-59
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
