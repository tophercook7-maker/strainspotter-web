// Phase 5.0 — CONFIDENCE CALIBRATION ENGINE
// lib/scanner/resolveFinalConfidenceV50.ts

/**
 * Phase 5.0 — Final Confidence Result
 * 
 * Confidence feels earned, consistent, and believable.
 */
export type FinalConfidenceResultV50 = {
  confidence: number; // 0–100 (never 100)
  tier: "Very High" | "High" | "Moderate" | "Low" | "Exploratory";
  explanation: string[]; // 2–3 bullets, user-facing, plain language
  sources: {
    nameFirstAgreement: number; // 0–100
    multiImageAgreement: number; // 0–100
    databaseLineageCertainty: number; // 0–100
    visualTraitConsistency: number; // 0–100
    terpeneEffectCoherence: number; // 0–100
  };
  adjustments: {
    imageCountCap?: number; // Cap applied if only 1 image
    similarityPenalty?: number; // Penalty if images highly similar
    lineageCap?: number; // Cap if lineage unknown
    disambiguationCap?: number; // Cap if name disambiguation triggered
  };
};

/**
 * Phase 5.0 — Resolve Final Confidence V50
 * 
 * Combines weighted confidence sources with anti-inflation rules and stability.
 */
export function resolveFinalConfidenceV50(args: {
  nameFirstAgreementScore: number; // 0–1 (normalized)
  multiImageAgreementScore: number; // 0–1 (normalized)
  databaseLineageCertainty: number; // 0–1 (normalized)
  visualTraitConsistency: number; // 0–1 (normalized)
  terpeneEffectCoherence: number; // 0–1 (normalized)
  imageCount: number;
  imagesHighlySimilar: boolean; // Images appear same-angle/same-plant
  lineageUnknown: boolean; // Database lineage/genetics missing
  nameDisambiguationTriggered: boolean; // Name engine flagged ambiguity
  previousConfidence?: number; // For stability rule (same image set)
}): FinalConfidenceResultV50 {
  const {
    nameFirstAgreementScore,
    multiImageAgreementScore,
    databaseLineageCertainty,
    visualTraitConsistency,
    terpeneEffectCoherence,
    imageCount,
    imagesHighlySimilar,
    lineageUnknown,
    nameDisambiguationTriggered,
    previousConfidence,
  } = args;

  // Safety: Never throw — fallback to 65 / Moderate
  try {
    // Normalize inputs to 0..1
    const normNameFirst = Math.max(0, Math.min(1, nameFirstAgreementScore || 0.5));
    const normMultiImage = Math.max(0, Math.min(1, multiImageAgreementScore || 0.5));
    const normLineage = Math.max(0, Math.min(1, databaseLineageCertainty || 0.5));
    const normVisual = Math.max(0, Math.min(1, visualTraitConsistency || 0.6));
    const normTerpene = Math.max(0, Math.min(1, terpeneEffectCoherence || 0.5));

    // 1) Confidence sources (WEIGHTED)
    // NO single source > 40% weight
    // Distribute weights: Name-first 35%, Multi-image 25%, Lineage 20%, Visual 15%, Terpene 5%
    const nameFirstComponent = normNameFirst * 0.35 * 100;
    const multiImageComponent = normMultiImage * 0.25 * 100;
    const lineageComponent = normLineage * 0.20 * 100;
    const visualComponent = normVisual * 0.15 * 100;
    const terpeneComponent = normTerpene * 0.05 * 100;

    // Raw confidence (weighted sum)
    let rawConfidence = nameFirstComponent + multiImageComponent + lineageComponent + visualComponent + terpeneComponent;

    // 3) Anti-inflation rules
    const adjustments: FinalConfidenceResultV50["adjustments"] = {};

    // If only 1 image → cap at 82%
    if (imageCount === 1) {
      rawConfidence = Math.min(rawConfidence, 82);
      adjustments.imageCountCap = 82;
    }

    // If images highly similar → apply −5% to −10%
    if (imagesHighlySimilar) {
      const similarityPenalty = imageCount === 1 ? 5 : 10;
      rawConfidence = rawConfidence - similarityPenalty;
      adjustments.similarityPenalty = similarityPenalty;
    }

    // If lineage unknown → cap at 90%
    if (lineageUnknown) {
      rawConfidence = Math.min(rawConfidence, 90);
      adjustments.lineageCap = 90;
    }

    // If name disambiguation triggered → cap at 88%
    if (nameDisambiguationTriggered) {
      rawConfidence = Math.min(rawConfidence, 88);
      adjustments.disambiguationCap = 88;
    }

    // 4) Stability rule - Same image set → confidence variance ≤ ±3%
    if (previousConfidence !== undefined) {
      const delta = rawConfidence - previousConfidence;
      if (Math.abs(delta) > 3) {
        // Clamp to ±3% max
        rawConfidence = previousConfidence + (Math.sign(delta) * 3);
      }
    }

    // Safety clamp
    rawConfidence = Math.max(55, Math.min(99, rawConfidence));

    // Round to integer
    let finalConfidence = Math.round(rawConfidence);

    // 2) Confidence tiers (LOCKED) - Map numeric → tier
    let tier: "Very High" | "High" | "Moderate" | "Low" | "Exploratory";
    if (finalConfidence >= 93) {
      tier = "Very High";
    } else if (finalConfidence >= 85) {
      tier = "High";
    } else if (finalConfidence >= 70) {
      tier = "Moderate";
    } else if (finalConfidence >= 55) {
      tier = "Low";
    } else {
      tier = "Exploratory";
    }

    // 5) User-facing explanation - Generate 2–3 bullets
    const explanation: string[] = [];

    // Why confidence is high/medium/low
    if (tier === "Very High") {
      explanation.push("Strong agreement across multiple images and reference data");
      if (normLineage > 0.8) {
        explanation.push("Genetic lineage confirmed in database");
      }
      if (normMultiImage > 0.8) {
        explanation.push("Consistent identification across all images");
      }
    } else if (tier === "High") {
      explanation.push("Good agreement between visual analysis and known genetics");
      if (normMultiImage > 0.7) {
        explanation.push("Multiple images support this identification");
      }
    } else if (tier === "Moderate") {
      explanation.push("Visual traits align with known cultivars");
      if (imagesHighlySimilar) {
        explanation.push("Limited image diversity may affect certainty");
      }
      if (lineageUnknown) {
        explanation.push("Genetic lineage information not available");
      }
    } else if (tier === "Low") {
      explanation.push("Some uncertainty due to limited visual distinction");
      if (imageCount === 1) {
        explanation.push("Additional images from different angles would improve confidence");
      }
      if (nameDisambiguationTriggered) {
        explanation.push("Multiple similar cultivars match these traits");
      }
    } else {
      // Exploratory
      explanation.push("Limited confidence — results are exploratory");
      explanation.push("Consider adding more images or consulting additional sources");
    }

    // Ensure 2–3 bullets
    if (explanation.length < 2) {
      explanation.push("Based on available visual and genetic information");
    }
    if (explanation.length > 3) {
      explanation.splice(3); // Keep only first 3
    }

    return {
      confidence: finalConfidence,
      tier,
      explanation,
      sources: {
        nameFirstAgreement: Math.round(nameFirstComponent),
        multiImageAgreement: Math.round(multiImageComponent),
        databaseLineageCertainty: Math.round(lineageComponent),
        visualTraitConsistency: Math.round(visualComponent),
        terpeneEffectCoherence: Math.round(terpeneComponent),
      },
      adjustments,
    };
  } catch (error) {
    // Safety: Never throw — fallback to 65 / Moderate
    console.warn("Phase 5.0 — Confidence calculation error, using default fallback:", error);
    return {
      confidence: 65,
      tier: "Moderate",
      explanation: [
        "Visual traits align with known cultivars",
        "Based on available visual and genetic information",
      ],
      sources: {
        nameFirstAgreement: 23,
        multiImageAgreement: 16,
        databaseLineageCertainty: 13,
        visualTraitConsistency: 10,
        terpeneEffectCoherence: 3,
      },
      adjustments: {},
    };
  }
}
