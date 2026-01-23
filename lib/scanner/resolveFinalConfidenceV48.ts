// Phase 4.8 — CONFIDENCE CALIBRATION
// lib/scanner/resolveFinalConfidenceV48.ts

/**
 * Phase 4.8 — Final Confidence Result
 * 
 * Confidence feels earned, believable, and consistent.
 */
export type FinalConfidenceResultV48 = {
  rawConfidence: number; // 0–100 (internal)
  displayTier: "Very High Confidence" | "High Confidence" | "Moderate Confidence" | "Low Confidence" | "Exploratory Match";
  displayRange: string; // e.g., "95–99%"
  explanation: string; // 1–2 lines, user-facing
  bonuses: number; // Total bonuses applied
  penalties: number; // Total penalties applied
};

/**
 * Phase 4.8 — Resolve Final Confidence V48
 * 
 * Applies confidence bands, multi-image weighting, name-first override, and safety clamps.
 */
export function resolveFinalConfidenceV48(args: {
  baseConfidence: number; // 0–100 (from previous phase)
  imageCount: number;
  imagesAgreeOnName: number; // How many images have the primary name (0–imageCount)
  imagesSameAngle: boolean; // Images appear same-angle
  morphologyConflicts: boolean; // Visual morphology conflicts detected
  nameConfidenceAmbiguity: boolean; // Name confidence engine flags ambiguity
  namePipelineConfidence: number; // 0–100 (from name-first pipeline)
  hasDatabaseMatch: boolean; // Database match exists
  isFreeTier: boolean; // Free tier user
}): FinalConfidenceResultV48 {
  const {
    baseConfidence,
    imageCount,
    imagesAgreeOnName,
    imagesSameAngle,
    morphologyConflicts,
    nameConfidenceAmbiguity,
    namePipelineConfidence,
    hasDatabaseMatch,
    isFreeTier,
  } = args;

  // Safety: Never throw — fallback to 65 / Moderate Confidence
  try {
    let rawConfidence = Math.max(0, Math.min(100, baseConfidence));

    // 3) Multi-image weighting - Apply bonuses
    let bonuses = 0;

    // +5% if 2+ images agree on primary name
    if (imagesAgreeOnName >= 2) {
      bonuses += 5;
    }

    // +8% if 3+ images agree
    if (imagesAgreeOnName >= 3) {
      bonuses += 8; // Total would be 13, but we cap at +10
    }

    // +10% max cap from image agreement
    bonuses = Math.min(bonuses, 10);

    // Apply bonuses
    rawConfidence = rawConfidence + bonuses;

    // 3) Multi-image weighting - Apply penalties
    let penalties = 0;

    // −5% if images appear same-angle
    if (imagesSameAngle) {
      penalties += 5;
    }

    // −8% if morphology conflicts
    if (morphologyConflicts) {
      penalties += 8;
    }

    // −10% if name confidence engine flags ambiguity
    if (nameConfidenceAmbiguity) {
      penalties += 10;
    }

    // Apply penalties
    rawConfidence = rawConfidence - penalties;

    // 4) Name-first override rule
    // If name pipeline confidence ≥ 90% AND database match exists, floor at 88% (High)
    if (namePipelineConfidence >= 90 && hasDatabaseMatch) {
      rawConfidence = Math.max(rawConfidence, 88);
    }

    // 5) Free-tier realism - Cap displayed confidence at 94%
    if (isFreeTier) {
      rawConfidence = Math.min(rawConfidence, 94);
    }

    // 7) Safety clamp
    rawConfidence = Math.max(55, Math.min(99, rawConfidence));

    // Round to integer
    rawConfidence = Math.round(rawConfidence);

    // 2) Confidence bands (LOCKED) - Map raw confidence → display tier
    let displayTier: "Very High Confidence" | "High Confidence" | "Moderate Confidence" | "Low Confidence" | "Exploratory Match";
    let displayRange: string;

    if (rawConfidence >= 95) {
      displayTier = "Very High Confidence";
      displayRange = "95–99%";
    } else if (rawConfidence >= 88) {
      displayTier = "High Confidence";
      displayRange = "88–94%";
    } else if (rawConfidence >= 75) {
      displayTier = "Moderate Confidence";
      displayRange = "75–87%";
    } else if (rawConfidence >= 60) {
      displayTier = "Low Confidence";
      displayRange = "60–74%";
    } else {
      displayTier = "Exploratory Match";
      displayRange = "<60%";
    }

    // 6) Confidence explanation (1–2 lines)
    let explanation: string;
    if (rawConfidence < 60) {
      explanation = "Limited by image similarity or lighting";
    } else {
      explanation = "Based on visual traits, strain database, and cross-image agreement";
    }

    // If free tier and capped, add note (will be shown in UI)
    if (isFreeTier && baseConfidence > 94) {
      // Note is handled in UI, not in explanation
    }

    return {
      rawConfidence,
      displayTier,
      displayRange,
      explanation,
      bonuses,
      penalties,
    };
  } catch (error) {
    // Safety: Never throw — fallback to 65 / Moderate Confidence
    console.warn("Phase 4.8 — Confidence calculation error, using default fallback:", error);
    return {
      rawConfidence: 65,
      displayTier: "Moderate Confidence",
      displayRange: "75–87%",
      explanation: "Based on visual traits, strain database, and cross-image agreement",
      bonuses: 0,
      penalties: 0,
    };
  }
}
