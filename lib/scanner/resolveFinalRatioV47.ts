// Phase 4.7.1 — Multi-Source Ratio Engine (Locked)
// lib/scanner/resolveFinalRatioV47.ts

import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";
import { getStrainFamily } from "./strainFamilyMap";

/**
 * Phase 4.7.1 — Multi-Source Ratio Result
 */
export type FinalStrainRatioV47 = {
  indicaPercent: number; // 0–100
  sativaPercent: number; // 0–100
  hybridPercent: number; // 0–100 (computed)
  dominanceLabel: string; // e.g., "Indica-leaning Hybrid", "Sativa-dominant", "Balanced Hybrid"
  confidence: number; // 0–100
  sourceBreakdown: {
    genetics: { indica: number; sativa: number; weight: number };
    familyBaseline: { indica: number; sativa: number; weight: number };
    visualMorphology: { indica: number; sativa: number; weight: number };
    terpeneBias: { indica: number; sativa: number; weight: number };
    nameConsensus: { indica: number; sativa: number; weight: number };
  };
};

/**
 * Phase 4.7.1 — Get genetics/lineage ratio from database
 * Weight: 40% (highest)
 */
function getGeneticsRatio(
  strainName: string,
  dbEntry?: CultivarReference
): { indica: number; sativa: number; weight: number } {
  const weight = 0.40; // 40% weight (highest)
  
  if (dbEntry) {
    // Use database ratio if available (check both type and any additional fields)
    const dbEntryAny = dbEntry as any;
    if (dbEntryAny.indicaPercent !== undefined && dbEntryAny.sativaPercent !== undefined) {
      return {
        indica: dbEntryAny.indicaPercent,
        sativa: dbEntryAny.sativaPercent,
        weight,
      };
    }
    
    // Infer from type
    if (dbEntry.type === "Indica") {
      return { indica: 80, sativa: 20, weight };
    } else if (dbEntry.type === "Sativa") {
      return { indica: 20, sativa: 80, weight };
    } else {
      // Hybrid - infer from genetics if available
      if (dbEntry.genetics) {
        // Try to parse parents and infer
        const parents = dbEntry.genetics.split(/[×x/]/).map(p => p.trim());
        // Simple heuristic: if parents suggest indica/sativa, use that
        // Default to balanced hybrid
        return { indica: 50, sativa: 50, weight };
      }
    }
  }
  
  // Fallback: balanced hybrid
  return { indica: 50, sativa: 50, weight };
}

/**
 * Phase 4.7.1 — Get strain family baseline ratio
 * Weight: 20%
 * Uses average ratio of strains in the same family
 */
function getFamilyBaselineRatio(
  strainName: string,
  dbEntry?: CultivarReference
): { indica: number; sativa: number; weight: number } {
  const weight = 0.20; // 20% weight
  
  try {
    const family = getStrainFamily(strainName);
    if (!family || family.siblingStrains.length < 2) {
      // No family or family too small
      return { indica: 50, sativa: 50, weight };
    }
    
    // Calculate average ratio from family members
    let totalIndica = 0;
    let totalSativa = 0;
    let count = 0;
    
    for (const siblingName of family.siblingStrains) {
      const sibling = CULTIVAR_LIBRARY.find(s => s.name === siblingName);
      if (sibling) {
        const siblingAny = sibling as any;
        if (siblingAny.indicaPercent !== undefined && siblingAny.sativaPercent !== undefined) {
          totalIndica += siblingAny.indicaPercent;
          totalSativa += siblingAny.sativaPercent;
          count++;
        } else if (sibling.type === "Indica") {
          totalIndica += 80;
          totalSativa += 20;
          count++;
        } else if (sibling.type === "Sativa") {
          totalIndica += 20;
          totalSativa += 80;
          count++;
        } else {
          // Hybrid - use balanced
          totalIndica += 50;
          totalSativa += 50;
          count++;
        }
      }
    }
    
    if (count > 0) {
      return {
        indica: Math.round(totalIndica / count),
        sativa: Math.round(totalSativa / count),
        weight,
      };
    }
  } catch (error) {
    console.warn("Phase 4.7.1 — Family baseline calculation error:", error);
  }
  
  // Fallback: balanced hybrid
  return { indica: 50, sativa: 50, weight };
}

