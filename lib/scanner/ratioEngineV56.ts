// lib/scanner/ratioEngineV56.ts
// Phase 5.6 — Indica / Sativa / Hybrid Ratio Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NormalizedTerpeneProfile } from "./terpeneExperienceEngine";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 5.6 — Ratio Result
 */
export type StrainRatioV56 = {
  strainType: string; // "Hybrid (Indica-leaning)" or "Indica" or "Sativa"
  indicaPercent: number; // 0-100
  sativaPercent: number; // 0-100
  estimatedRatio: string; // "65% Indica / 35% Sativa"
  confidence: "high" | "medium" | "low";
  why: string[]; // Explanation bullets
  source: "database_baseline" | "database_visual" | "database_visual_terpene" | "database_visual_terpene_consensus" | "default";
};

/**
 * Phase 5.6 Step 5.6.1 — BASELINE RATIO FROM DATABASE
 * 
 * From the 35,000-strain dataset:
 * - Each canonical strain has:
 *   - indicaPercent
 *   - sativaPercent
 *   - hybridType (balanced / indica-leaning / sativa-leaning)
 * 
 * This is the **genetic baseline**, not final output.
 */
function getBaselineRatioFromDatabase(
  strainName: string,
  dbEntry?: CultivarReference
): { indicaPercent: number; sativaPercent: number; hybridType: "balanced" | "indica-leaning" | "sativa-leaning" | null; reasoning: string } | null {
  if (!dbEntry) {
    return null;
  }

  // Phase 5.6.1 — Get type from database
  const dbType = dbEntry.type || dbEntry.dominantType;
  
  // Phase 5.6.1 — Derive baseline ratio from type
  let indicaPercent: number;
  let sativaPercent: number;
  let hybridType: "balanced" | "indica-leaning" | "sativa-leaning" | null = null;
  let reasoning: string;

  if (dbType === "Indica") {
    indicaPercent = 70;
    sativaPercent = 30;
    hybridType = "indica-leaning";
    reasoning = `Database baseline: ${strainName} is Indica-dominant (70% Indica / 30% Sativa)`;
  } else if (dbType === "Sativa") {
    indicaPercent = 30;
    sativaPercent = 70;
    hybridType = "sativa-leaning";
    reasoning = `Database baseline: ${strainName} is Sativa-dominant (30% Indica / 70% Sativa)`;
  } else if (dbType === "Hybrid") {
    // Phase 5.6.1 — Try to infer if indica-leaning or sativa-leaning from genetics
    const genetics = dbEntry.genetics || "";
    const geneticsLower = genetics.toLowerCase();
    
    if (geneticsLower.includes("indica") && !geneticsLower.includes("sativa")) {
      indicaPercent = 60;
      sativaPercent = 40;
      hybridType = "indica-leaning";
      reasoning = `Database baseline: ${strainName} is an Indica-leaning Hybrid (60% Indica / 40% Sativa)`;
    } else if (geneticsLower.includes("sativa") && !geneticsLower.includes("indica")) {
      indicaPercent = 40;
      sativaPercent = 60;
      hybridType = "sativa-leaning";
      reasoning = `Database baseline: ${strainName} is a Sativa-leaning Hybrid (40% Indica / 60% Sativa)`;
    } else {
      indicaPercent = 50;
      sativaPercent = 50;
      hybridType = "balanced";
      reasoning = `Database baseline: ${strainName} is a Balanced Hybrid (50% Indica / 50% Sativa)`;
    }
  } else {
    return null;
  }

  return {
    indicaPercent,
    sativaPercent,
    hybridType,
    reasoning,
  };
}

/**
 * Phase 5.6 Step 5.6.2 — VISUAL PHENOTYPE MODIFIERS
 * 
 * Adjust baseline using image signals:
 * - Bud density & structure
 * - Leaf width
 * - Internode spacing
 * - Calyx stacking
 * - Trichome distribution
 * 
 * Examples:
 * - Dense, squat, broad-leaf → indica +5–12%
 * - Airy, elongated, narrow-leaf → sativa +5–12%
 */
