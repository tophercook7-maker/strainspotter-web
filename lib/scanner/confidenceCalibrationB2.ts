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
 * - Base confidence from name score (Phase B.1)
 * - Single image: cap confidence at 85%
 * - Multi-image: +5% per agreeing image (max 95%)
 * - If disagreement detected: reduce confidence and add explanation note
 * - Never output 100%
 * - Never use "Guaranteed" language
 */
export function calibrateConfidenceB2(args: {
  imageCount: number; // 1-5
  nameMatchingResult: NameFirstMatchingResult | null; // Phase B.1 result
  nameConfidence?: number; // 0-100 (from Phase B.1 name score)
  imageAgreementScore?: number; // 0-1 (how well images agree on primary name)
  databaseMatchStrength?: number; // 0-1 (database match quality)
  hasSimilarImages?: boolean; // Images appear similar/same-angle
  agreeingImageCount?: number; // Number of images that agree on primary name
}): ConfidenceCalibrationB2Result {
  const {
    imageCount,
    nameMatchingResult,
    nameConfidence,
    imageAgreementScore = 0.5,
    databaseMatchStrength = 0.5,
    hasSimilarImages = false,
    agreeingImageCount,
  } = args;

  // Safety: Never throw — fallback to safe defaults
  try {
    // RULE: Base confidence from name score (Phase B.1)
    let baseConfidence = nameConfidence ?? nameMatchingResult?.confidence ?? 70;
    
    // Normalize to 0-100
    baseConfidence = Math.max(0, Math.min(100, baseConfidence));
    
    const explanation: string[] = [];
    
    // Start with base confidence from name score
    let adjustedConfidence = baseConfidence;
    
    // RULE: Single image cap at 85%
    if (imageCount === 1) {
      adjustedConfidence = Math.min(adjustedConfidence, 85);
      explanation.push("Single image analysis — confidence capped at 85%");
    } else if (imageCount >= 2) {
      // RULE: Multi-image: +5% per agreeing image (max 95%)
      // Calculate agreeing image count
      const agreeingCount = agreeingImageCount ?? Math.round(imageAgreementScore * imageCount);
      
      if (agreeingCount >= 2) {
        // +5% per agreeing image (beyond the first)
        const agreementBonus = (agreeingCount - 1) * 5;
        adjustedConfidence += agreementBonus;
        explanation.push(`${agreeingCount} images agree on identification`);
      }
      
      // RULE: If disagreement detected: reduce confidence and add explanation note
      const disagreementCount = imageCount - agreeingCount;
      if (disagreementCount > 0) {
        // Reduce confidence based on disagreement level
        const disagreementPenalty = Math.min(15, disagreementCount * 5); // Max -15%
        adjustedConfidence -= disagreementPenalty;
        explanation.push(`${disagreementCount} image${disagreementCount > 1 ? 's' : ''} show${disagreementCount > 1 ? '' : 's'} different identification — confidence reduced`);
      }
      
      // Multi-image cap: max 95%
      adjustedConfidence = Math.min(adjustedConfidence, 95);
    }
    
    // RULE: Never output 100%
    adjustedConfidence = Math.min(adjustedConfidence, 99);
    
    // Safety floor (never below 50% for valid scans)
    adjustedConfidence = Math.max(50, adjustedConfidence);
    
    // Round to integer
    let finalConfidence = Math.round(adjustedConfidence);
    
    // RULE: If name confidence < 60%, label as "Closest Known Cultivar"
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
    
    // Add uncertainty reflection (never use "Guaranteed" language)
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
