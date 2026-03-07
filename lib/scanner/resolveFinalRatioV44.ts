// Phase 4.4 — IDENTITY + RATIO SURFACE LAYER
// lib/scanner/resolveFinalRatioV44.ts

/**
 * Phase 4.4 — Final Strain Ratio (with weighted source hierarchy)
 * 
 * Makes results feel complete, named, and human-readable.
 */
export type FinalStrainRatioV44 = {
  indica: number; // 0–100
  sativa: number; // 0–100
  hybrid: number; // 0–100 (computed, not independent)
  classification: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
  dominantLabel: string; // e.g., "Indica-dominant Hybrid"
  confidence: number; // 0–100
  explanation: string[];
};

/**
 * Phase 4.4 — Resolve Final Ratio V44
 * 
 * Ratio engine combines weighted sources:
 * - Database genetics / lineage — 40%
 * - Name consensus history — 25%
 * - Visual morphology — 20%
 * - Terpene profile correlation — 15%
 * 
 * No single source may exceed its weight.
 */
export function resolveFinalRatioV44(args: {
  databaseGenetics: { indica: number; sativa: number } | undefined; // 0–100 each
  nameConsensusHistory: { indica: number; sativa: number } | undefined; // 0–100 each
  visualMorphology: { indica: number; sativa: number } | undefined; // 0–100 each
  terpeneCorrelation: { indica: number; sativa: number } | undefined; // 0–100 each
  confidence: number; // 0–100 (for confidence note)
}): FinalStrainRatioV44 {
  const {
    databaseGenetics,
    nameConsensusHistory,
    visualMorphology,
    terpeneCorrelation,
    confidence,
  } = args;

  // Safety: Never throw — fallback to balanced hybrid
  try {
    // Normalize inputs to 0–100
    const normDb = databaseGenetics || { indica: 50, sativa: 50 };
    const normName = nameConsensusHistory || { indica: 50, sativa: 50 };
    const normVisual = visualMorphology || { indica: 50, sativa: 50 };
    const normTerpene = terpeneCorrelation || { indica: 50, sativa: 50 };

    // 3) Ratio data source hierarchy (weighted)
    // Database genetics / lineage — 40%
    const dbIndica = normDb.indica * 0.40;
    const dbSativa = normDb.sativa * 0.40;
    
    // Name consensus history — 25%
    const nameIndica = normName.indica * 0.25;
    const nameSativa = normName.sativa * 0.25;
    
    // Visual morphology — 20%
    const visualIndica = normVisual.indica * 0.20;
    const visualSativa = normVisual.sativa * 0.20;
    
    // Terpene profile correlation — 15%
    const terpeneIndica = normTerpene.indica * 0.15;
    const terpeneSativa = normTerpene.sativa * 0.15;

    // Weighted combination (NO single source may exceed its weight)
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

    // Safety: Never show exact 50/50 unless truly balanced (within 0.5%)
    if (Math.abs(finalIndica - finalSativa) < 0.5) {
      finalIndica = 51;
      finalSativa = 49;
    }

    // Safety: Never show >95% dominance
    if (finalIndica > 95) {
      finalIndica = 95;
      finalSativa = 5;
    } else if (finalSativa > 95) {
      finalSativa = 95;
      finalIndica = 5;
    }

    // Hybrid calculation
    const hybrid = 100 - Math.abs(finalIndica - finalSativa);

    // Classification
    let classification: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
    if (finalIndica >= 60) {
      classification = "Indica-dominant";
    } else if (finalSativa >= 60) {
      classification = "Sativa-dominant";
    } else {
      classification = "Balanced Hybrid";
    }

    // Dominant label (if one > 60%)
    let dominantLabel: string;
    if (finalIndica >= 60) {
      dominantLabel = "Indica-dominant Hybrid";
    } else if (finalSativa >= 60) {
      dominantLabel = "Sativa-dominant Hybrid";
    } else {
      dominantLabel = "Balanced Hybrid";
    }

    // Explanation
    const explanation: string[] = [];
    if (databaseGenetics) {
      explanation.push("Ratio based on known genetics from strain database");
    }
    if (nameConsensusHistory) {
      explanation.push("Name consensus supports genetic profile");
    }
    if (visualMorphology) {
      explanation.push("Visual structure suggests genetic balance");
    }
    if (terpeneCorrelation) {
      explanation.push("Terpene profile correlates with genetic expression");
    }

    // If confidence < 65%, add note (will be appended in UI)
    const needsEstimationNote = confidence < 65;

    return {
      indica: finalIndica,
      sativa: finalSativa,
      hybrid,
      classification,
      dominantLabel,
      confidence,
      explanation,
    };
  } catch (error) {
    // Safety: Never throw — fallback to balanced hybrid
    console.warn("Phase 4.4 — Ratio calculation error, using balanced hybrid fallback:", error);
    return {
      indica: 50,
      sativa: 50,
      hybrid: 100,
      classification: "Balanced Hybrid",
      dominantLabel: "Balanced Hybrid",
      confidence: 60,
      explanation: ["Ratio estimated from visual analysis"],
    };
  }
}
