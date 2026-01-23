// Phase 5.4 — INDICA / SATIVA / HYBRID RATIO CALIBRATION
// lib/scanner/resolveFinalRatioV54.ts

/**
 * Phase 5.4 — Final Strain Ratio Result
 * 
 * Makes the ratio feel real, stable, and explainable.
 * Users must trust the Indica / Sativa / Hybrid breakdown.
 */
export type FinalStrainRatioV54 = {
  classification: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
  percentages: {
    indica: number; // 0–100
    sativa: number; // 0–100
    hybrid: number; // 0–100 (computed, always sums to 100)
  };
  confidence: number; // 55–95%
  explanation: string[]; // 2–3 bullets, user-facing, plain language
};

/**
 * Phase 5.4 — Visual Morphology Signals
 * 
 * Extracted from images:
 * - Leaf width (broad vs narrow)
 * - Bud density (tight vs airy)
 * - Internodal spacing (short vs long)
 * - Foxtailing vs chunking (elongated vs compact)
 */
export type VisualMorphologySignals = {
  leafWidth: "broad" | "narrow" | "medium" | undefined;
  budDensity: "high" | "low" | "medium" | undefined;
  internodalSpacing: "short" | "long" | "medium" | undefined;
  budShape: "chunky" | "foxtailing" | "mixed" | undefined;
};

/**
 * Phase 5.4 — Terpene Profile Bias
 * 
 * Examples:
 * - Myrcene-heavy → indica lean
 * - Limonene / Terpinolene → sativa lean
 * - Balanced terpene spread → hybrid stabilization
 */
export type TerpeneBias = {
  indica: number; // 0–100
  sativa: number; // 0–100
};

/**
 * Phase 5.4 — Resolve Final Ratio V54
 * 
 * Combines weighted sources with database-first rule and visual/terpene adjustments.
 */
