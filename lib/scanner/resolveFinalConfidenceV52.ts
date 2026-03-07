// Phase 5.2 — CONFIDENCE CALIBRATION ENGINE
// lib/scanner/resolveFinalConfidenceV52.ts

/**
 * Phase 5.2 — Final Confidence Result
 * 
 * Confidence scores feel earned, stable, and trustworthy.
 * No wild jumps. No fake 99% unless truly justified.
 */
export type FinalConfidenceResultV52 = {
  confidence: number; // 0–100 (never 100)
  tier: "Very High" | "High" | "Medium" | "Low";
  explanation: string; // Short explanation: why confidence is what it is, what could improve it
  base: number; // Base confidence by image count
  modifiers: number; // Total modifiers applied
  penalties: number; // Total penalties applied
  cap: number; // Hard cap applied
};

/**
 * Phase 5.2 — Resolve Final Confidence V52
 * 
 * Combines confidence inputs with base confidence by image count, modifiers, penalties, and hard caps.
 */
export function resolveFinalConfidenceV52(args: {
  imageCount: number; // 1–5
  imageDiversityScore: number; // 0–1 (normalized)
  consensusAgreementStrength: number; // 0–1 (normalized)
  databaseMatchStrength: number; // 0–1 (normalized)
  nameFirstCertainty: number; // 0–1 (normalized)
  ratioStability: number; // 0–1 (indica/sativa spread - lower spread = higher stability)
  hasDatabaseLineageMatch: boolean; // Database lineage/genetics match exists
  hasClearMorphologySignals: boolean; // Clear visual morphology signals detected
  hasTerpeneAlignment: boolean; // Terpene profile aligns with strain
  hasConflictingCandidates: boolean; // Multiple conflicting candidates detected
  hasWeakDatabaseMatch: boolean; // Database match is weak or uncertain
  hasForcedFallbackName: boolean; // Name is "Closest Known Cultivar" or fallback
  previousConfidence?: number; // For stability rule (same image set)
}): FinalConfidenceResultV52 {
  const {
    imageCount,
    imageDiversityScore,
    consensusAgreementStrength,
    databaseMatchStrength,
    nameFirstCertainty,
    ratioStability,
    hasDatabaseLineageMatch,
    hasClearMorphologySignals,
    hasTerpeneAlignment,
    hasConflictingCandidates,
    hasWeakDatabaseMatch,
    hasForcedFallbackName,
    previousConfidence,
  } = args;

  // Safety: Never throw — fallback to 65 / Medium
  try {
    // 2) Base confidence by image count
    let base: number;
    if (imageCount === 1) {
      base = 62;
    } else if (imageCount === 2) {
      base = 72;
    } else if (imageCount === 3) {
      base = 82;
    } else if (imageCount === 4) {
      base = 88;
    } else if (imageCount >= 5) {
      base = 91;
    } else {
      base = 62; // Fallback
    }

    let rawConfidence = base;

    // 3) Modifiers (additive)
    let modifiers = 0;

    // Consensus agreement strong → +3–6%
    if (consensusAgreementStrength >= 0.8) {
      modifiers += 6;
    } else if (consensusAgreementStrength >= 0.7) {
      modifiers += 4;
    } else if (consensusAgreementStrength >= 0.6) {
      modifiers += 3;
    }

    // Database lineage match → +4–8%
    if (hasDatabaseLineageMatch) {
      if (databaseMatchStrength >= 0.9) {
        modifiers += 8;
      } else if (databaseMatchStrength >= 0.7) {
        modifiers += 6;
      } else {
        modifiers += 4;
      }
    }

    // Clear morphology signals → +2–5%
    if (hasClearMorphologySignals) {
      modifiers += 5;
    }

    // Terpene alignment → +1–3%
    if (hasTerpeneAlignment) {
      modifiers += 3;
    }

    // Apply modifiers
    rawConfidence = rawConfidence + modifiers;

    // 4) Penalties
    let penalties = 0;

    // Low image diversity → −5–10%
    if (imageDiversityScore < 0.5) {
      penalties += 10;
    } else if (imageDiversityScore < 0.7) {
      penalties += 5;
    }

    // Conflicting candidates → −6–12%
    if (hasConflictingCandidates) {
      penalties += 12;
    }

    // Weak database match → −4–8%
    if (hasWeakDatabaseMatch) {
      penalties += 8;
    } else if (databaseMatchStrength < 0.5) {
      penalties += 4;
    }

    // Forced fallback name → −10–15%
    if (hasForcedFallbackName) {
      penalties += 15;
    }

    // Apply penalties
    rawConfidence = rawConfidence - penalties;

    // 5) Hard caps (LOCKED)
    let cap: number;
    if (imageCount === 1) {
      cap = 78;
    } else if (imageCount === 2) {
      cap = 88;
    } else if (imageCount === 3) {
      cap = 94;
    } else if (imageCount >= 4) {
      cap = 97;
    } else {
      cap = 78; // Fallback
    }

    // Apply cap
    rawConfidence = Math.min(rawConfidence, cap);
    
    // Never return 100
    rawConfidence = Math.min(rawConfidence, 99);

    // 8) Stability rule - No jumps > 12% between runs
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

    // 6) Output structure - Tiers
    let tier: "Very High" | "High" | "Medium" | "Low";
    if (finalConfidence >= 93) {
      tier = "Very High";
    } else if (finalConfidence >= 85) {
      tier = "High";
    } else if (finalConfidence >= 70) {
      tier = "Medium";
    } else {
      tier = "Low";
    }

    // 7) Explanation - Generate short explanation
    let explanation: string;
    if (tier === "Very High") {
      explanation = "High confidence based on strong agreement across multiple images and reference data.";
      if (imageCount < 3) {
        explanation += " Additional angles could further improve certainty.";
      }
    } else if (tier === "High") {
      explanation = "Good confidence from visual analysis and database alignment.";
      if (imageCount < 3) {
        explanation += " More images would increase certainty.";
      } else if (imageDiversityScore < 0.7) {
        explanation += " Different angles would improve accuracy.";
      }
    } else if (tier === "Medium") {
      explanation = "Moderate confidence — results align with known cultivars.";
      if (imageCount === 1) {
        explanation += " Add another angle for better accuracy.";
      } else if (imageDiversityScore < 0.6) {
        explanation += " More diverse image angles would help.";
      } else if (hasWeakDatabaseMatch) {
        explanation += " Database match is uncertain.";
      }
    } else {
      // Low
      explanation = "Lower confidence due to limited visual distinction or conflicting signals.";
      if (imageCount === 1) {
        explanation += " Multiple images from different angles would significantly improve results.";
      } else if (hasConflictingCandidates) {
        explanation += " Multiple similar cultivars match these traits.";
      } else if (hasForcedFallbackName) {
        explanation += " Strain identification is uncertain.";
      }
    }

    return {
      confidence: finalConfidence,
      tier,
      explanation,
      base,
      modifiers,
      penalties,
      cap,
    };
  } catch (error) {
    // Safety: Never throw — fallback to 65 / Medium
    console.warn("Phase 5.2 — Confidence calculation error, using default fallback:", error);
    return {
      confidence: 65,
      tier: "Medium",
      explanation: "Moderate confidence — results align with known cultivars.",
      base: 62,
      modifiers: 0,
      penalties: 0,
      cap: 78,
    };
  }
}
