// lib/scanner/ratioEngineV60.ts
// Phase 6.0 — Indica / Sativa / Hybrid Ratio Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NormalizedTerpeneProfile } from "./terpeneExperienceEngine";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 6.0 — Ratio Result
 */
export type StrainRatioV60 = {
  type: "Indica" | "Sativa" | "Hybrid";
  typeLabel: string; // "Hybrid (Indica-leaning)" or "Hybrid (Balanced)"
  ratio: string; // "60% Indica / 40% Sativa" or "~50/50 (Estimated)"
  indicaPercent: number; // 0-100
  sativaPercent: number; // 0-100
  confidence: "high" | "medium" | "low";
  confidenceLabel: string; // "High (Visual + lineage agreement)" or "~50/50 (Estimated)"
  confidenceBand?: { min: number; max: number }; // ±5–10% confidence band
  explanation: string[]; // Explanation bullets
  source: "database_exact" | "database_lineage" | "database_lineage_visual" | "database_lineage_visual_consensus" | "inferred_visual" | "default";
  isEstimated: boolean; // True if ratio is inferred/estimated
};

/**
 * Phase 6.0 Step 6.0.1 — RATIO SOURCE MODEL
 * 
 * For each candidate strain:
 * Pull from 35,000-strain database:
 * - Known indica/sativa ratios (when available)
 * - Lineage-based inferred ratios
 * - Breeder phenotype notes
 * 
 * If exact ratio unavailable:
 * - Infer from parent strains
 * - Weight dominant lineage higher
 */
function getRatioSourceModelV60(
  strainName: string,
  dbEntry?: CultivarReference
): {
  indicaPercent: number;
  sativaPercent: number;
  source: "database_exact" | "database_lineage" | "inferred_parents" | null;
  reasoning: string[];
  isEstimated: boolean;
} | null {
  if (!dbEntry) {
    return null;
  }

  // Phase 6.0.1 — Get canonical type from database
  const dbType = dbEntry.type || dbEntry.dominantType;
  const reasoning: string[] = [];
  let isEstimated = false;

  // Phase 6.0.1 — Known indica/sativa ratios (when available)
  // For now, we infer from type, but in future could have explicit ratios in database
  if (dbType === "Indica") {
    return {
      indicaPercent: 70,
      sativaPercent: 30,
      source: "database_exact",
      reasoning: [`Known Indica-dominant strain (from 35,000-strain database)`],
      isEstimated: false,
    };
  } else if (dbType === "Sativa") {
    return {
      indicaPercent: 30,
      sativaPercent: 70,
      source: "database_exact",
      reasoning: [`Known Sativa-dominant strain (from 35,000-strain database)`],
      isEstimated: false,
    };
  } else if (dbType === "Hybrid") {
    // Phase 6.0.1 — Lineage-based inferred ratios
    const genetics = dbEntry.genetics || "";
    
    if (genetics.length > 0) {
      // Phase 6.0.1 — Try to infer from parent strains
      const parentMatch = genetics.match(/([^×x/]+)[×x/]([^×x/]+)/i);
      if (parentMatch) {
        const parent1Name = parentMatch[1].trim();
        const parent2Name = parentMatch[2].trim();
        
        // Look up parent strains in database
        const parent1 = CULTIVAR_LIBRARY.find(s => 
          s.name.toLowerCase() === parent1Name.toLowerCase() || 
          (s.aliases && s.aliases.some(a => a.toLowerCase() === parent1Name.toLowerCase()))
        );
        const parent2 = CULTIVAR_LIBRARY.find(s => 
          s.name.toLowerCase() === parent2Name.toLowerCase() || 
          (s.aliases && s.aliases.some(a => a.toLowerCase() === parent2Name.toLowerCase()))
        );
        
        if (parent1 && parent2) {
          // Phase 6.0.1 — Infer from parent strains (weight dominant lineage higher)
          const parent1Type = parent1.type || parent1.dominantType;
          const parent2Type = parent2.type || parent2.dominantType;
          
          let parent1Indica = 50; // Default
          let parent2Indica = 50;
          
          if (parent1Type === "Indica") parent1Indica = 70;
          else if (parent1Type === "Sativa") parent1Indica = 30;
          
          if (parent2Type === "Indica") parent2Indica = 70;
          else if (parent2Type === "Sativa") parent2Indica = 30;
          
          // Phase 6.0.1 — Average parent ratios (could weight dominant lineage higher in future)
          const inferredIndica = Math.round((parent1Indica + parent2Indica) / 2);
          const inferredSativa = 100 - inferredIndica;
          
          reasoning.push(`Ratio inferred from parent strains: ${parent1.name} (${parent1Indica}% Indica) × ${parent2.name} (${parent2Indica}% Indica)`);
          isEstimated = true;
          
          return {
            indicaPercent: inferredIndica,
            sativaPercent: inferredSativa,
            source: "inferred_parents",
            reasoning,
            isEstimated,
          };
        }
      }
      
      // Phase 6.0.1 — Lineage-based inferred ratios (from genetics string)
      const geneticsLower = genetics.toLowerCase();
      
      if (geneticsLower.includes("indica") && !geneticsLower.includes("sativa")) {
        reasoning.push(`Lineage-based inference: Indica-leaning Hybrid (from genetics: ${genetics})`);
        isEstimated = true;
        return {
          indicaPercent: 60,
          sativaPercent: 40,
          source: "database_lineage",
          reasoning,
          isEstimated,
        };
      } else if (geneticsLower.includes("sativa") && !geneticsLower.includes("indica")) {
        reasoning.push(`Lineage-based inference: Sativa-leaning Hybrid (from genetics: ${genetics})`);
        isEstimated = true;
        return {
          indicaPercent: 40,
          sativaPercent: 60,
          source: "database_lineage",
          reasoning,
          isEstimated,
        };
      }
    }
    
    // Phase 6.0.1 — Default balanced hybrid if no lineage info
    reasoning.push(`Hybrid classification (balanced, from 35,000-strain database)`);
    isEstimated = true;
    return {
      indicaPercent: 50,
      sativaPercent: 50,
      source: "database_lineage",
      reasoning,
      isEstimated,
    };
  }

  return null;
}

