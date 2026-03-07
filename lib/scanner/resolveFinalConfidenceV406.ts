// Phase 4.0.6 — CONFIDENCE CALIBRATION & USER TRUST LOCK
// lib/scanner/resolveFinalConfidenceV406.ts

/**
 * Phase 4.0.6 — Final Confidence Result
 * 
 * Makes confidence feel earned, stable, and believable.
 */
export type FinalConfidenceResult = {
  confidence: number; // 0–100
  tier: "Very High" | "High" | "Medium" | "Low";
  explanation: string[];
};

/**
 * Phase 4.0.6 — Resolve Final Confidence V406
 * 
 * Calibrates confidence ONCE using only approved sources.
 * Ties it to things users intuitively understand.
 * Locks behavior so it never feels random again.
 */
export function resolveFinalConfidenceV406(args: {
  nameConfidence: number; // 0–100
  imageCount: number;
  imageAgreementScore: number; // 0–1
  imageQualityScore: number; // 0–1
  databaseMatchStrength: number; // 0–1
}): FinalConfidenceResult {
  const {
    nameConfidence,
    imageCount,
    imageAgreementScore,
    imageQualityScore,
    databaseMatchStrength,
  } = args;

  // Safety: Never throw — fallback to 65 / Medium
  try {
    // Normalize inputs
    const normalizedNameConfidence = Math.max(0, Math.min(100, nameConfidence || 65));
    const normalizedAgreement = Math.max(0, Math.min(1, imageAgreementScore || 0.5));
    const normalizedQuality = Math.max(0, Math.min(1, imageQualityScore || 0.6));
    const normalizedDbStrength = Math.max(0, Math.min(1, databaseMatchStrength || 0.5));

    // Base confidence: Start from nameConfidence
    let confidence = normalizedNameConfidence;
    const explanation: string[] = [];

    // Adjustments
    // +5–10 if imageAgreementScore ≥ 0.75
    if (normalizedAgreement >= 0.75) {
      const boost = normalizedAgreement >= 0.9 ? 10 : 5;
      confidence += boost;
      explanation.push("High confidence due to strong visual agreement across multiple images");
    }

    // +5 if imageCount ≥ 3
    if (imageCount >= 3) {
      confidence += 5;
      explanation.push("Multiple images provide additional validation");
    }

    // -5 if imageQualityScore < 0.5
    if (normalizedQuality < 0.5) {
      confidence -= 5;
      explanation.push("Confidence reduced due to lower image quality");
    }

    // -10 if databaseMatchStrength < 0.4
    if (normalizedDbStrength < 0.4) {
      confidence -= 10;
      explanation.push("Confidence reduced due to limited database match strength");
    }

    // Clamp to 0–100
    confidence = Math.max(0, Math.min(100, confidence));

    // Determine tier BEFORE applying caps
    let tier: "Very High" | "High" | "Medium" | "Low";
    if (confidence >= 90) {
      tier = "Very High";
    } else if (confidence >= 80) {
      tier = "High";
    } else if (confidence >= 65) {
      tier = "Medium";
    } else {
      tier = "Low";
    }

    // Caps (ABSOLUTE) - Never exceed cap based on tier
    if (tier === "Very High") {
      confidence = Math.min(confidence, 95);
    } else if (tier === "High") {
      confidence = Math.min(confidence, 90);
    } else if (tier === "Medium") {
      confidence = Math.min(confidence, 80);
    } else {
      confidence = Math.min(confidence, 70);
    }

    // Re-determine tier after cap (to ensure consistency)
    if (confidence >= 90) {
      tier = "Very High";
    } else if (confidence >= 80) {
      tier = "High";
    } else if (confidence >= 65) {
      tier = "Medium";
    } else {
      tier = "Low";
    }

    // Round to integer
    confidence = Math.round(confidence);

    // Add base explanation if not already present
    if (explanation.length === 0) {
      explanation.push("Name match supported by known genetics and database references");
    }

    // Add image diversity note if relevant
    if (imageCount === 1) {
      explanation.push("Single image analysis — confidence based on visual match");
    } else if (imageCount >= 2 && normalizedAgreement < 0.6) {
      explanation.push("Confidence reduced due to limited image diversity");
    }

    return {
      confidence,
      tier,
      explanation,
    };
  } catch (error) {
    // Safety: Never throw — fallback to 65 / Medium
    console.warn("Phase 4.0.6 — Confidence calculation error, using default fallback:", error);
    return {
      confidence: 65,
      tier: "Medium",
      explanation: ["Confidence calculation encountered an error. Defaulting to medium confidence."],
    };
  }
}
