// Phase 4.5 — CONFIDENCE CALIBRATION & TRUST GUARDRAILS
// lib/scanner/resolveFinalConfidenceV45.ts

/**
 * Phase 4.5 — Final Confidence Result
 * 
 * Confidence feels earned, stable, and believable.
 */
export type FinalConfidenceResultV45 = {
  confidence: number; // 0–100 (never 100)
  tier: "Very High Confidence" | "High Confidence" | "Moderate Confidence" | "Possible Match" | "Low Confidence";
  explanation: string; // 1–2 lines max, user-facing
  raw: number; // Before dampeners/boosters
  dampeners: number; // Total subtracted
  boosters: number; // Total added (capped)
};

/**
 * Phase 4.5 — Resolve Final Confidence V45
 * 
 * Applies confidence bands, dampeners, boosters, and stability rules.
 */
export function resolveFinalConfidenceV45(args: {
  baseConfidence: number; // 0–100 (from previous phase)
  imageCount: number;
  isSamePlantLikely: boolean; // Images highly similar (same plant angle)
  nameConsensusSources: number; // How many sources agree on name (images, DB, wiki, etc.)
  hasLineageData: boolean; // Database strain has lineage/genetics data
  visualGeneticsAlignment: number; // 0–1 (1 = perfect alignment, 0 = contradiction)
  hasMultiImageAgreement: boolean; // ≥3 images with agreement
  nameInMultipleImages: number; // How many images have this name in top candidates (0–imageCount)
  hasTerpeneMorphologyAlignment: boolean; // Terpene profile aligns with visual morphology
  previousConfidence?: number; // For stability rule (re-scanning same set)
}): FinalConfidenceResultV45 {
  const {
    baseConfidence,
    imageCount,
    isSamePlantLikely,
    nameConsensusSources,
    hasLineageData,
    visualGeneticsAlignment,
    hasMultiImageAgreement,
    nameInMultipleImages,
    hasTerpeneMorphologyAlignment,
    previousConfidence,
  } = args;

  // Safety: Never throw — fallback to 65 / Moderate Confidence
  try {
    let raw = Math.max(0, Math.min(100, baseConfidence));

    // 2) Confidence dampeners (apply cumulatively)
    let dampeners = 0;

    // Single image only: −8%
    if (imageCount === 1) {
      dampeners += 8;
    }

    // Images highly similar (same plant angle): −6%
    if (isSamePlantLikely) {
      dampeners += 6;
    }

    // Name consensus < 2 sources: −5%
    if (nameConsensusSources < 2) {
      dampeners += 5;
    }

    // Database strain missing lineage data: −4%
    if (!hasLineageData) {
      dampeners += 4;
    }

    // Visual traits contradict genetics: −5%
    if (visualGeneticsAlignment < 0.5) {
      dampeners += 5;
    }

    // Apply dampeners
    raw = raw - dampeners;

    // 3) Confidence boosters (capped at +12%)
    let boosters = 0;

    // ≥3 images with agreement: +6%
    if (hasMultiImageAgreement && imageCount >= 3) {
      boosters += 6;
    }

    // Name appears in ≥3 image candidates: +6%
    if (nameInMultipleImages >= 3) {
      boosters += 6;
    }

    // Terpene + morphology alignment: +4%
    if (hasTerpeneMorphologyAlignment) {
      boosters += 4;
    }

    // Database lineage confirmed: +4%
    if (hasLineageData) {
      boosters += 4;
    }

    // Cap total boosts at +12%
    boosters = Math.min(boosters, 12);

    // Apply boosters
    raw = raw + boosters;

    // 4) Stability rule - Re-scanning the same image set
    if (previousConfidence !== undefined) {
      const delta = raw - previousConfidence;
      if (Math.abs(delta) > 3) {
        // Clamp to ±3% max
        raw = previousConfidence + (Math.sign(delta) * 3);
      }
    }

    // Floor: 55% (never below for valid scans)
    raw = Math.max(55, raw);

    // Never show 100%
    raw = Math.min(99, raw);

    // Round to integer
    let finalConfidence = Math.round(raw);

    // 1) Confidence bands (LOCKED)
    let tier: "Very High Confidence" | "High Confidence" | "Moderate Confidence" | "Possible Match" | "Low Confidence";
    if (finalConfidence >= 90) {
      tier = "Very High Confidence";
    } else if (finalConfidence >= 80) {
      tier = "High Confidence";
    } else if (finalConfidence >= 70) {
      tier = "Moderate Confidence";
    } else if (finalConfidence >= 60) {
      tier = "Possible Match";
    } else {
      tier = "Low Confidence";
    }

    // 5) User-facing explanation (1–2 lines max)
    let explanation: string;
    if (finalConfidence < 70) {
      explanation = "Low confidence due to limited visual distinction.";
    } else {
      explanation = "Confidence reflects agreement across images, visual traits, and reference genetics.";
    }

    return {
      confidence: finalConfidence,
      tier,
      explanation,
      raw: baseConfidence,
      dampeners,
      boosters,
    };
  } catch (error) {
    // Safety: Never throw — fallback to 65 / Moderate Confidence
    console.warn("Phase 4.5 — Confidence calculation error, using default fallback:", error);
    return {
      confidence: 65,
      tier: "Moderate Confidence",
      explanation: "Confidence reflects agreement across images, visual traits, and reference genetics.",
      raw: 65,
      dampeners: 0,
      boosters: 0,
    };
  }
}
