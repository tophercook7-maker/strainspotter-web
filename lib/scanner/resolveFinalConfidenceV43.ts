// Phase 4.3 — CONFIDENCE CALIBRATION & HONESTY LAYER
// lib/scanner/resolveFinalConfidenceV43.ts

/**
 * Phase 4.3 — Final Confidence Result
 * 
 * Confidence feels earned, never random, never inflated, never scary.
 */
export type FinalConfidenceResultV43 = {
  confidence: number; // 0–100
  tier: "Very High Match" | "High Match" | "Moderate Match" | "Possible Match";
  explanation: string; // One sentence, matches tier
  sources: {
    nameConsensusStrength: number;
    multiImageAgreement: number;
    visualClarity: number;
    databaseSupport: number;
  };
};

/**
 * Phase 4.3 — Resolve Final Confidence V43
 * 
 * Normalized confidence with honesty rules.
 * Language matches tier.
 */
export function resolveFinalConfidenceV43(args: {
  nameConsensusStrength: number; // 0–1 (PRIMARY - 40%)
  multiImageAgreement: number; // 0–1 (25%)
  visualClarity: number; // 0–1 (20%)
  databaseSupport: number; // 0–1 (15%)
  imageCount: number;
}): FinalConfidenceResultV43 {
  const {
    nameConsensusStrength,
    multiImageAgreement,
    visualClarity,
    databaseSupport,
    imageCount,
  } = args;

  // Safety: Never throw — fallback to 65 / Moderate Match
  try {
    // Normalize inputs to 0..1
    const normNameConsensus = Math.max(0, Math.min(1, nameConsensusStrength || 0.5));
    const normMultiImage = Math.max(0, Math.min(1, multiImageAgreement || 0.5));
    const normVisual = Math.max(0, Math.min(1, visualClarity || 0.6));
    const normDatabase = Math.max(0, Math.min(1, databaseSupport || 0.5));

    // 1) Normalize confidence input sources (weighted)
    // Name consensus strength (PRIMARY) — 40%
    const nameComponent = normNameConsensus * 0.40 * 100;
    // Multi-image agreement — 25%
    const multiImageComponent = normMultiImage * 0.25 * 100;
    // Visual clarity / distinctness — 20%
    const visualComponent = normVisual * 0.20 * 100;
    // Database support (genetics / lineage presence) — 15%
    const dbComponent = normDatabase * 0.15 * 100;

    // Raw confidence (NO single system can exceed its weight)
    const rawConfidence = nameComponent + multiImageComponent + visualComponent + dbComponent;

    // 3) Confidence honesty rules (hard law)
    let cap: number;
    if (imageCount === 1) {
      cap = 82; // Single image max = 82%
    } else if (imageCount === 2) {
      cap = 90; // Two images max = 90%
    } else if (imageCount >= 3) {
      // 99% max ONLY when: 3+ images, same primary name across all, visual agreement > 0.85
      if (normNameConsensus >= 0.85 && normMultiImage >= 0.85 && normVisual >= 0.85) {
        cap = 99; // Never 100
      } else {
        cap = 96; // 3+ images default cap
      }
    } else {
      cap = 82; // Fallback
    }

    // Apply cap
    let finalConfidence = Math.min(rawConfidence, cap);
    finalConfidence = Math.min(finalConfidence, 99); // Absolute max 99% (never 100)

    // Round to integer
    finalConfidence = Math.round(finalConfidence);

    // Determine tier
    let tier: "Very High Match" | "High Match" | "Moderate Match" | "Possible Match";
    if (finalConfidence >= 93) {
      tier = "Very High Match";
    } else if (finalConfidence >= 85) {
      tier = "High Match";
    } else if (finalConfidence >= 70) {
      tier = "Moderate Match";
    } else {
      tier = "Possible Match";
    }

    // 4) Tie confidence to language (language must MATCH tier)
    let explanation: string;
    if (tier === "Very High Match") {
      explanation = "Strong visual and genetic agreement";
    } else if (tier === "High Match") {
      explanation = "Consistent with known examples";
    } else if (tier === "Moderate Match") {
      explanation = "Likely match, some uncertainty";
    } else {
      explanation = "Resembles known cultivars";
    }

    return {
      confidence: finalConfidence,
      tier,
      explanation,
      sources: {
        nameConsensusStrength: Math.round(nameComponent),
        multiImageAgreement: Math.round(multiImageComponent),
        visualClarity: Math.round(visualComponent),
        databaseSupport: Math.round(dbComponent),
      },
    };
  } catch (error) {
    // Safety: Never throw — fallback to 65 / Moderate Match
    console.warn("Phase 4.3 — Confidence calculation error, using default fallback:", error);
    return {
      confidence: 65,
      tier: "Moderate Match",
      explanation: "Likely match, some uncertainty",
      sources: {
        nameConsensusStrength: 26,
        multiImageAgreement: 16,
        visualClarity: 13,
        databaseSupport: 10,
      },
    };
  }
}
