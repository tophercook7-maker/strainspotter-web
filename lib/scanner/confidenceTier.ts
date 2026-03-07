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
 * - Very High Confidence: 90–97%
 * - High Confidence: 80–89%
 * - Moderate Confidence: 65–79%
 * - Low Confidence: 55–64% (valid result)
 */
export function getConfidenceTier(confidence: number): ConfidenceTierLabel {
  // Phase 5.3.1 — Cap at 99% (never 100%), no floor (allow 0-59% for low confidence)
  const clampedConfidence = Math.max(0, Math.min(99, confidence));

  // Phase 4.3 — CONFIDENCE CALIBRATION (UPDATED TIERS)
  if (clampedConfidence >= 90) {
    return {
      tier: "very_high",
      label: "Very High Confidence",
      color: "green",
      description: "Excellent visual match with strong multi-image agreement and trait consistency",
    };
  } else if (clampedConfidence >= 80) {
    return {
      tier: "high",
      label: "High Confidence",
      color: "green",
      description: "Strong visual match with high agreement across images and traits",
    };
  } else if (clampedConfidence >= 65) {
    return {
      tier: "medium",
      label: "Moderate Confidence",
      color: "yellow",
      description: "Good visual match with some variation or limited image perspectives",
    };
  } else {
    // 0-64 (Low but valid)
    return {
      tier: "low",
      label: "Low Confidence",
      color: "orange",
      description: "Closest known match based on available visual data",
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
