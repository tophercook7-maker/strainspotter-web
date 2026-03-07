// Phase 4.1 — CONFIDENCE CALIBRATION & TRUTHFUL PRECISION
// lib/scanner/resolveFinalConfidenceV41.ts

/**
 * Phase 4.1 — Final Confidence Result
 * 
 * Confidence numbers feel EARNED, stable, and believable — no chaos, no whiplash.
 */
export type FinalConfidenceResultV41 = {
  confidence: number; // 0–100
  tier: "Very High" | "High" | "Medium" | "Low";
  explanation: string; // One sentence, user-facing
  sources: {
    databaseMatch: number;
    multiImageConsensus: number;
    nameFirstAgreement: number;
    visualDistinctness: number;
  };
};

/**
 * Phase 4.1 — Resolve Final Confidence V41
 * 
 * Uses weighted sources with honest caps.
 * Removes magic boosts.
 */
export function resolveFinalConfidenceV41(args: {
  databaseMatchStrength: number; // 0–1
  multiImageConsensus: number; // 0–1
  nameFirstAgreement: number; // 0–1
  visualDistinctnessScore: number; // 0–1
  imageCount: number;
}): FinalConfidenceResultV41 {
  const {
    databaseMatchStrength,
    multiImageConsensus,
    nameFirstAgreement,
    visualDistinctnessScore,
    imageCount,
  } = args;

  // Safety: Never throw — fallback to 65 / Medium
  try {
    // Normalize inputs to 0..1
    const normDb = Math.max(0, Math.min(1, databaseMatchStrength || 0.5));
    const normConsensus = Math.max(0, Math.min(1, multiImageConsensus || 0.5));
    const normNameFirst = Math.max(0, Math.min(1, nameFirstAgreement || 0.5));
    const normVisual = Math.max(0, Math.min(1, visualDistinctnessScore || 0.5));

    // 2) Confidence source weighting (final)
    // Database match: 35%
    const dbComponent = normDb * 0.35 * 100;
    // Multi-image consensus: 30%
    const consensusComponent = normConsensus * 0.30 * 100;
    // Name-first agreement: 20%
    const nameFirstComponent = normNameFirst * 0.20 * 100;
    // Visual distinctness score: 15%
    const visualComponent = normVisual * 0.15 * 100;

    // Raw confidence (no magic boosts)
    const rawConfidence = dbComponent + consensusComponent + nameFirstComponent + visualComponent;

    // 3) Honest caps (non-negotiable) - Enforce at FINAL step only
    let cap: number;
    if (imageCount === 1) {
      cap = 82;
    } else if (imageCount === 2) {
      cap = 90;
    } else if (imageCount === 3) {
      cap = 96;
    } else if (imageCount >= 4 && imageCount <= 5) {
      cap = 99; // Never 100
    } else {
      cap = 99; // 6+ images
    }

    // Apply cap
    let finalConfidence = Math.min(rawConfidence, cap);
    finalConfidence = Math.min(finalConfidence, 99); // Absolute max 99%

    // Round to integer
    finalConfidence = Math.round(finalConfidence);

    // Determine tier
    let tier: "Very High" | "High" | "Medium" | "Low";
    if (finalConfidence >= 90) {
      tier = "Very High";
    } else if (finalConfidence >= 80) {
      tier = "High";
    } else if (finalConfidence >= 65) {
      tier = "Medium";
    } else {
      tier = "Low";
    }

    // 4) Add confidence explanation (user-facing, one sentence)
    let explanation: string;
    if (finalConfidence >= 85) {
      if (imageCount >= 3) {
        explanation = "High confidence based on multi-image agreement";
      } else {
        explanation = "High confidence based on strong database and visual alignment";
      }
    } else if (finalConfidence >= 70) {
      if (imageCount === 1) {
        explanation = "Moderate confidence due to limited image diversity";
      } else {
        explanation = "Moderate confidence based on visual and database analysis";
      }
    } else {
      explanation = "Lower confidence — visual traits overlap multiple cultivars";
    }

    return {
      confidence: finalConfidence,
      tier,
      explanation,
      sources: {
        databaseMatch: Math.round(dbComponent),
        multiImageConsensus: Math.round(consensusComponent),
        nameFirstAgreement: Math.round(nameFirstComponent),
        visualDistinctness: Math.round(visualComponent),
      },
    };
  } catch (error) {
    // Safety: Never throw — fallback to 65 / Medium
    console.warn("Phase 4.1 — Confidence calculation error, using default fallback:", error);
    return {
      confidence: 65,
      tier: "Medium",
      explanation: "Confidence based on available visual analysis",
      sources: {
        databaseMatch: 23,
        multiImageConsensus: 20,
        nameFirstAgreement: 13,
        visualDistinctness: 10,
      },
    };
  }
}