/**
 * Phase 4.7.1 — Get visual morphology signals
 * Weight: 15%
 */
function getVisualMorphologyRatio(
  visualSignals?: {
    leafShape?: "narrow" | "broad";
    budStructure?: "low" | "medium" | "high";
    trichomeDensity?: "low" | "medium" | "high";
  }
): { indica: number; sativa: number; weight: number } {
  const weight = 0.15; // 15% weight
  
  if (!visualSignals) {
    return { indica: 50, sativa: 50, weight };
  }
  
  let indicaScore = 0;
  let sativaScore = 0;
  let signalCount = 0;
  
  // Leaf shape
  if (visualSignals.leafShape === "broad") {
    indicaScore += 70;
    sativaScore += 30;
    signalCount++;
  } else if (visualSignals.leafShape === "narrow") {
    indicaScore += 30;
    sativaScore += 70;
    signalCount++;
  }
  
  // Bud structure (dense = indica, airy = sativa)
  if (visualSignals.budStructure === "high") {
    indicaScore += 65;
    sativaScore += 35;
    signalCount++;
  } else if (visualSignals.budStructure === "low") {
    indicaScore += 35;
    sativaScore += 65;
    signalCount++;
  }
  
  // Trichome density (high = indica, moderate = sativa)
  if (visualSignals.trichomeDensity === "high") {
    indicaScore += 60;
    sativaScore += 40;
    signalCount++;
  } else if (visualSignals.trichomeDensity === "low") {
    indicaScore += 40;
    sativaScore += 60;
    signalCount++;
  }
  
  if (signalCount > 0) {
    return {
      indica: Math.round(indicaScore / signalCount),
      sativa: Math.round(sativaScore / signalCount),
      weight,
    };
  }
  
  // Fallback: balanced hybrid
  return { indica: 50, sativa: 50, weight };
}

/**
 * Phase 4.7.1 — Get terpene profile bias
 * Weight: 15%
 */
function getTerpeneBiasRatio(
  terpeneProfile?: string[] | Array<{ name: string; likelihood?: string }>
): { indica: number; sativa: number; weight: number } {
  const weight = 0.15; // 15% weight
  
  if (!terpeneProfile || terpeneProfile.length === 0) {
    return { indica: 50, sativa: 50, weight };
  }
  
  // Indica-leaning terpenes
  const indicaTerpenes = ["myrcene", "caryophyllene", "linalool"];
  // Sativa-leaning terpenes
  const sativaTerpenes = ["limonene", "terpinolene", "pinene"];
  
  let indicaScore = 0;
  let sativaScore = 0;
  let totalScore = 0;
  
  for (const terpene of terpeneProfile) {
    const name = typeof terpene === "string" ? terpene : terpene.name;
    const terpeneLower = name.toLowerCase();
    const dominance = typeof terpene === "object" && terpene.likelihood 
      ? (terpene.likelihood === "high" ? 2 : terpene.likelihood === "medium" ? 1.5 : 1)
      : 1;
    
    if (indicaTerpenes.some(t => terpeneLower.includes(t))) {
      indicaScore += dominance;
      totalScore += dominance;
    } else if (sativaTerpenes.some(t => terpeneLower.includes(t))) {
      sativaScore += dominance;
      totalScore += dominance;
    }
  }
  
  if (totalScore > 0) {
    const indicaPercent = (indicaScore / totalScore) * 100;
    const sativaPercent = (sativaScore / totalScore) * 100;
    
    // Clamp to reasonable range (20-80%)
    const clampedIndica = Math.max(20, Math.min(80, indicaPercent));
    const clampedSativa = 100 - clampedIndica;
    
    return {
      indica: Math.round(clampedIndica),
      sativa: Math.round(clampedSativa),
      weight,
    };
  }
  
  // Fallback: balanced hybrid
  return { indica: 50, sativa: 50, weight };
}

/**
 * Phase 4.7.1 — Get name consensus bias
 * Weight: 10%
 * Uses ratio from top candidate strains in name-first matching
 */