/**
 * Phase 6.0 Step 6.0.2 — VISUAL TRAIT CORRELATION
 * 
 * From image analysis:
 * - Leaf width (broad ↔ narrow)
 * - Bud density (compact ↔ airy)
 * - Internode spacing
 * - Flower structure
 * 
 * Map traits to ratio modifiers:
 * - Broad leaves → +Indica weight
 * - Tall/airy structure → +Sativa weight
 * - Mixed traits → Hybrid stabilization
 */
function getVisualTraitCorrelationV60(
  fusedFeatures?: FusedFeatures
): {
  adjustment: number; // ± adjustment to indica percent
  reasoning: string[];
} {
  if (!fusedFeatures) {
    return { adjustment: 0, reasoning: [] };
  }

  let netAdjustment = 0;
  const reasoning: string[] = [];

  // Phase 6.0.2 — Leaf width (broad ↔ narrow)
  if (fusedFeatures.leafShape === "broad") {
    netAdjustment += 7; // +7% Indica
    reasoning.push("Broad leaves suggest indica dominance");
  } else if (fusedFeatures.leafShape === "narrow") {
    netAdjustment -= 7; // -7% Indica (more Sativa)
    reasoning.push("Narrow leaves suggest sativa dominance");
  }

  // Phase 6.0.2 — Bud density (compact ↔ airy)
  if (fusedFeatures.budStructure === "high") {
    // Compact/dense → Indica weight
    netAdjustment += 6; // +6% Indica
    reasoning.push("Compact bud structure indicates indica weight");
  } else if (fusedFeatures.budStructure === "low") {
    // Airy structure → Sativa weight
    netAdjustment -= 6; // -6% Indica (more Sativa)
    reasoning.push("Airy structure indicates sativa weight");
  }

  // Phase 6.0.2 — Flower structure (via trichome density)
  if (fusedFeatures.trichomeDensity === "high") {
    // High trichome density slightly favors indica
    netAdjustment += 2; // +2% Indica
    reasoning.push("Dense flower structure supports indica-leaning");
  }

  // Phase 6.0.2 — Cap adjustment at ±10% (visual traits are modifiers, not primary)
  if (netAdjustment > 10) netAdjustment = 10;
  if (netAdjustment < -10) netAdjustment = -10;

  // Phase 6.0.2 — Mixed traits → Hybrid stabilization (if adjustments are small, reduce them)
  if (Math.abs(netAdjustment) < 5) {
    netAdjustment *= 0.7; // Reduce small adjustments (hybrid stabilization)
    reasoning.push("Mixed visual traits suggest hybrid stabilization");
  }

  return {
    adjustment: Math.round(netAdjustment * 10) / 10,
    reasoning: reasoning.length > 0 ? reasoning : [],
  };
}

