// INDICA / SATIVA / HYBRID (SIMPLE & BELIEVABLE)
// lib/scanner/resolveFinalRatioV1.ts

/**
 * RATIO ENGINE V1 — Final Strain Ratio Result
 * 
 * Simple and believable.
 * Users understand the plant immediately.
 */
export type FinalStrainRatioV1 = {
  dominance: {
    indica: number; // 0–100
    sativa: number; // 0–100
    hybrid: number; // 0–100 (computed, always sums to 100)
    classification: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
    confidence: number; // 0–100
  };
};

/**
 * RATIO ENGINE V1 — Resolve Final Ratio
 * 
 * RULES:
 * - Always totals 100%
 * - One category >= 40%
 * - Hybrid only if none >= 60%
 * 
 * SOURCE WEIGHTS:
 * - Database genetics: 50%
 * - Name classification: 25%
 * - Visual traits: 15%
 * - Terpenes: 10%
 * 
 * GUARDRAILS:
 * - Never 33/33/33
 * - Never contradicts known strains
 */
export function resolveFinalRatioV1(args: {
  databaseGenetics: { indica: number; sativa: number } | undefined; // 0–100 each
  nameClassification: { indica: number; sativa: number } | undefined; // 0–100 each (from name/strain type)
  visualTraits: { indica: number; sativa: number } | undefined; // 0–100 each (from visual morphology)
  terpenes: { indica: number; sativa: number } | undefined; // 0–100 each (from terpene profile)
  confidence: number; // 0–100 (overall scan confidence)
}): FinalStrainRatioV1 {
  const {
    databaseGenetics,
    nameClassification,
    visualTraits,
    terpenes,
    confidence,
  } = args;

  // Safety: Never throw — fallback to balanced hybrid
  try {
    // Normalize inputs to 0–100 (default to 50/50 if missing)
    const normDb = databaseGenetics || { indica: 50, sativa: 50 };
    const normName = nameClassification || { indica: 50, sativa: 50 };
    const normVisual = visualTraits || { indica: 50, sativa: 50 };
    const normTerpene = terpenes || { indica: 50, sativa: 50 };

    // SOURCE WEIGHTS
    // Database genetics: 50%
    const dbIndica = normDb.indica * 0.50;
    const dbSativa = normDb.sativa * 0.50;
    
    // Name classification: 25%
    const nameIndica = normName.indica * 0.25;
    const nameSativa = normName.sativa * 0.25;
    
    // Visual traits: 15%
    const visualIndica = normVisual.indica * 0.15;
    const visualSativa = normVisual.sativa * 0.15;
    
    // Terpenes: 10%
    const terpeneIndica = normTerpene.indica * 0.10;
    const terpeneSativa = normTerpene.sativa * 0.10;

    // Weighted combination
    let finalIndica = dbIndica + nameIndica + visualIndica + terpeneIndica;
    let finalSativa = dbSativa + nameSativa + visualSativa + terpeneSativa;

    // Normalize to sum to 100
    const total = finalIndica + finalSativa;
    if (total > 0) {
      finalIndica = (finalIndica / total) * 100;
      finalSativa = (finalSativa / total) * 100;
    } else {
      finalIndica = 50;
      finalSativa = 50;
    }

    // Round to integers
    finalIndica = Math.round(finalIndica);
    finalSativa = Math.round(finalSativa);

    // Ensure they sum to 100
    const remainder = 100 - (finalIndica + finalSativa);
    if (remainder !== 0) {
      if (finalIndica >= finalSativa) {
        finalIndica += remainder;
      } else {
        finalSativa += remainder;
      }
    }

    // GUARDRAILS
    // Never 33/33/33 (or close to it)
    const diff = Math.abs(finalIndica - finalSativa);
    if (diff < 5 && finalIndica >= 30 && finalIndica <= 40) {
      // Too close to 33/33/33, push toward 40/40/20 or similar
      if (finalIndica >= finalSativa) {
        finalIndica = 40;
        finalSativa = 40;
      } else {
        finalIndica = 40;
        finalSativa = 40;
      }
    }

    // RULE: One category >= 40%
    // If both indica and sativa are < 40%, we need to boost one
    if (finalIndica < 40 && finalSativa < 40) {
      // Boost the larger one to 40%
      if (finalIndica >= finalSativa) {
        const boost = 40 - finalIndica;
        finalIndica = 40;
        finalSativa = Math.max(0, finalSativa - boost);
      } else {
        const boost = 40 - finalSativa;
        finalSativa = 40;
        finalIndica = Math.max(0, finalIndica - boost);
      }
      // Re-normalize to 100
      const newTotal = finalIndica + finalSativa;
      if (newTotal > 0) {
        finalIndica = (finalIndica / newTotal) * 100;
        finalSativa = (finalSativa / newTotal) * 100;
      }
      finalIndica = Math.round(finalIndica);
      finalSativa = Math.round(finalSativa);
      const newRemainder = 100 - (finalIndica + finalSativa);
      if (newRemainder !== 0) {
        if (finalIndica >= finalSativa) {
          finalIndica += newRemainder;
        } else {
          finalSativa += newRemainder;
        }
      }
    }

    // Calculate hybrid (always computed as remainder)
    const hybrid = 100 - finalIndica - finalSativa;

    // RULE: Hybrid only if none >= 60%
    // If one category >= 60%, it's dominant (not hybrid)
    let classification: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
    if (finalIndica >= 60) {
      classification = "Indica-dominant";
    } else if (finalSativa >= 60) {
      classification = "Sativa-dominant";
    } else {
      classification = "Balanced Hybrid";
    }

    // Never contradicts known strains
    // If database says it's indica-dominant (>= 60%), don't flip to sativa
    if (databaseGenetics) {
      const dbIndicaDominant = databaseGenetics.indica >= 60;
      const dbSativaDominant = databaseGenetics.sativa >= 60;
      
      if (dbIndicaDominant && finalSativa > finalIndica) {
        // Database says indica, but we calculated sativa - flip to indica
        const temp = finalIndica;
        finalIndica = finalSativa;
        finalSativa = temp;
        classification = "Indica-dominant";
      } else if (dbSativaDominant && finalIndica > finalSativa) {
        // Database says sativa, but we calculated indica - flip to sativa
        const temp = finalIndica;
        finalIndica = finalSativa;
        finalSativa = temp;
        classification = "Sativa-dominant";
      }
    }

    // Recalculate hybrid after potential flip
    const finalHybrid = 100 - finalIndica - finalSativa;

    // Ratio confidence (capped by overall confidence)
    const ratioConfidence = Math.min(confidence, 95);

    return {
      dominance: {
        indica: finalIndica,
        sativa: finalSativa,
        hybrid: finalHybrid,
        classification,
        confidence: ratioConfidence,
      },
    };
  } catch (error) {
    // Fallback to balanced hybrid
    console.warn("RATIO ENGINE V1: Error, using fallback:", error);
    return {
      dominance: {
        indica: 40,
        sativa: 40,
        hybrid: 20,
        classification: "Balanced Hybrid",
        confidence: Math.min(confidence, 70),
      },
    };
  }
}
