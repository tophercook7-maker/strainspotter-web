// CONFIDENCE CALIBRATION (REALISTIC)
// lib/scanner/resolveFinalConfidenceV1.ts

/**
 * CONFIDENCE CALIBRATION V1 — Final Confidence Result
 * 
 * Confidence feels earned, not fake.
 * No 99% unless truly earned.
 * Confidence stable between runs.
 */
export type FinalConfidenceResultV1 = {
  confidence: number; // 0–100 (never 100)
  tier: "Very High" | "High" | "Medium" | "Low";
  explanation: string; // Short explanation
  raw: number; // Raw confidence before caps/penalties
  cap: number; // Hard cap applied
  penalties: number; // Total penalties applied
};

/**
 * CONFIDENCE CALIBRATION V1 — Resolve Final Confidence
 * 
 * INPUT WEIGHTS:
 * - DB match: 40%
 * - Image agreement: 30%
 * - Name pipeline: 20%
 * - Visual clarity: 10%
 * 
 * CAPS:
 * - 1 image → max 82%
 * - 2 images → max 90%
 * - 3–5 images → max 97%
 * 
 * PENALTIES:
 * - Similar images → -8%
 * - Fallback name → cap 80%
 * - Weak DB match → cap 85%
 */
export function resolveFinalConfidenceV1(args: {
  imageCount: number; // 1–5
  databaseMatchStrength: number; // 0–1 (normalized)
  imageAgreementScore: number; // 0–1 (normalized) - how well images agree
  namePipelineConfidence: number; // 0–1 (normalized) - from name pipeline
  visualClarityScore: number; // 0–1 (normalized) - visual distinctness/clarity
  hasSimilarImages: boolean; // Images appear similar/same-angle
  hasFallbackName: boolean; // Name is "Closest Known Cultivar" or fallback
  hasWeakDatabaseMatch: boolean; // Database match is weak or uncertain
  previousConfidence?: number; // For stability rule (same image set)
}): FinalConfidenceResultV1 {
  const {
    imageCount,
    databaseMatchStrength,
    imageAgreementScore,
    namePipelineConfidence,
    visualClarityScore,
    hasSimilarImages,
    hasFallbackName,
    hasWeakDatabaseMatch,
    previousConfidence,
  } = args;

  // Safety: Never throw — fallback to 65 / Medium
  try {
    // Normalize inputs to 0..1
    const normDb = Math.max(0, Math.min(1, databaseMatchStrength || 0));
    const normImageAgreement = Math.max(0, Math.min(1, imageAgreementScore || 0));
    const normNamePipeline = Math.max(0, Math.min(1, namePipelineConfidence || 0));
    const normVisual = Math.max(0, Math.min(1, visualClarityScore || 0));

    // INPUT WEIGHTS
    // DB match: 40%
    const dbComponent = normDb * 0.40 * 100;
    // Image agreement: 30%
    const imageAgreementComponent = normImageAgreement * 0.30 * 100;
    // Name pipeline: 20%
    const namePipelineComponent = normNamePipeline * 0.20 * 100;
    // Visual clarity: 10%
    const visualComponent = normVisual * 0.10 * 100;

    // Raw confidence (weighted sum)
    let rawConfidence = dbComponent + imageAgreementComponent + namePipelineComponent + visualComponent;

    // PENALTIES
    let penalties = 0;

    // Similar images → -8%
    if (hasSimilarImages) {
      penalties += 8;
    }

    // Apply penalties
    rawConfidence = rawConfidence - penalties;

    // CAPS (apply after penalties)
    let cap: number;
    if (imageCount === 1) {
      cap = 82;
    } else if (imageCount === 2) {
      cap = 90;
    } else if (imageCount >= 3 && imageCount <= 5) {
      cap = 97;
    } else {
      cap = 97; // 6+ images (same as 3-5)
    }

    // Apply cap
    rawConfidence = Math.min(rawConfidence, cap);

    // SPECIAL CAPS (apply after general cap)
    // Fallback name → cap 80%
    if (hasFallbackName) {
      rawConfidence = Math.min(rawConfidence, 80);
      cap = Math.min(cap, 80); // Update cap for explanation
    }

    // Weak DB match → cap 85%
    if (hasWeakDatabaseMatch) {
      rawConfidence = Math.min(rawConfidence, 85);
      cap = Math.min(cap, 85); // Update cap for explanation
    }

    // Never return 100
    rawConfidence = Math.min(rawConfidence, 99);

    // STABILITY RULE — No jumps > 12% between runs
    if (previousConfidence !== undefined) {
      const delta = rawConfidence - previousConfidence;
      if (Math.abs(delta) > 12) {
        // Clamp to ±12% max
        rawConfidence = previousConfidence + (Math.sign(delta) * 12);
      }
    }

    // Safety floor
    rawConfidence = Math.max(55, rawConfidence);

    // Round to integer
    let finalConfidence = Math.round(rawConfidence);

    // Determine tier
    let tier: "Very High" | "High" | "Medium" | "Low";
    if (finalConfidence >= 90) {
      tier = "Very High";
    } else if (finalConfidence >= 80) {
      tier = "High";
    } else if (finalConfidence >= 70) {
      tier = "Medium";
    } else {
      tier = "Low";
    }

    // Generate explanation
    let explanation: string;
    if (tier === "Very High") {
      explanation = "High confidence based on strong database match and image agreement";
    } else if (tier === "High") {
      explanation = "Good confidence from database match and consistent image analysis";
    } else if (tier === "Medium") {
      explanation = "Moderate confidence — results may vary with additional images";
    } else {
      explanation = "Lower confidence due to limited data or image similarity";
    }

    // Add penalty notes if applicable
    if (hasSimilarImages) {
      explanation += ". Similar images reduced confidence";
    }
    if (hasFallbackName) {
      explanation += ". Fallback name limits confidence";
    }
    if (hasWeakDatabaseMatch) {
      explanation += ". Weak database match limits confidence";
    }

    return {
      confidence: finalConfidence,
      tier,
      explanation,
      raw: Math.round(dbComponent + imageAgreementComponent + namePipelineComponent + visualComponent),
      cap,
      penalties,
    };
  } catch (error) {
    // Fallback to safe defaults
    console.warn("CONFIDENCE CALIBRATION V1: Error, using fallback:", error);
    return {
      confidence: 65,
      tier: "Medium",
      explanation: "Confidence calculated with limited data",
      raw: 65,
      cap: 82,
      penalties: 0,
    };
  }
}