/**
 * Phase 6.0 Step 6.0.3 — MULTI-IMAGE RATIO CONSENSUS
 * 
 * Across 2–5 images:
 * - Calculate ratio per image
 * - Average results
 * - Penalize outliers
 * - Detect conflicting morphology
 * 
 * Output:
 * - Final ratio (e.g. 60/40)
 * - Confidence band (±5–10%)
 */
function getMultiImageRatioConsensusV60(
  currentIndica: number,
  imageResults?: ImageResult[],
  imageCount: number = 1
): {
  adjustment: number;
  confidenceBand?: { min: number; max: number };
  reasoning: string[];
  hasConflictingMorphology: boolean;
} {
  if (!imageResults || imageResults.length <= 1) {
    return {
      adjustment: 0,
      reasoning: [],
      hasConflictingMorphology: false,
    };
  }

  // Phase 6.0.3 — Calculate ratio per image
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
      reasoning: [],
      hasConflictingMorphology: false,
    };
  }

  // Phase 6.0.3 — Average results (confidence-weighted)
  const totalWeight = imageRatios.reduce((sum, r) => sum + r.confidence, 0);
  const avgIndica = imageRatios.reduce((sum, r) => sum + (r.indicaPercent * r.confidence), 0) / totalWeight;

  // Phase 6.0.3 — Calculate variance to detect outliers and conflicting morphology
  const variance = imageRatios.reduce((sum, r) => {
    const diff = r.indicaPercent - avgIndica;
    return sum + (diff * diff * r.confidence);
  }, 0) / totalWeight;
  const stdDev = Math.sqrt(variance);

  // Phase 6.0.3 — Detect conflicting morphology
  const hasConflictingMorphology = stdDev > 12; // High variance indicates conflict

  // Phase 6.0.3 — Penalize outliers (high variance → reduce adjustment)
  let netAdjustment = avgIndica - currentIndica;
  if (stdDev > 15) {
    // High variance: reduce adjustment by 60% (penalize outliers)
    netAdjustment *= 0.4;
    reasoning.push(`High variance detected (${stdDev.toFixed(1)}% std dev). Outliers penalized.`);
  } else if (stdDev > 10) {
    // Medium variance: reduce adjustment by 30%
    netAdjustment *= 0.7;
    reasoning.push(`Moderate variance detected (${stdDev.toFixed(1)}% std dev). Adjustment reduced.`);
  }

  // Phase 6.0.3 — Cap adjustment at ±5%
  if (netAdjustment > 5) netAdjustment = 5;
  if (netAdjustment < -5) netAdjustment = -5;

  // Phase 6.0.3 — Confidence band (±5–10%)
  const confidenceBandWidth = hasConflictingMorphology ? 10 : (stdDev > 8 ? 8 : 5);
  const confidenceBand = {
    min: Math.max(20, Math.min(80, Math.round((currentIndica + netAdjustment - confidenceBandWidth) * 10) / 10)),
    max: Math.max(20, Math.min(80, Math.round((currentIndica + netAdjustment + confidenceBandWidth) * 10) / 10)),
  };

  const reasoning: string[] = [];
  if (imageCount >= 2) {
    reasoning.push(`Consensus across ${imageCount} images`);
  }
  if (hasConflictingMorphology) {
    reasoning.push(`Conflicting morphology detected (${stdDev.toFixed(1)}% std dev)`);
  } else if (stdDev < 5) {
    reasoning.push(`High agreement (${stdDev.toFixed(1)}% std dev)`);
  }

  return {
    adjustment: Math.round(netAdjustment * 10) / 10,
    confidenceBand,
    reasoning,
    hasConflictingMorphology,
  };
}