function applyVisualPhenotypeModifiers(
  baselineIndica: number,
  fusedFeatures?: FusedFeatures
): { adjustment: number; reasoning: string[] } {
  if (!fusedFeatures) {
    return { adjustment: 0, reasoning: [] };
  }

  let netAdjustment = 0;
  const reasoning: string[] = [];

  // Phase 5.6.2 — Bud density & structure
  if (fusedFeatures.budStructure === "high") {
    // Dense, squat → indica +5–12%
    netAdjustment += 8; // +8% Indica
    reasoning.push("Dense bud structure suggests indica genetics");
  } else if (fusedFeatures.budStructure === "low") {
    // Airy, elongated → sativa +5–12%
    netAdjustment -= 8; // -8% Indica (more Sativa)
    reasoning.push("Airy bud structure suggests sativa genetics");
  }

  // Phase 5.6.2 — Leaf width
  if (fusedFeatures.leafShape === "broad") {
    // Broad-leaf → indica
    netAdjustment += 4; // +4% Indica
    reasoning.push("Broad leaf morphology indicates indica influence");
  } else if (fusedFeatures.leafShape === "narrow") {
    // Narrow-leaf → sativa
    netAdjustment -= 4; // -4% Indica (more Sativa)
    reasoning.push("Narrow leaf morphology indicates sativa influence");
  }

  // Phase 5.6.2 — Trichome distribution (high density can favor indica slightly)
  if (fusedFeatures.trichomeDensity === "high") {
    // High trichome density slightly favors indica (but can vary)
    netAdjustment += 2; // +2% Indica
    reasoning.push("High trichome density suggests indica-leaning structure");
  }

  // Phase 5.6.2 — Cap adjustment at ±12%
  if (netAdjustment > 12) netAdjustment = 12;
  if (netAdjustment < -12) netAdjustment = -12;

  // Phase 5.6.2 — Ensure we don't exceed bounds (20-80%)
  const adjustedIndica = baselineIndica + netAdjustment;
  if (adjustedIndica < 20) {
    netAdjustment = 20 - baselineIndica; // Cap at 20% minimum
  } else if (adjustedIndica > 80) {
    netAdjustment = 80 - baselineIndica; // Cap at 80% maximum
  }

  return {
    adjustment: Math.round(netAdjustment * 10) / 10,
    reasoning: reasoning.length > 0 ? reasoning : [],
  };
}

/**
 * Phase 5.6 Step 5.6.3 — EFFECT & TERPENE CROSS-CHECK
 * 
 * Validate against:
 * - Dominant terpenes
 *   - Myrcene → indica bias
 *   - Limonene / Terpinolene → sativa bias
 * - Reported effects from consensus engine
 *   - Body-heavy → indica
 *   - Cerebral / energetic → sativa
 * 
 * If effects contradict visuals:
 * - Reduce confidence
 * - Tighten ratio spread
 */
function crossCheckWithTerpenesAndEffects(
  currentIndica: number,
  terpeneProfile?: NormalizedTerpeneProfile,
  imageResults?: ImageResult[]
): {
  adjustment: number;
  confidencePenalty: number;
  reasoning: string[];
} {
  let netAdjustment = 0;
  let confidencePenalty = 0;
  const reasoning: string[] = [];

  // Phase 5.6.3 — Terpene cross-check
  if (terpeneProfile && terpeneProfile.primaryTerpenes.length > 0) {
    const primaryTerpenes = terpeneProfile.primaryTerpenes.map(t => t.name.toLowerCase());
    
    // Indica-leaning terpenes
    const indicaTerpenes = ["myrcene", "caryophyllene", "linalool"];
    const indicaTerpeneCount = primaryTerpenes.filter(t => indicaTerpenes.includes(t)).length;
    
    // Sativa-leaning terpenes
    const sativaTerpenes = ["limonene", "terpinolene", "pinene"];
    const sativaTerpeneCount = primaryTerpenes.filter(t => sativaTerpenes.includes(t)).length;
    
    if (indicaTerpeneCount > sativaTerpeneCount) {
      // Myrcene-dominant → indica bias
      netAdjustment += 3; // +3% Indica
      reasoning.push(`Myrcene-dominant terpene profile suggests indica bias`);
    } else if (sativaTerpeneCount > indicaTerpeneCount) {
      // Limonene / Terpinolene → sativa bias
      netAdjustment -= 3; // -3% Indica (more Sativa)
      reasoning.push(`Limonene/Terpinolene-dominant terpene profile suggests sativa bias`);
    }
  }

  // Phase 5.6.3 — Effect cross-check from image results
  if (imageResults && imageResults.length > 0) {
    const allEffects: string[] = [];
    imageResults.forEach(result => {
      if (result.wikiResult?.experience?.effects) {
        allEffects.push(...result.wikiResult.experience.effects);
      }
    });

    const effectsStr = allEffects.join(" ").toLowerCase();
    
    // Body-heavy → indica
    const bodyHeavyIndicators = ["relaxation", "sedation", "body", "sleep", "couch", "calming"];
    const bodyHeavyCount = bodyHeavyIndicators.filter(indicator => effectsStr.includes(indicator)).length;
    
    // Cerebral / energetic → sativa
    const cerebralIndicators = ["euphoria", "creativity", "uplifted", "focused", "energy", "cerebral", "energetic"];
    const cerebralCount = cerebralIndicators.filter(indicator => effectsStr.includes(indicator)).length;
    
    if (bodyHeavyCount > cerebralCount) {
      // Body-heavy → indica
      netAdjustment += 2; // +2% Indica
      reasoning.push(`Body-heavy effects suggest indica influence`);
    } else if (cerebralCount > bodyHeavyCount) {
      // Cerebral / energetic → sativa
      netAdjustment -= 2; // -2% Indica (more Sativa)
      reasoning.push(`Cerebral/energetic effects suggest sativa influence`);
    }

    // Phase 5.6.3 — Check for contradictions
    // If visual suggests indica but effects suggest sativa (or vice versa), reduce confidence
    const visualSuggestsIndica = currentIndica > 50;
    const effectsSuggestIndica = bodyHeavyCount > cerebralCount;
    
    if (visualSuggestsIndica !== effectsSuggestIndica) {
      confidencePenalty += 5; // Reduce confidence by 5% if contradiction
      reasoning.push(`Visual traits and effects show some contradiction`);
    }
  }

  // Phase 5.6.3 — Cap adjustment at ±5% (terpenes/effects are validation, not primary)
  if (netAdjustment > 5) netAdjustment = 5;
  if (netAdjustment < -5) netAdjustment = -5;

  // Phase 5.6.3 — Ensure bounds
  const adjustedIndica = currentIndica + netAdjustment;
  if (adjustedIndica < 20) {
    netAdjustment = 20 - currentIndica;
  } else if (adjustedIndica > 80) {
    netAdjustment = 80 - currentIndica;
  }

  return {
    adjustment: Math.round(netAdjustment * 10) / 10,
    confidencePenalty,
    reasoning: reasoning.length > 0 ? reasoning : [],
  };
}