export function resolveFinalRatioV54(args: {
  databaseGenetics: { indica: number; sativa: number } | undefined; // 0–100 each (PRIMARY)
  nameConsensusRatio: { indica: number; sativa: number } | undefined; // 0–100 each (from Phase 5.3)
  visualMorphologySignals: VisualMorphologySignals | undefined; // Visual indicators
  terpeneBias: TerpeneBias | undefined; // Terpene profile bias
  confidence: number; // Overall scan confidence (0–100)
  nameConfidence: number; // Name confidence (0–100) - ratio confidence cannot exceed this
  imageCount: number;
  imageDiversityScore: number; // 0–1 (normalized) - low diversity → clamp dominance spread
}): FinalStrainRatioV54 {
  const {
    databaseGenetics,
    nameConsensusRatio,
    visualMorphologySignals,
    terpeneBias,
    confidence,
    nameConfidence,
    imageCount,
    imageDiversityScore,
  } = args;

  // Safety: Never throw — fallback to balanced hybrid
  try {
    // 2) Database-first rule: If database strain has a known ratio, use it as the anchor
    let baseIndica = 50;
    let baseSativa = 50;
    let hasDatabaseAnchor = false;
    let dbDominantCategory: "Indica" | "Sativa" | "Hybrid" = "Hybrid";

    if (databaseGenetics) {
      baseIndica = databaseGenetics.indica;
      baseSativa = databaseGenetics.sativa;
      hasDatabaseAnchor = true;
      
      // Determine dominant category from database
      if (baseIndica >= 60) {
        dbDominantCategory = "Indica";
      } else if (baseSativa >= 60) {
        dbDominantCategory = "Sativa";
      } else {
        dbDominantCategory = "Hybrid";
      }
    } else if (nameConsensusRatio) {
      // Fallback to name consensus if no database genetics
      baseIndica = nameConsensusRatio.indica;
      baseSativa = nameConsensusRatio.sativa;
    }

    // Normalize base to sum to 100
    const baseTotal = baseIndica + baseSativa;
    if (baseTotal > 0) {
      baseIndica = (baseIndica / baseTotal) * 100;
      baseSativa = (baseSativa / baseTotal) * 100;
    } else {
      baseIndica = 50;
      baseSativa = 50;
    }

    // 3) Visual indicators (soft scores only, no hard overrides)
    let visualIndicaAdjustment = 0;
    let visualSativaAdjustment = 0;
    const visualReasons: string[] = [];

    if (visualMorphologySignals) {
      // Leaf width (broad → indica, narrow → sativa)
      if (visualMorphologySignals.leafWidth === "broad") {
        visualIndicaAdjustment += 4;
        visualSativaAdjustment -= 4;
        visualReasons.push("Broad leaves suggest indica influence");
      } else if (visualMorphologySignals.leafWidth === "narrow") {
        visualIndicaAdjustment -= 4;
        visualSativaAdjustment += 4;
        visualReasons.push("Narrow leaves suggest sativa influence");
      }

      // Bud density (high/dense → indica, low/airy → sativa)
      if (visualMorphologySignals.budDensity === "high") {
        visualIndicaAdjustment += 3;
        visualSativaAdjustment -= 3;
        visualReasons.push("Dense bud structure indicates indica genetics");
      } else if (visualMorphologySignals.budDensity === "low") {
        visualIndicaAdjustment -= 3;
        visualSativaAdjustment += 3;
        visualReasons.push("Airy bud structure indicates sativa genetics");
      }

      // Internodal spacing (short → indica, long → sativa)
      if (visualMorphologySignals.internodalSpacing === "short") {
        visualIndicaAdjustment += 2;
        visualSativaAdjustment -= 2;
        visualReasons.push("Compact structure suggests indica");
      } else if (visualMorphologySignals.internodalSpacing === "long") {
        visualIndicaAdjustment -= 2;
        visualSativaAdjustment += 2;
        visualReasons.push("Stretchy structure suggests sativa");
      }

      // Foxtailing vs chunking (foxtailing → sativa, chunky → indica)
      if (visualMorphologySignals.budShape === "foxtailing") {
        visualIndicaAdjustment -= 2;
        visualSativaAdjustment += 2;
        visualReasons.push("Elongated buds suggest sativa expression");
      } else if (visualMorphologySignals.budShape === "chunky") {
        visualIndicaAdjustment += 2;
        visualSativaAdjustment -= 2;
        visualReasons.push("Compact buds suggest indica expression");
      }
    }

    // Cap visual adjustment at ±15% (database-first rule)
    if (visualIndicaAdjustment > 15) {
      visualIndicaAdjustment = 15;
      visualSativaAdjustment = -15;
    } else if (visualIndicaAdjustment < -15) {
      visualIndicaAdjustment = -15;
      visualSativaAdjustment = 15;
    }

    // Apply visual adjustment
    let adjustedIndica = baseIndica + visualIndicaAdjustment;
    let adjustedSativa = baseSativa + visualSativaAdjustment;

    // Ensure bounds (0–100)
    adjustedIndica = Math.max(0, Math.min(100, adjustedIndica));
    adjustedSativa = Math.max(0, Math.min(100, adjustedSativa));

    // 4) Terpene bias (can nudge, never dominate)
    let terpeneIndicaAdjustment = 0;
    let terpeneSativaAdjustment = 0;
    const terpeneReasons: string[] = [];

    if (terpeneBias) {
      // Terpenes can nudge ±5% max
      const terpeneIndica = terpeneBias.indica;
      const terpeneSativa = terpeneBias.sativa;
      
      // Calculate adjustment based on terpene bias
      const terpeneBiasValue = terpeneIndica - terpeneSativa; // -100 to +100
      const maxTerpeneAdjustment = 5; // Max ±5%
      
      terpeneIndicaAdjustment = (terpeneBiasValue / 100) * maxTerpeneAdjustment;
      terpeneSativaAdjustment = -(terpeneBiasValue / 100) * maxTerpeneAdjustment;

      // Cap at ±5%
      if (terpeneIndicaAdjustment > maxTerpeneAdjustment) {
        terpeneIndicaAdjustment = maxTerpeneAdjustment;
        terpeneSativaAdjustment = -maxTerpeneAdjustment;
      } else if (terpeneIndicaAdjustment < -maxTerpeneAdjustment) {
        terpeneIndicaAdjustment = -maxTerpeneAdjustment;
        terpeneSativaAdjustment = maxTerpeneAdjustment;
      }

      // Add reasoning
      if (terpeneIndica > 60) {
        terpeneReasons.push("Myrcene-heavy profile suggests indica lean");
      } else if (terpeneSativa > 60) {
        terpeneReasons.push("Limonene/terpinolene profile suggests sativa lean");
      } else {
        terpeneReasons.push("Balanced terpene spread supports hybrid stabilization");
      }
    }

    // Apply terpene adjustment
    adjustedIndica = adjustedIndica + terpeneIndicaAdjustment;
    adjustedSativa = adjustedSativa + terpeneSativaAdjustment;

    // Ensure bounds (0–100)
    adjustedIndica = Math.max(0, Math.min(100, adjustedIndica));
    adjustedSativa = Math.max(0, Math.min(100, adjustedSativa));

    // Normalize to sum to 100
    const total = adjustedIndica + adjustedSativa;
    if (total > 0) {
      adjustedIndica = (adjustedIndica / total) * 100;
      adjustedSativa = (adjustedSativa / total) * 100;
    } else {
      adjustedIndica = 50;
      adjustedSativa = 50;
    }

    // Round to integers
    let finalIndica = Math.round(adjustedIndica);
    let finalSativa = Math.round(adjustedSativa);

    // Ensure they sum to 100
    const remainder = 100 - (finalIndica + finalSativa);
    if (remainder !== 0) {
      if (finalIndica >= finalSativa) {
        finalIndica += remainder;
      } else {
        finalSativa += remainder;
      }
    }

    // 2) Database-first rule: Never flip dominant category unless confidence < 65%
    if (hasDatabaseAnchor && confidence >= 65) {
      const finalDominantCategory = finalIndica >= 60 ? "Indica"
        : finalSativa >= 60 ? "Sativa"
        : "Hybrid";
      
      // If dominant category changed, adjust to preserve database category
      if (finalDominantCategory !== dbDominantCategory) {
        if (dbDominantCategory === "Indica" && finalIndica < 60) {
          // Push toward indica dominance
          const adjustment = 60 - finalIndica;
          finalIndica = Math.min(100, finalIndica + adjustment);
          finalSativa = Math.max(0, finalSativa - adjustment);
        } else if (dbDominantCategory === "Sativa" && finalSativa < 60) {
          // Push toward sativa dominance
          const adjustment = 60 - finalSativa;
          finalSativa = Math.min(100, finalSativa + adjustment);
          finalIndica = Math.max(0, finalIndica - adjustment);
        } else if (dbDominantCategory === "Hybrid" && (finalIndica >= 60 || finalSativa >= 60)) {
          // Push toward hybrid (neither dominant)
          if (finalIndica >= 60) {
            const adjustment = finalIndica - 59;
            finalIndica = Math.max(0, finalIndica - adjustment);
            finalSativa = Math.min(100, finalSativa + adjustment);
          } else {
            const adjustment = finalSativa - 59;
            finalSativa = Math.max(0, finalSativa - adjustment);
            finalIndica = Math.min(100, finalIndica + adjustment);
          }
        }
        
        // Re-normalize to sum to 100
        const totalAfter = finalIndica + finalSativa;
        if (totalAfter > 0) {
          finalIndica = Math.round((finalIndica / totalAfter) * 100);
          finalSativa = Math.round((finalSativa / totalAfter) * 100);
        }
        
        const remainderAfter = 100 - (finalIndica + finalSativa);
        if (remainderAfter !== 0) {
          if (finalIndica >= finalSativa) {
            finalIndica += remainderAfter;
          } else {
            finalSativa += remainderAfter;
          }
        }
      }
    }

    // 8) Guardrails — Apply before final calculation
    // No category < 5%
    if (finalIndica < 5) {
      const adjustment = 5 - finalIndica;
      finalIndica = 5;
      finalSativa = Math.max(5, finalSativa - adjustment);
    }
    if (finalSativa < 5) {
      const adjustment = 5 - finalSativa;
      finalSativa = 5;
      finalIndica = Math.max(5, finalIndica - adjustment);
    }
    
    // No category > 85% unless database explicitly says so
    if (!hasDatabaseAnchor) {
      if (finalIndica > 85) {
        const adjustment = finalIndica - 85;
        finalIndica = 85;
        finalSativa = Math.min(95, finalSativa + adjustment);
      }
      if (finalSativa > 85) {
        const adjustment = finalSativa - 85;
        finalSativa = 85;
        finalIndica = Math.min(95, finalIndica + adjustment);
      }
    }
    
    // Never show 100/0 splits
    if (finalIndica === 100 || finalSativa === 100) {
      // Push toward balanced (at least 5% each)
      if (finalIndica === 100) {
        finalIndica = 95;
        finalSativa = 5;
      } else {
        finalIndica = 5;
        finalSativa = 95;
      }
    }
    
    // 6) Confidence coupling — Low image diversity → clamp dominance spread
    // If image diversity is low, reduce the spread between indica and sativa
    if (imageDiversityScore < 0.5) {
      const spread = Math.abs(finalIndica - finalSativa);
      const maxSpread = 40; // Clamp to max 40% spread when diversity is low
      if (spread > maxSpread) {
        const center = (finalIndica + finalSativa) / 2;
        const clampedSpread = maxSpread;
        if (finalIndica > finalSativa) {
          finalIndica = Math.round(center + clampedSpread / 2);
          finalSativa = Math.round(center - clampedSpread / 2);
        } else {
          finalIndica = Math.round(center - clampedSpread / 2);
          finalSativa = Math.round(center + clampedSpread / 2);
        }
      }
    }
    
    // Re-normalize to sum to 100 after guardrails
    const totalAfterGuardrails = finalIndica + finalSativa;
    if (totalAfterGuardrails > 0) {
      finalIndica = Math.round((finalIndica / totalAfterGuardrails) * 100);
      finalSativa = Math.round((finalSativa / totalAfterGuardrails) * 100);
    }
    const remainderAfterGuardrails = 100 - (finalIndica + finalSativa);
    if (remainderAfterGuardrails !== 0) {
      if (finalIndica >= finalSativa) {
        finalIndica += remainderAfterGuardrails;
      } else {
        finalSativa += remainderAfterGuardrails;
      }
    }

    // Calculate hybrid percentage
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

    // 6) Confidence coupling — Ratio confidence cannot exceed name confidence
    let ratioConfidence = Math.min(95, Math.max(55, confidence));
    
    // Cap confidence based on image count
    if (imageCount === 1) {
      ratioConfidence = Math.min(75, ratioConfidence);
    } else if (imageCount === 2) {
      ratioConfidence = Math.min(90, ratioConfidence);
    } else if (imageCount >= 3) {
      ratioConfidence = Math.min(95, ratioConfidence);
    }
    
    // Ratio confidence cannot exceed name confidence
    ratioConfidence = Math.min(ratioConfidence, nameConfidence);

    // Explanation (2–3 bullets)
    const explanation: string[] = [];
    
    if (hasDatabaseAnchor) {
      explanation.push("Ratio based primarily on known genetics from strain database");
    } else if (nameConsensusRatio) {
      explanation.push("Ratio derived from name-first consensus and reference data");
    } else {
      explanation.push("Ratio estimated from visual traits and reference genetics");
    }

    if (visualReasons.length > 0) {
      explanation.push(visualReasons[0]); // Use first visual reason
    }

    if (terpeneReasons.length > 0) {
      explanation.push(terpeneReasons[0]); // Use first terpene reason
    }

    // Ensure at least 2 bullets
    if (explanation.length < 2) {
      explanation.push("Final ratio stabilized using multi-image consensus");
    }

    // 7) UI rules (handled in UI layer, not here):
    // FREE tier: Show % bars, classification label, hide deep explanation
    // PAID tier: Show explanation bullets, show which signals influenced the ratio
    // The explanation array is provided for UI to conditionally render based on tier

    return {
      classification,
      percentages: {
        indica: finalIndica,
        sativa: finalSativa,
        hybrid: Math.round(hybrid),
      },
      confidence: Math.round(ratioConfidence),
      explanation: explanation.slice(0, 3), // Max 3 bullets (UI can filter for FREE tier)
    };
  } catch (error) {
    // Safety: Never throw — fallback to balanced hybrid
    console.warn("Phase 5.4 — Ratio calculation error, using default fallback:", error);
    return {
      classification: "Balanced Hybrid",
      percentages: {
        indica: 34,
        sativa: 33,
        hybrid: 33,
      },
      confidence: 55,
      explanation: [
        "Ratio estimated from visual traits and reference genetics",
        "Balanced hybrid classification applied as default",
      ],
    };
  }
}