function getNameConsensusRatio(
  candidateStrains?: Array<{ name: string; confidence: number }>,
  dbEntry?: CultivarReference
): { indica: number; sativa: number; weight: number } {
  const weight = 0.10; // 10% weight (lowest)
  
  if (!candidateStrains || candidateStrains.length === 0) {
    // Fallback to database entry if available
    if (dbEntry) {
      const dbEntryAny = dbEntry as any;
      if (dbEntryAny.indicaPercent !== undefined && dbEntryAny.sativaPercent !== undefined) {
        return {
          indica: dbEntryAny.indicaPercent,
          sativa: dbEntryAny.sativaPercent,
          weight,
        };
      }
    }
    return { indica: 50, sativa: 50, weight };
  }
  
  // Calculate weighted average from top candidates
  let totalIndica = 0;
  let totalSativa = 0;
  let totalWeight = 0;
  
  // Use top 3 candidates
  const topCandidates = candidateStrains.slice(0, 3);
  
  for (const candidate of topCandidates) {
    const candidateEntry = CULTIVAR_LIBRARY.find(s => 
      s.name === candidate.name || s.aliases.includes(candidate.name)
    );
    
    if (candidateEntry) {
      const candidateWeight = candidate.confidence / 100; // Normalize confidence to 0-1
      const candidateEntryAny = candidateEntry as any;
      
      if (candidateEntryAny.indicaPercent !== undefined && candidateEntryAny.sativaPercent !== undefined) {
        totalIndica += candidateEntryAny.indicaPercent * candidateWeight;
        totalSativa += candidateEntryAny.sativaPercent * candidateWeight;
        totalWeight += candidateWeight;
      } else if (candidateEntry.type === "Indica") {
        totalIndica += 80 * candidateWeight;
        totalSativa += 20 * candidateWeight;
        totalWeight += candidateWeight;
      } else if (candidateEntry.type === "Sativa") {
        totalIndica += 20 * candidateWeight;
        totalSativa += 80 * candidateWeight;
        totalWeight += candidateWeight;
      } else {
        // Hybrid
        totalIndica += 50 * candidateWeight;
        totalSativa += 50 * candidateWeight;
        totalWeight += candidateWeight;
      }
    }
  }
  
  if (totalWeight > 0) {
    return {
      indica: Math.round(totalIndica / totalWeight),
      sativa: Math.round(totalSativa / totalWeight),
      weight,
    };
  }
  
  // Fallback: balanced hybrid
  return { indica: 50, sativa: 50, weight };
}

/**
 * Phase 4.7.1 — Generate dominance label
 * Creates nuanced labels like "Indica-leaning Hybrid", "Sativa-dominant", etc.
 */
function generateDominanceLabel(
  indica: number,
  sativa: number,
  hybrid: number
): string {
  // Pure or near-pure
  if (indica >= 90) {
    return "Indica-dominant";
  }
  if (sativa >= 90) {
    return "Sativa-dominant";
  }
  
  // Strong dominance (70-89%)
  if (indica >= 70) {
    if (hybrid >= 20) {
      return "Indica-leaning Hybrid";
    }
    return "Indica-dominant";
  }
  if (sativa >= 70) {
    if (hybrid >= 20) {
      return "Sativa-leaning Hybrid";
    }
    return "Sativa-dominant";
  }
  
  // Moderate dominance (60-69%)
  if (indica >= 60) {
    return "Indica-leaning Hybrid";
  }
  if (sativa >= 60) {
    return "Sativa-leaning Hybrid";
  }
  
  // Balanced (40-59% each)
  if (indica >= 40 && sativa >= 40) {
    return "Balanced Hybrid";
  }
  
  // Slight lean (one is 50-59%, other is 30-49%)
  if (indica > sativa && indica < 60) {
    return "Indica-leaning Hybrid";
  }
  if (sativa > indica && sativa < 60) {
    return "Sativa-leaning Hybrid";
  }
  
  // Default
  return "Balanced Hybrid";
}

/**
 * Phase 4.7.1 — Multi-Source Ratio Engine (Locked)
 * 
 * Combines multiple sources with weighted approach:
 * - Genetics/lineage (DB): 40%
 * - Strain family baseline: 20%
 * - Visual morphology: 15%
 * - Terpene profile bias: 15%
 * - Name consensus bias: 10%
 */