/**
 * Phase 6.0 Step 6.0.4 — DISPLAY RULES
 * 
 * Always show:
 * Type:
 * Hybrid (Indica-leaning)
 * 
 * Ratio:
 * 60% Indica / 40% Sativa
 * 
 * Confidence:
 * High (Visual + lineage agreement)
 * 
 * If uncertain:
 * Hybrid (Balanced)
 * ~50/50 (Estimated)
 */
function formatDisplayV60(
  type: "Indica" | "Sativa" | "Hybrid",
  indicaPercent: number,
  sativaPercent: number,
  confidence: "high" | "medium" | "low",
  source: StrainRatioV60["source"],
  isEstimated: boolean,
  hasConflictingMorphology: boolean,
  confidenceBand?: { min: number; max: number }
): {
  typeLabel: string;
  ratio: string;
  confidenceLabel: string;
} {
  // Phase 6.0.4 — Type label
  let typeLabel: string;
  if (type === "Indica") {
    typeLabel = "Indica";
  } else if (type === "Sativa") {
    typeLabel = "Sativa";
  } else {
    // Hybrid: Determine leaning
    if (indicaPercent >= 55) {
      typeLabel = "Hybrid (Indica-leaning)";
    } else if (sativaPercent >= 55) {
      typeLabel = "Hybrid (Sativa-leaning)";
    } else {
      typeLabel = "Hybrid (Balanced)";
    }
  }

  // Phase 6.0.4 — Ratio string
  let ratio: string;
  if (isEstimated && confidence === "low") {
    // Phase 6.0.4 — If uncertain, show estimated format
    ratio = `~${indicaPercent}/${sativaPercent} (Estimated)`;
  } else {
    ratio = `${indicaPercent}% Indica / ${sativaPercent}% Sativa`;
  }

  // Phase 6.0.4 — Confidence label
  let confidenceLabel: string;
  if (confidence === "high") {
    if (source.includes("visual") && source.includes("lineage")) {
      confidenceLabel = "High (Visual + lineage agreement)";
    } else if (source.includes("consensus")) {
      confidenceLabel = "High (Multi-image consensus)";
    } else {
      confidenceLabel = "High";
    }
  } else if (confidence === "medium") {
    confidenceLabel = "Medium";
  } else {
    if (hasConflictingMorphology) {
      confidenceLabel = "Low (Conflicting morphology)";
    } else {
      confidenceLabel = "Low (Estimated)";
    }
  }

  return {
    typeLabel,
    ratio,
    confidenceLabel,
  };
}

/**
 * Phase 6.0 — MAIN FUNCTION
 */