/**
 * Phase 5.6 Step 5.6.4 — MULTI-IMAGE CONSENSUS ADJUSTMENT
 * 
 * Across images:
 * - Average ratio shifts
 * - Penalize outlier images
 * - Boost traits that appear consistently
 * 
 * Result:
 * - One final stabilized ratio
 */
function applyMultiImageConsensusV56(
  currentIndica: number,
  imageResults?: ImageResult[]
): {
  adjustment: number;
  confidence: "high" | "medium" | "low";
  reasoning: string[];
} {
  if (!imageResults || imageResults.length <= 1) {
    return {
      adjustment: 0,
      confidence: "medium",
      reasoning: [],
    };
  }

  // Phase 5.6.4 — Collect ratio estimates from each image
  const imageRatios: Array<{ indicaPercent: number; confidence: number }> = [];

  imageResults.forEach(result => {
    const wikiDominance = result.wikiResult?.genetics?.dominance;
    if (wikiDominance && wikiDominance !== "Unknown") {
      let indicaPercent = 50; // Default
      if (wikiDominance === "Indica") {
        indicaPercent = 70;
      } else if (wikiDominance === "Sativa") {
        indicaPercent = 30;
      }
      
      const imageConfidence = result.candidateStrains[0]?.confidence || 70;
      imageRatios.push({
        indicaPercent,
        confidence: imageConfidence,
      });
    }
  });

  if (imageRatios.length === 0) {
    return {
      adjustment: 0,
      confidence: "medium",
      reasoning: [],
    };
  }

  // Phase 5.6.4 — Calculate weighted average
  const totalWeight = imageRatios.reduce((sum, r) => sum + r.confidence, 0);
  const avgIndica = imageRatios.reduce((sum, r) => sum + (r.indicaPercent * r.confidence), 0) / totalWeight;

  // Phase 5.6.4 — Calculate variance to detect outliers
  const variance = imageRatios.reduce((sum, r) => {
    const diff = r.indicaPercent - avgIndica;
    return sum + (diff * diff * r.confidence);
  }, 0) / totalWeight;
  const stdDev = Math.sqrt(variance);

  // Phase 5.6.4 — Net adjustment
  let netAdjustment = avgIndica - currentIndica;

  // Phase 5.6.4 — Penalize outlier images (high variance)
  if (stdDev > 15) {
    // High variance: reduce adjustment by 50% (penalize outliers)
    netAdjustment *= 0.5;
  }

  // Phase 5.6.4 — Boost consistent traits (low variance + 3+ images)
  const isConsistent = stdDev < 8;
  if (isConsistent && imageResults.length >= 3) {
    // Very consistent: slight boost
    netAdjustment *= 1.1;
  }

  // Phase 5.6.4 — Cap adjustment at ±5%
  if (netAdjustment > 5) netAdjustment = 5;
  if (netAdjustment < -5) netAdjustment = -5;

  // Phase 5.6.4 — Determine confidence
  let confidence: "high" | "medium" | "low";
  if (isConsistent && imageResults.length >= 3) {
    confidence = "high";
  } else if (stdDev < 15 && imageResults.length >= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  const reasoning: string[] = [];
  if (imageResults.length >= 2) {
    reasoning.push(`Consistent across ${imageResults.length} images`);
  }
  if (isConsistent) {
    reasoning.push(`Low variance (${stdDev.toFixed(1)}% std dev) indicates stable ratio`);
  } else if (stdDev > 15) {
    reasoning.push(`High variance (${stdDev.toFixed(1)}% std dev) suggests some uncertainty`);
  }

  return {
    adjustment: Math.round(netAdjustment * 10) / 10,
    confidence,
    reasoning,
  };
}

/**
 * Phase 5.6 — MAIN FUNCTION
 */
export function resolveStrainRatioV56(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: NormalizedTerpeneProfile
): StrainRatioV56 {
  // Phase 5.6.1 — BASELINE RATIO FROM DATABASE
  const baseline = getBaselineRatioFromDatabase(strainName, dbEntry);
  
  if (!baseline) {
    // Failsafe: Return balanced hybrid
    console.warn(`Phase 5.6.1 — No baseline found for "${strainName}", using balanced hybrid default`);
    return {
      strainType: "Hybrid (Balanced)",
      indicaPercent: 50,
      sativaPercent: 50,
      estimatedRatio: "50% Indica / 50% Sativa",
      confidence: "low",
      why: [`No genetic data available for ${strainName}. Defaulting to balanced hybrid.`],
      source: "default",
    };
  }

  let currentIndica = baseline.indicaPercent;
  const why: string[] = [baseline.reasoning];

  // Phase 5.6.2 — VISUAL PHENOTYPE MODIFIERS
  const visualModifiers = applyVisualPhenotypeModifiers(currentIndica, fusedFeatures);
  if (visualModifiers.adjustment !== 0) {
    currentIndica += visualModifiers.adjustment;
    why.push(...visualModifiers.reasoning);
  }

  // Phase 5.6.3 — EFFECT & TERPENE CROSS-CHECK
  const terpeneEffectCheck = crossCheckWithTerpenesAndEffects(currentIndica, terpeneProfile, imageResults);
  if (terpeneEffectCheck.adjustment !== 0) {
    currentIndica += terpeneEffectCheck.adjustment;
    why.push(...terpeneEffectCheck.reasoning);
  }

  // Phase 5.6.4 — MULTI-IMAGE CONSENSUS ADJUSTMENT
  const consensus = applyMultiImageConsensusV56(currentIndica, imageResults);
  if (consensus.adjustment !== 0) {
    currentIndica += consensus.adjustment;
    why.push(...consensus.reasoning);
  }

  // Phase 5.6.5 — FINAL OUTPUT FORMAT: Ensure ratio sums to 100%, clamp to 20-80%
  currentIndica = Math.max(20, Math.min(80, Math.round(currentIndica * 10) / 10));
  const currentSativa = Math.round((100 - currentIndica) * 10) / 10;

  // Phase 5.6.5 — Determine strain type and hybrid type
  let strainType: string;
  if (currentIndica >= 60) {
    strainType = "Indica";
  } else if (currentSativa >= 60) {
    strainType = "Sativa";
  } else {
    // Hybrid
    if (currentIndica > currentSativa) {
      strainType = "Hybrid (Indica-leaning)";
    } else if (currentSativa > currentIndica) {
      strainType = "Hybrid (Sativa-leaning)";
    } else {
      strainType = "Hybrid (Balanced)";
    }
  }

  // Phase 5.6.5 — Estimated ratio string
  const estimatedRatio = `${currentIndica}% Indica / ${currentSativa}% Sativa`;

  // Phase 5.6.5 — Final confidence (apply penalty from terpene/effect check)
  let finalConfidence = consensus.confidence;
  if (terpeneEffectCheck.confidencePenalty > 0) {
    // Reduce confidence if contradictions detected
    if (finalConfidence === "high") {
      finalConfidence = "medium";
    } else if (finalConfidence === "medium") {
      finalConfidence = "low";
    }
  }

  // Phase 5.6.5 — Determine source
  let source: StrainRatioV56["source"];
  if (consensus.adjustment !== 0 && terpeneEffectCheck.adjustment !== 0 && visualModifiers.adjustment !== 0) {
    source = "database_visual_terpene_consensus";
  } else if (terpeneEffectCheck.adjustment !== 0 && visualModifiers.adjustment !== 0) {
    source = "database_visual_terpene";
  } else if (visualModifiers.adjustment !== 0) {
    source = "database_visual";
  } else {
    source = "database_baseline";
  }

  // Phase 5.6.5 — Add image count to explanation if multiple images
  if (imageCount > 1) {
    why.push(`Consistent across ${imageCount} images`);
  }

  return {
    strainType,
    indicaPercent: Math.round(currentIndica),
    sativaPercent: Math.round(currentSativa),
    estimatedRatio,
    confidence: finalConfidence,
    why,
    source,
  };
}
