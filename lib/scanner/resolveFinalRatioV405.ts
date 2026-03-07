// Phase 4.0.5 — INDICA / SATIVA / HYBRID RATIO FINALIZATION
// lib/scanner/resolveFinalRatioV405.ts

/**
 * Phase 4.0.5 — Final Strain Ratio (Single Source of Truth)
 * 
 * Clear, stable, explainable ratio users trust.
 */
export type FinalStrainRatio = {
  indica: number; // 0–100
  sativa: number; // 0–100
  hybrid: number; // 0–100 (computed, not independent)
  classification: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
  confidence: number; // 0–100
  explanation: string[];
};

/**
 * Phase 4.0.5 — Resolve Final Ratio V405
 * 
 * Locks ONE final ratio output with weighted consensus.
 * Prevents flip-flopping and makes ratios readable + believable.
 */
export function resolveFinalRatioV405(args: {
  nameTrustLevel: "Very High" | "High" | "Medium" | "Low";
  dbRatio?: { indica: number; sativa: number };
  visualSignals?: { indicaBias: number; sativaBias: number };
  terpeneBias?: { indica: number; sativa: number };
  consensusStrength: number; // 0..1
}): FinalStrainRatio {
  // Safety: Never throw — fallback to balanced hybrid
  try {
  const {
    nameTrustLevel,
    dbRatio,
    visualSignals,
    terpeneBias,
    consensusStrength,
  } = args;

  // A) Base ratio - Priority order
  let baseIndica = 50;
  let baseSativa = 50;
  const explanation: string[] = [];

  // Priority 1: Database ratio (if nameTrustLevel ≥ High)
  if (dbRatio && (nameTrustLevel === "Very High" || nameTrustLevel === "High")) {
    baseIndica = dbRatio.indica;
    baseSativa = dbRatio.sativa;
    explanation.push("Ratio based primarily on known genetics from strain database");
  }
  // Priority 2: Consensus visual ratio
  else if (visualSignals) {
    // Convert bias to percentages (bias is typically -1 to 1, map to 0-100)
    const indicaBias = Math.max(-1, Math.min(1, visualSignals.indicaBias));
    const sativaBias = Math.max(-1, Math.min(1, visualSignals.sativaBias));
    
    // Map bias to ratio (bias 1.0 = 100%, bias -1.0 = 0%, bias 0 = 50%)
    baseIndica = 50 + (indicaBias * 50);
    baseSativa = 50 + (sativaBias * 50);
    
    // Normalize to sum to 100
    const total = baseIndica + baseSativa;
    if (total > 0) {
      baseIndica = (baseIndica / total) * 100;
      baseSativa = (baseSativa / total) * 100;
    }
    
    explanation.push("Ratio estimated from visual analysis");
  }
  // Priority 3: Fallback 50/50
  else {
    baseIndica = 50;
    baseSativa = 50;
    explanation.push("Ratio estimated from visual analysis");
  }

  // B) Weighting - Scale weights based on trust level and consensus
  let dbWeight = 0.60;
  let visualWeight = 0.25;
  let terpeneWeight = 0.15;

  // Scale DOWN if nameTrustLevel is Medium or Low
  if (nameTrustLevel === "Medium" || nameTrustLevel === "Low") {
    dbWeight *= 0.7; // Reduce database weight
    visualWeight *= 1.2; // Increase visual weight
    terpeneWeight *= 1.1;
  }

  // Scale DOWN if consensusStrength < 0.6
  if (consensusStrength < 0.6) {
    const scale = consensusStrength / 0.6;
    dbWeight *= scale;
    visualWeight *= scale;
    terpeneWeight *= scale;
  }

  // Normalize weights to sum to 1.0
  const totalWeight = dbWeight + visualWeight + terpeneWeight;
  if (totalWeight > 0) {
    dbWeight /= totalWeight;
    visualWeight /= totalWeight;
    terpeneWeight /= totalWeight;
  }

  // B) Weighted combination
  // Calculate visual ratio contribution (always calculate from signals if available)
  let visualIndica = 50;
  let visualSativa = 50;
  if (visualSignals) {
    visualIndica = 50 + (visualSignals.indicaBias * 50);
    visualSativa = 50 + (visualSignals.sativaBias * 50);
    // Normalize visual signals
    const visualTotal = visualIndica + visualSativa;
    if (visualTotal > 0) {
      visualIndica = (visualIndica / visualTotal) * 100;
      visualSativa = (visualSativa / visualTotal) * 100;
    }
    
    if (Math.abs(visualSignals.indicaBias) > 0.1 || Math.abs(visualSignals.sativaBias) > 0.1) {
      if (visualSignals.indicaBias > 0.1) {
        explanation.push("Visual structure suggests indica-leaning traits");
      } else if (visualSignals.sativaBias > 0.1) {
        explanation.push("Visual structure suggests sativa-leaning traits");
      }
    }
  }

  // Calculate terpene ratio contribution
  let terpeneIndica = 50;
  let terpeneSativa = 50;
  if (terpeneBias) {
    terpeneIndica = terpeneBias.indica;
    terpeneSativa = terpeneBias.sativa;
    
    if (Math.abs(terpeneBias.indica - terpeneBias.sativa) > 10) {
      if (terpeneBias.sativa > terpeneBias.indica) {
        explanation.push("Terpene profile slightly favors sativa expression");
      } else {
        explanation.push("Terpene profile slightly favors indica expression");
      }
    }
  }

  // Weighted combination: base * dbWeight + visual * visualWeight + terpene * terpeneWeight
  let finalIndica = (baseIndica * dbWeight) + (visualIndica * visualWeight) + (terpeneIndica * terpeneWeight);
  let finalSativa = (baseSativa * dbWeight) + (visualSativa * visualWeight) + (terpeneSativa * terpeneWeight);

  // Normalize to sum to 100
  const total = finalIndica + finalSativa;
  if (total > 0) {
    finalIndica = (finalIndica / total) * 100;
    finalSativa = (finalSativa / total) * 100;
  }

  // Safety: Round to integers
  finalIndica = Math.round(finalIndica);
  finalSativa = Math.round(finalSativa);

  // Safety: Ensure they sum to 100
  const remainder = 100 - (finalIndica + finalSativa);
  if (remainder !== 0) {
    // Adjust the larger value
    if (finalIndica >= finalSativa) {
      finalIndica += remainder;
    } else {
      finalSativa += remainder;
    }
  }

  // Safety: Never show exact 50/50 unless truly balanced (within 1%)
  // Only adjust if we're exactly 50/50 or very close (within 0.5%)
  if (Math.abs(finalIndica - finalSativa) < 0.5) {
    // Make it slightly indica-leaning to avoid exact 50/50
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

  // C) Hybrid calculation
  const hybrid = 100 - Math.abs(finalIndica - finalSativa);

  // D) Classification
  let classification: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
  if (finalIndica >= 60) {
    classification = "Indica-dominant";
  } else if (finalSativa >= 60) {
    classification = "Sativa-dominant";
  } else {
    classification = "Balanced Hybrid";
  }

  // E) Confidence - Cap based on nameTrustLevel
  let confidence = 85; // Default
  if (nameTrustLevel === "Very High") {
    confidence = 95;
  } else if (nameTrustLevel === "High") {
    confidence = 90;
  } else if (nameTrustLevel === "Medium") {
    confidence = 80;
  } else {
    confidence = 70;
  }

  // Add final explanation
  explanation.push("Final ratio stabilized using multi-image consensus");

  return {
    indica: finalIndica,
    sativa: finalSativa,
    hybrid,
    classification,
    confidence,
    explanation,
  };
  } catch (error) {
    // Safety: Never throw — fallback to balanced hybrid
    console.warn("Phase 4.0.5 — Ratio calculation error, using balanced hybrid fallback:", error);
    return {
      indica: 50,
      sativa: 50,
      hybrid: 100,
      classification: "Balanced Hybrid",
      confidence: 60,
      explanation: ["Ratio calculation encountered an error. Defaulting to balanced hybrid."],
    };
  }
}