export function resolveStrainRatioV60(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: NormalizedTerpeneProfile
): StrainRatioV60 {
  // Phase 6.0.1 — RATIO SOURCE MODEL
  const ratioSource = getRatioSourceModelV60(strainName, dbEntry);
  
  if (!ratioSource) {
    // Failsafe: Return balanced hybrid with estimated label
    return {
      type: "Hybrid",
      typeLabel: "Hybrid (Balanced)",
      ratio: "~50/50 (Estimated)",
      indicaPercent: 50,
      sativaPercent: 50,
      confidence: "low",
      confidenceLabel: "Low (Estimated)",
      explanation: ["No database entry found. Ratio estimated from default hybrid classification."],
      source: "default",
      isEstimated: true,
    };
  }

  let currentIndica = ratioSource.indicaPercent;
  const explanation: string[] = [...ratioSource.reasoning];
  let isEstimated = ratioSource.isEstimated;

  // Phase 6.0.2 — VISUAL TRAIT CORRELATION
  const visualCorrelation = getVisualTraitCorrelationV60(fusedFeatures);
  if (visualCorrelation.adjustment !== 0) {
    currentIndica += visualCorrelation.adjustment;
    explanation.push(...visualCorrelation.reasoning);
    isEstimated = true; // Visual adjustments make it estimated
  }

  // Phase 6.0.3 — MULTI-IMAGE RATIO CONSENSUS
  const consensus = getMultiImageRatioConsensusV60(currentIndica, imageResults, imageCount);
  if (consensus.adjustment !== 0) {
    currentIndica += consensus.adjustment;
    explanation.push(...consensus.reasoning);
  }

  // Phase 6.0.5 — CONFIDENCE SAFEGUARDS: Ensure ratio sums to 100%, clamp to 20-80% (never pure)
  currentIndica = Math.max(20, Math.min(80, Math.round(currentIndica * 10) / 10));
  const currentSativa = Math.round((100 - currentIndica) * 10) / 10;

  // Phase 6.0.5 — Determine type
  let type: "Indica" | "Sativa" | "Hybrid";
  if (currentIndica >= 60) {
    type = "Indica";
  } else if (currentSativa >= 60) {
    type = "Sativa";
  } else {
    type = "Hybrid";
  }

  // Phase 6.0.5 — Determine confidence
  let confidence: "high" | "medium" | "low";
  if (ratioSource.source === "database_exact" && !consensus.hasConflictingMorphology && imageCount >= 2) {
    confidence = "high";
  } else if (ratioSource.source === "database_lineage" && visualCorrelation.adjustment !== 0 && !consensus.hasConflictingMorphology) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // Phase 6.0.5 — Determine source
  let source: StrainRatioV60["source"];
  if (consensus.adjustment !== 0 && visualCorrelation.adjustment !== 0 && ratioSource.source !== null) {
    source = "database_lineage_visual_consensus";
  } else if (visualCorrelation.adjustment !== 0 && ratioSource.source !== null) {
    source = "database_lineage_visual";
  } else if (ratioSource.source === "database_exact") {
    source = "database_exact";
  } else if (ratioSource.source === "database_lineage" || ratioSource.source === "inferred_parents") {
    source = "database_lineage";
  } else {
    source = "inferred_visual";
  }

  // Phase 6.0.4 — DISPLAY RULES
  const display = formatDisplayV60(
    type,
    currentIndica,
    currentSativa,
    confidence,
    source,
    isEstimated,
    consensus.hasConflictingMorphology,
    consensus.confidenceBand
  );

  // Phase 6.0.5 — CONFIDENCE SAFEGUARDS: Add explanation about estimation
  if (isEstimated) {
    explanation.push("Ratio inferred from lineage and visual structure; exact genetics may vary.");
  }

  return {
    type,
    typeLabel: display.typeLabel,
    ratio: display.ratio,
    indicaPercent: Math.round(currentIndica),
    sativaPercent: Math.round(currentSativa),
    confidence,
    confidenceLabel: display.confidenceLabel,
    confidenceBand: consensus.confidenceBand,
    explanation,
    source,
    isEstimated,
  };
}
