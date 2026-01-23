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
 * Phase 4.7.2 — Detect data conflicts
 * Returns true if sources disagree significantly (>30% spread)
 */
function detectDataConflicts(
  genetics: { indica: number; sativa: number },
  familyBaseline: { indica: number; sativa: number },
  visualMorphology: { indica: number; sativa: number },
  terpeneBias: { indica: number; sativa: number },
  nameConsensus: { indica: number; sativa: number }
): boolean {
  const sources = [genetics, familyBaseline, visualMorphology, terpeneBias, nameConsensus];
  
  // Calculate spread (max indica - min indica, max sativa - min sativa)
  const indicaValues = sources.map(s => s.indica);
  const sativaValues = sources.map(s => s.sativa);
  
  const indicaSpread = Math.max(...indicaValues) - Math.min(...indicaValues);
  const sativaSpread = Math.max(...sativaValues) - Math.min(...sativaValues);
  
  // Conflict if spread > 30%
  return indicaSpread > 30 || sativaSpread > 30;
}

/**
 * Phase 4.7.2 — Detect strong lineage
 * Returns true if genetics source is strong (has DB entry with explicit ratio or high confidence)
 */
function detectStrongLineage(
  genetics: { indica: number; sativa: number },
  dbEntry?: CultivarReference
): boolean {
  if (!dbEntry) return false;
  
  const dbEntryAny = dbEntry as any;
  // Strong if explicit ratio exists (not inferred from type)
  if (dbEntryAny.indicaPercent !== undefined && dbEntryAny.sativaPercent !== undefined) {
    return true;
  }
  
  // Strong if genetics ratio is extreme (not balanced 50/50)
  const spread = Math.abs(genetics.indica - genetics.sativa);
  return spread >= 40; // At least 40% spread indicates strong lineage signal
}

/**
 * Phase 4.7.2 — Compress toward hybrid
 * Moves ratio toward 50/50 when conflicts detected
 */
function compressTowardHybrid(
  indica: number,
  sativa: number,
  compressionFactor: number // 0-1, how much to compress (0.3 = 30% toward 50/50)
): { indica: number; sativa: number } {
  const targetIndica = 50;
  const targetSativa = 50;
  
  const compressedIndica = indica + (targetIndica - indica) * compressionFactor;
  const compressedSativa = sativa + (targetSativa - sativa) * compressionFactor;
  
  // Normalize to sum to 100
  const total = compressedIndica + compressedSativa;
  if (total > 0) {
    return {
      indica: Math.round((compressedIndica / total) * 100),
      sativa: Math.round((compressedSativa / total) * 100),
    };
  }
  
  return { indica: 50, sativa: 50 };
}

/**
 * Phase 4.7.2 — Apply uncertainty caps
 * Single image: ±15% uncertainty
 * Multi-image: ±7% uncertainty
 */
function applyUncertaintyCaps(
  indica: number,
  sativa: number,
  imageCount: number,
  strongLineage: boolean
): { indica: number; sativa: number } {
  const uncertaintyCap = imageCount === 1 ? 15 : 7;
  
  // Calculate center (50/50)
  const center = 50;
  
  // Calculate distance from center
  const indicaDistance = Math.abs(indica - center);
  const sativaDistance = Math.abs(sativa - center);
  
  // If strong lineage, allow wider split (no cap)
  if (strongLineage) {
    return { indica, sativa };
  }
  
  // Apply cap: don't allow more than ±uncertaintyCap% from center
  let cappedIndica = indica;
  let cappedSativa = sativa;
  
  if (indicaDistance > uncertaintyCap) {
    if (indica > center) {
      cappedIndica = center + uncertaintyCap;
    } else {
      cappedIndica = center - uncertaintyCap;
    }
  }
  
  if (sativaDistance > uncertaintyCap) {
    if (sativa > center) {
      cappedSativa = center + uncertaintyCap;
    } else {
      cappedSativa = center - uncertaintyCap;
    }
  }
  
  // Normalize to sum to 100
  const total = cappedIndica + cappedSativa;
  if (total > 0) {
    return {
      indica: Math.round((cappedIndica / total) * 100),
      sativa: Math.round((cappedSativa / total) * 100),
    };
  }
  
  return { indica: 50, sativa: 50 };
}

/**
 * Phase 4.7.1 — Multi-Source Ratio Engine (Locked)
 * Phase 4.7.2 — Confidence-Aware Ratio Scoring
 * 
 * Combines multiple sources with weighted approach:
 * - Genetics/lineage (DB): 40%
 * - Strain family baseline: 20%
 * - Visual morphology: 15%
 * - Terpene profile bias: 15%
 * - Name consensus bias: 10%
 * 
 * Phase 4.7.2 Rules:
 * - Ratios never sum from guesses alone
 * - If data conflicts → compress toward hybrid
 * - If lineage strong → allow wider split
 * - Single image → ±15% uncertainty cap
 * - Multi-image → ±7% uncertainty cap
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
  imageCount?: number; // Phase 4.7.2 — For uncertainty caps
  consensusStrength?: number; // Phase 4.7.2 — 0-1, for detecting multi-image consensus
}): FinalStrainRatioV47 {
  const {
    strainName,
    dbEntry,
    visualSignals,
    terpeneProfile,
    candidateStrains,
    overallConfidence = 75,
    imageCount = 1, // Phase 4.7.2
    consensusStrength = 0.5, // Phase 4.7.2
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
    
    // Phase 4.7.2 — CONFIDENCE-AWARE RATIO SCORING
    
    // Rule 1: Ratios never sum from guesses alone
    // Check if we have real data (genetics or family baseline with actual data)
    const hasRealData = dbEntry !== undefined || 
      (genetics.indica !== 50 || genetics.sativa !== 50) || // Not default balanced
      (familyBaseline.indica !== 50 || familyBaseline.sativa !== 50); // Not default balanced
    
    if (!hasRealData) {
      // No real data - compress to balanced hybrid
      console.warn("Phase 4.7.2 — No real data available, compressing to balanced hybrid");
      finalIndica = 50;
      finalSativa = 50;
    } else {
      // Rule 2: If data conflicts → compress toward hybrid
      const hasConflicts = detectDataConflicts(genetics, familyBaseline, visualMorphology, terpeneBias, nameConsensus);
      if (hasConflicts) {
        console.log("Phase 4.7.2 — Data conflicts detected, compressing toward hybrid");
        const compressed = compressTowardHybrid(finalIndica, finalSativa, 0.3); // 30% compression
        finalIndica = compressed.indica;
        finalSativa = compressed.sativa;
      }
      
      // Rule 3: If lineage strong → allow wider split (no cap)
      const strongLineage = detectStrongLineage(genetics, dbEntry);
      
      // Rule 4: Apply uncertainty caps (unless strong lineage)
      const capped = applyUncertaintyCaps(finalIndica, finalSativa, imageCount, strongLineage);
      finalIndica = capped.indica;
      finalSativa = capped.sativa;
      
      if (strongLineage) {
        console.log("Phase 4.7.2 — Strong lineage detected, allowing wider split");
      } else {
        console.log(`Phase 4.7.2 — Applied uncertainty cap: ${imageCount === 1 ? '±15%' : '±7%'}`);
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
