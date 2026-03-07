// Phase 5.1 — INDICA / SATIVA / HYBRID RATIO ENGINE
// lib/scanner/resolveFinalRatioV51.ts

/**
 * Phase 5.1 — Final Strain Ratio Result
 * 
 * Produces a believable, explainable indica/sativa/hybrid ratio that users trust.
 */
export type FinalStrainRatioV51 = {
  classification: "Indica" | "Sativa" | "Hybrid";
  percentages: {
    indica: number; // 0–100
    sativa: number; // 0–100
    hybrid: number; // 0–100 (computed)
  };
  dominanceLabel: string; // e.g., "Indica-dominant Hybrid"
  confidence: number; // 55–95%
  explanation: string[]; // 2–3 bullets, user-facing, plain language
};

/**
 * Phase 5.1 — Resolve Final Ratio V51
 * 
 * Combines weighted sources with guardrails and user-facing explanations.
 */
export function resolveFinalRatioV51(args: {
  databaseGenetics: { indica: number; sativa: number } | undefined; // 0–100 each
  nameConsensusRatio: { indica: number; sativa: number } | undefined; // 0–100 each
  visualMorphologySignals: { indica: number; sativa: number } | undefined; // 0–100 each
  terpeneProfileTendencies: { indica: number; sativa: number } | undefined; // 0–100 each
  lineageUnknown: boolean; // Database lineage/genetics missing
  imageCount: number;
  databaseCertainty: number; // 0–100 (how certain we are about DB match)
}): FinalStrainRatioV51 {
  const {
    databaseGenetics,
    nameConsensusRatio,
    visualMorphologySignals,
    terpeneProfileTendencies,
    lineageUnknown,
    imageCount,
    databaseCertainty,
  } = args;

  // Safety: Never throw — fallback to balanced hybrid
  try {
    // Normalize inputs to 0–100
    const normDb = databaseGenetics || { indica: 50, sativa: 50 };
    const normName = nameConsensusRatio || { indica: 50, sativa: 50 };
    const normVisual = visualMorphologySignals || { indica: 50, sativa: 50 };
    const normTerpene = terpeneProfileTendencies || { indica: 50, sativa: 50 };

    // 1) Ratio sources (WEIGHTED)
    // Database + lineage: ~40%
    const dbIndica = normDb.indica * 0.40;
    const dbSativa = normDb.sativa * 0.40;
    
    // Name consensus: ~25%
    const nameIndica = normName.indica * 0.25;
    const nameSativa = normName.sativa * 0.25;
    
    // Visual traits: ~20%
    const visualIndica = normVisual.indica * 0.20;
    const visualSativa = normVisual.sativa * 0.20;
    
    // Terpenes/effects: ~15%
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

    // 3) Guardrails
    // If lineage unknown → force Hybrid bias (push toward 50/50 if too extreme)
    if (lineageUnknown) {
      if (finalIndica > 70) {
        finalIndica = Math.max(60, finalIndica - 10);
        finalSativa = 100 - finalIndica;
      } else if (finalSativa > 70) {
        finalSativa = Math.max(60, finalSativa - 10);
        finalIndica = 100 - finalSativa;
      }
    }

    // If indica & sativa within 10% → classify as Hybrid
    // (This will be handled in classification logic below)

    // Never allow 0/100 unless database certainty > 95%
    if (databaseCertainty <= 95) {
      if (finalIndica === 0 || finalSativa === 0) {
        // Push toward hybrid
        if (finalIndica === 0) {
          finalIndica = 10;
          finalSativa = 90;
        } else {
          finalSativa = 10;
          finalIndica = 90;
        }
      }
    }

    // Re-normalize after guardrails
    const totalAfter = finalIndica + finalSativa;
    if (totalAfter !== 100) {
      finalIndica = Math.round((finalIndica / totalAfter) * 100);
      finalSativa = 100 - finalIndica;
    }

    // Hybrid calculation
    const hybrid = 100 - Math.abs(finalIndica - finalSativa);

    // 2) Output format (LOCKED) - Classification
    let classification: "Indica" | "Sativa" | "Hybrid";
    const diff = Math.abs(finalIndica - finalSativa);
    
    // If indica & sativa within 10% → classify as Hybrid
    if (diff <= 10) {
      classification = "Hybrid";
    } else if (finalIndica > finalSativa) {
      classification = "Indica";
    } else {
      classification = "Sativa";
    }

    // Dominance label
    let dominanceLabel: string;
    if (classification === "Indica") {
      if (finalIndica >= 80) {
        dominanceLabel = "Indica";
      } else {
        dominanceLabel = "Indica-dominant Hybrid";
      }
    } else if (classification === "Sativa") {
      if (finalSativa >= 80) {
        dominanceLabel = "Sativa";
      } else {
        dominanceLabel = "Sativa-dominant Hybrid";
      }
    } else {
      dominanceLabel = "Hybrid";
    }

    // 3) Guardrails - Cap confidence based on image count
    let baseConfidence = 85; // Default
    if (databaseGenetics && databaseCertainty > 90) {
      baseConfidence = 90;
    } else if (databaseGenetics) {
      baseConfidence = 80;
    } else {
      baseConfidence = 70;
    }

    // Cap confidence at:
    // 75% for single image
    // 90% for 2 images
    // 95% for 3+ images
    let confidenceCap: number;
    if (imageCount === 1) {
      confidenceCap = 75;
    } else if (imageCount === 2) {
      confidenceCap = 90;
    } else {
      confidenceCap = 95;
    }

    const confidence = Math.min(baseConfidence, confidenceCap);
    const finalConfidence = Math.max(55, Math.min(95, confidence));

    // 4) User-facing explanation - Generate 2–3 bullets
    const explanation: string[] = [];

    // What signals influenced the ratio
    if (databaseGenetics) {
      explanation.push("Ratio based primarily on known genetics from strain database");
    } else if (nameConsensusRatio) {
      explanation.push("Ratio derived from strain name consensus and visual analysis");
    } else {
      explanation.push("Ratio estimated from visual traits and morphological signals");
    }

    // Why it leans indica/sativa/hybrid
    if (classification === "Indica") {
      if (finalIndica >= 70) {
        explanation.push("Strong indica-dominant characteristics observed");
      } else {
        explanation.push("Indica-leaning traits with some hybrid influence");
      }
    } else if (classification === "Sativa") {
      if (finalSativa >= 70) {
        explanation.push("Strong sativa-dominant characteristics observed");
      } else {
        explanation.push("Sativa-leaning traits with some hybrid influence");
      }
    } else {
      explanation.push("Balanced hybrid characteristics with mixed indica and sativa traits");
    }

    // Mention uncertainty if signals conflict
    if (lineageUnknown || (!databaseGenetics && !nameConsensusRatio)) {
      explanation.push("Genetic lineage information limited — ratio is an estimate");
    } else if (Math.abs(normDb.indica - normVisual.indica) > 30 || Math.abs(normDb.sativa - normVisual.sativa) > 30) {
      explanation.push("Some conflict between visual traits and database genetics");
    }

    // Ensure 2–3 bullets
    if (explanation.length < 2) {
      explanation.push("Based on available visual and genetic information");
    }
    if (explanation.length > 3) {
      explanation.splice(3); // Keep only first 3
    }

    return {
      classification,
      percentages: {
        indica: finalIndica,
        sativa: finalSativa,
        hybrid,
      },
      dominanceLabel,
      confidence: finalConfidence,
      explanation,
    };
  } catch (error) {
    // Safety: Never throw — fallback to balanced hybrid
    console.warn("Phase 5.1 — Ratio calculation error, using balanced hybrid fallback:", error);
    return {
      classification: "Hybrid",
      percentages: {
        indica: 50,
        sativa: 50,
        hybrid: 100,
      },
      dominanceLabel: "Hybrid",
      confidence: 60,
      explanation: [
        "Ratio estimated from visual analysis",
        "Balanced hybrid characteristics observed",
      ],
    };
  }
}