export function resolveFinalRatioV47(args: {
  strainName: string;
  dbEntry?: CultivarReference;
  visualSignals?: {
    leafShape?: "narrow" | "broad";
    budStructure?: "low" | "medium" | "high";
    trichomeDensity?: "low" | "medium" | "high";
  };
  terpeneProfile?: string[] | Array<{ name: string; likelihood?: string }>;
  candidateStrains?: Array<{ name: string; confidence: number }>;
  overallConfidence?: number; // 0-100
}): FinalStrainRatioV47 {
  const {
    strainName,
    dbEntry,
    visualSignals,
    terpeneProfile,
    candidateStrains,
    overallConfidence = 75,
  } = args;
  
  try {
    // Get all source ratios
    const genetics = getGeneticsRatio(strainName, dbEntry);
    const familyBaseline = getFamilyBaselineRatio(strainName, dbEntry);
    const visualMorphology = getVisualMorphologyRatio(visualSignals);
    const terpeneBias = getTerpeneBiasRatio(terpeneProfile);
    const nameConsensus = getNameConsensusRatio(candidateStrains, dbEntry);
    
    // Weighted combination
    let weightedIndica = 
      (genetics.indica * genetics.weight) +
      (familyBaseline.indica * familyBaseline.weight) +
      (visualMorphology.indica * visualMorphology.weight) +
      (terpeneBias.indica * terpeneBias.weight) +
      (nameConsensus.indica * nameConsensus.weight);
    
    let weightedSativa =
      (genetics.sativa * genetics.weight) +
      (familyBaseline.sativa * familyBaseline.weight) +
      (visualMorphology.sativa * visualMorphology.weight) +
      (terpeneBias.sativa * terpeneBias.weight) +
      (nameConsensus.sativa * nameConsensus.weight);
    
    // Normalize to sum to 100
    const total = weightedIndica + weightedSativa;
    if (total > 0) {
      weightedIndica = (weightedIndica / total) * 100;
      weightedSativa = (weightedSativa / total) * 100;
    } else {
      weightedIndica = 50;
      weightedSativa = 50;
    }
    
    // Round to integers
    let finalIndica = Math.round(weightedIndica);
    let finalSativa = Math.round(weightedSativa);
    
    // Ensure they sum to 100
    const remainder = 100 - (finalIndica + finalSativa);
    if (remainder !== 0) {
      if (finalIndica >= finalSativa) {
        finalIndica += remainder;
      } else {
        finalSativa += remainder;
      }
    }
    
    // Calculate hybrid (always computed)
    const finalHybrid = 100 - finalIndica - finalSativa;
    
    // Generate dominance label
    const dominanceLabel = generateDominanceLabel(finalIndica, finalSativa, finalHybrid);
    
    // Ratio confidence (capped by overall confidence)
    const ratioConfidence = Math.min(overallConfidence, 95);
    
    return {
      indicaPercent: finalIndica,
      sativaPercent: finalSativa,
      hybridPercent: finalHybrid,
      dominanceLabel,
      confidence: ratioConfidence,
      sourceBreakdown: {
        genetics,
        familyBaseline,
        visualMorphology,
        terpeneBias,
        nameConsensus,
      },
    };
  } catch (error) {
    console.warn("Phase 4.7.1 — Multi-source ratio engine error:", error);
    // Fallback to balanced hybrid
    return {
      indicaPercent: 50,
      sativaPercent: 50,
      hybridPercent: 0,
      dominanceLabel: "Balanced Hybrid",
      confidence: Math.min(overallConfidence || 70, 70),
      sourceBreakdown: {
        genetics: { indica: 50, sativa: 50, weight: 0.40 },
        familyBaseline: { indica: 50, sativa: 50, weight: 0.20 },
        visualMorphology: { indica: 50, sativa: 50, weight: 0.15 },
        terpeneBias: { indica: 50, sativa: 50, weight: 0.15 },
        nameConsensus: { indica: 50, sativa: 50, weight: 0.10 },
      },
    };
  }
}
