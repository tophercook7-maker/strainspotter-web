// Phase B.2 — CONFIDENCE CALIBRATION
// lib/scanner/confidenceCalibrationB2.ts

// Rules:
// - Single image max confidence ≤ 85%
// - Multiple images raise confidence gradually
// - Never output 100%
// - If name confidence < 60%, label as "Closest Known Cultivar"
// - Confidence must reflect uncertainty
// - No inflation

import type { NameFirstMatchingResult } from "./nameFirstMatchingEngine";

/**
 * Phase B.2 — Confidence Calibration Result
 */
export type ConfidenceCalibrationB2Result = {
  confidence: number; // 0-99 (never 100)
  tier: "Very High" | "High" | "Medium" | "Low";
  explanation: string[]; // Why confidence is what it is
  shouldUseFallbackName: boolean; // If true, use "Closest Known Cultivar"
};

/**
 * Phase B.2 — Confidence Calibration
 * 
 * Rules:
 * - Single image max confidence ≤ 85%
 * - Multiple images raise confidence gradually
 * - Never output 100%
 * - If name confidence < 60%, label as "Closest Known Cultivar"
 * - Confidence must reflect uncertainty
 * - No inflation
 */
export function calibrateConfidenceB2(args: {
  imageCount: number; // 1-5
  nameMatchingResult: NameFirstMatchingResult | null; // Phase B.1 result
  nameConfidence?: number; // 0-100 (from Phase B.1 or other sources)
  imageAgreementScore?: number; // 0-1 (how well images agree)
  databaseMatchStrength?: number; // 0-1 (database match quality)
  hasSimilarImages?: boolean; // Images appear similar/same-angle
}): ConfidenceCalibrationB2Result {
  const {
    imageCount,
    nameMatchingResult,
    nameConfidence,
    imageAgreementScore = 0.5,
    databaseMatchStrength = 0.5,
    hasSimilarImages = false,
  } = args;

  // Safety: Never throw — fallback to safe defaults
  try {
    // Start with name confidence from Phase B.1 if available
    let baseConfidence = nameConfidence ?? nameMatchingResult?.confidence ?? 70;
    
    // Normalize to 0-100
    baseConfidence = Math.max(0, Math.min(100, baseConfidence));
    
    const explanation: string[] = [];
    
    // RULE 1: Single image max confidence ≤ 85%
    let imageCountCap: number;
    if (imageCount === 1) {
      imageCountCap = 85;
      explanation.push("Single image analysis — confidence capped at 85%");
    } else if (imageCount === 2) {
      // 2 images: gradual raise, max 90%
      imageCountCap = 90;
      explanation.push("Two images provide additional validation");
    } else if (imageCount === 3) {
      // 3 images: gradual raise, max 94%
      imageCountCap = 94;
      explanation.push("Multiple images strengthen confidence");
    } else if (imageCount >= 4) {
      // 4+ images: gradual raise, max 98%
      imageCountCap = 98;
      explanation.push("Multiple images provide strong validation");
    } else {
      imageCountCap = 85; // Fallback
    }
    
    // RULE 2: Multiple images raise confidence gradually
    // Base confidence starts from name confidence
    // Add gradual bonuses for multiple images
    let adjustedConfidence = baseConfidence;
    
    if (imageCount >= 2) {
      // 2 images: +3-5% if they agree
      const agreementBonus = imageAgreementScore >= 0.7 ? 5 : 3;
      adjustedConfidence += agreementBonus;
      if (imageAgreementScore >= 0.7) {
        explanation.push("Images show strong agreement");
      }
    }
    
    if (imageCount >= 3) {
      // 3 images: additional +2-4% if they agree
      const agreementBonus = imageAgreementScore >= 0.75 ? 4 : 2;
      adjustedConfidence += agreementBonus;
      if (imageAgreementScore >= 0.75) {
        explanation.push("Multiple images consistently identify the same strain");
      }
    }
    
    if (imageCount >= 4) {
      // 4+ images: additional +1-3% if they agree
      const agreementBonus = imageAgreementScore >= 0.8 ? 3 : 1;
      adjustedConfidence += agreementBonus;
    }
    
    // Database match strength bonus (gradual)
    if (databaseMatchStrength >= 0.8) {
      adjustedConfidence += 3;
      explanation.push("Strong database match supports identification");
    } else if (databaseMatchStrength >= 0.6) {
      adjustedConfidence += 1;
    }
    
    // Penalty for similar images (reduces confidence)
    if (hasSimilarImages && imageCount > 1) {
      adjustedConfidence -= 5;
      explanation.push("Similar images reduce confidence — try different angles");
    }
    
    // Apply image count cap
    adjustedConfidence = Math.min(adjustedConfidence, imageCountCap);
    
    // RULE 3: Never output 100%
    adjustedConfidence = Math.min(adjustedConfidence, 99);
    
    // Safety floor (never below 50% for valid scans)
    adjustedConfidence = Math.max(50, adjustedConfidence);
    
    // Round to integer
    let finalConfidence = Math.round(adjustedConfidence);
    
    // RULE 4: If name confidence < 60%, label as "Closest Known Cultivar"
    const shouldUseFallbackName = finalConfidence < 60;
    if (shouldUseFallbackName) {
      explanation.push("Low confidence — using 'Closest Known Cultivar' label");
    }
    
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
    
    // Add uncertainty reflection
    if (finalConfidence < 70) {
      explanation.push("Confidence reflects uncertainty in identification");
    }
    
    // Ensure explanation is not empty
    if (explanation.length === 0) {
      explanation.push("Confidence based on available analysis");
    }
    
    return {
      confidence: finalConfidence,
      tier,
      explanation,
      shouldUseFallbackName,
    };
  } catch (error) {
    // Fallback to safe defaults
    console.warn("Phase B.2 — Confidence calibration error, using fallback:", error);
    return {
      confidence: 65,
      tier: "Medium",
      explanation: ["Confidence calculated with limited data"],
      shouldUseFallbackName: false,
    };
  }
}
