// lib/scanner/ratioEngineV71.ts
// Phase 7.1 — Indica / Sativa / Hybrid Ratio Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NormalizedTerpeneProfile } from "./terpeneExperienceEngine";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 7.1 — Ratio Result
 */
export type StrainRatioV71 = {
  classification: "Indica" | "Sativa" | "Hybrid";
  dominanceLabel?: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
  ratio: string; // "65% Indica / 35% Sativa"
  indicaPercent: number; // 0-100
  sativaPercent: number; // 0-100
  ratioRange?: { min: number; max: number }; // e.g. 55-65% if mixed signals
  confidence: "very_high" | "high" | "medium" | "low";
  confidenceLabel: string; // "Very High: known strain + ≥3 images"
  explanation: string[]; // Why that ratio was chosen
  source: "database_canonical" | "database_lineage" | "database_lineage_visual" | "database_lineage_visual_consensus" | "inferred_visual" | "default";
};

/**
 * Phase 7.1 Step 7.1.1 — BASE RATIO SOURCES
 * 
 * Derive ratio from:
 * - Strain database genetics (primary source)
 * - Parent lineage ratios
 * - Known breeder classifications
 * - Historical consensus (wiki + lab references)
 * 
 * If strain is known:
 * - Pull canonical ratio (e.g. 60/40 Indica-dominant)
 */
function getBaseRatioSourcesV71(
  strainName: string,
  dbEntry?: CultivarReference
): {
  indicaPercent: number;
  sativaPercent: number;
  source: "database_canonical" | "database_lineage" | "inferred_parents" | null;
  reasoning: string[];
  isKnownStrain: boolean;
} | null {
  if (!dbEntry) {
    return null;
  }

  // Phase 7.1.1 — Get canonical type from database (primary source)
  const dbType = dbEntry.type || dbEntry.dominantType;
  const reasoning: string[] = [];
  let isKnownStrain = true;

  // Phase 7.1.1 — Known strain: Pull canonical ratio
  if (dbType === "Indica") {
    return {
      indicaPercent: 70,
      sativaPercent: 30,
      source: "database_canonical",
      reasoning: [`Canonical ratio from strain database: ${strainName} is Indica-dominant (70% Indica / 30% Sativa)`],
      isKnownStrain: true,
    };
  } else if (dbType === "Sativa") {
    return {
      indicaPercent: 30,
      sativaPercent: 70,
      source: "database_canonical",
      reasoning: [`Canonical ratio from strain database: ${strainName} is Sativa-dominant (30% Indica / 70% Sativa)`],
      isKnownStrain: true,
    };
  } else if (dbType === "Hybrid") {
    // Phase 7.1.1 — Parent lineage ratios
    const genetics = dbEntry.genetics || "";
    
    if (genetics.length > 0) {
      // Phase 7.1.1 — Try to infer from parent strains
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
          // Phase 7.1.1 — Infer from parent lineage ratios
          const parent1Type = parent1.type || parent1.dominantType;
          const parent2Type = parent2.type || parent2.dominantType;
          
          let parent1Indica = 50;
          let parent2Indica = 50;
          
          if (parent1Type === "Indica") parent1Indica = 70;
          else if (parent1Type === "Sativa") parent1Indica = 30;
          
          if (parent2Type === "Indica") parent2Indica = 70;
          else if (parent2Type === "Sativa") parent2Indica = 30;
          
          // Phase 7.1.1 — Average parent ratios
          const inferredIndica = Math.round((parent1Indica + parent2Indica) / 2);
          const inferredSativa = 100 - inferredIndica;
          
          reasoning.push(`Ratio inferred from parent lineage: ${parent1.name} (${parent1Indica}% Indica) × ${parent2.name} (${parent2Indica}% Indica) → ${inferredIndica}% Indica / ${inferredSativa}% Sativa`);
          
          return {
            indicaPercent: inferredIndica,
            sativaPercent: inferredSativa,
            source: "inferred_parents",
            reasoning,
            isKnownStrain: true,
          };
        }
      }
      
      // Phase 7.1.1 — Known breeder classifications (from genetics string)
      const geneticsLower = genetics.toLowerCase();
      
      if (geneticsLower.includes("indica") && !geneticsLower.includes("sativa")) {
        reasoning.push(`Known breeder classification: Indica-dominant Hybrid (from genetics: ${genetics})`);
        return {
          indicaPercent: 60,
          sativaPercent: 40,
          source: "database_lineage",
          reasoning,
          isKnownStrain: true,
        };
      } else if (geneticsLower.includes("sativa") && !geneticsLower.includes("indica")) {
        reasoning.push(`Known breeder classification: Sativa-dominant Hybrid (from genetics: ${genetics})`);
        return {
          indicaPercent: 40,
          sativaPercent: 60,
          source: "database_lineage",
          reasoning,
          isKnownStrain: true,
        };
      }
    }
    
    // Phase 7.1.1 — Historical consensus (balanced hybrid default)
    reasoning.push(`Historical consensus: Balanced Hybrid (from 35,000-strain database)`);
    return {
      indicaPercent: 50,
      sativaPercent: 50,
      source: "database_lineage",
      reasoning,
      isKnownStrain: true,
    };
  }

  return null;
}

/**
 * Phase 7.1 Step 7.1.2 — VISUAL MODULATION
 * 
 * Adjust ratio using image signals:
 * - Leaf width (broad vs narrow)
 * - Bud density (tight vs airy)
 * - Internodal spacing
 * - Trichome clustering
 * - Flower structure
 * 
 * Apply small shifts only:
 * - Max ±10% from canonical ratio
 * - Never override known genetics completely
 */
function applyVisualModulationV71(
  baseIndica: number,
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

  // Phase 7.1.2 — Leaf width (broad vs narrow)
  if (fusedFeatures.leafShape === "broad") {
    netAdjustment += 4; // +4% Indica
    reasoning.push("Broad leaves suggest indica influence");
  } else if (fusedFeatures.leafShape === "narrow") {
    netAdjustment -= 4; // -4% Indica (more Sativa)
    reasoning.push("Narrow leaves suggest sativa influence");
  }

  // Phase 7.1.2 — Bud density (tight vs airy)
  if (fusedFeatures.budStructure === "high") {
    // Tight/dense → Indica
    netAdjustment += 3; // +3% Indica
    reasoning.push("Tight bud density indicates indica-leaning structure");
  } else if (fusedFeatures.budStructure === "low") {
    // Airy → Sativa
    netAdjustment -= 3; // -3% Indica (more Sativa)
    reasoning.push("Airy bud structure indicates sativa-leaning structure");
  }

  // Phase 7.1.2 — Trichome clustering (via trichome density)
  if (fusedFeatures.trichomeDensity === "high") {
    netAdjustment += 1; // +1% Indica
    reasoning.push("High trichome clustering supports indica-leaning");
  }

  // Phase 7.1.2 — Flower structure (via trichome density)
  if (fusedFeatures.trichomeDensity === "high") {
    // Already counted above, but could add more nuance
  }

  // Phase 7.1.2 — Cap adjustment at ±10% (never override known genetics completely)
  if (netAdjustment > 10) netAdjustment = 10;
  if (netAdjustment < -10) netAdjustment = -10;

  // Phase 7.1.2 — Ensure we don't exceed bounds (20-80%)
  const adjustedIndica = baseIndica + netAdjustment;
  if (adjustedIndica < 20) {
    netAdjustment = 20 - baseIndica; // Cap at 20% minimum
  } else if (adjustedIndica > 80) {
    netAdjustment = 80 - baseIndica; // Cap at 80% maximum
  }

  return {
    adjustment: Math.round(netAdjustment * 10) / 10,
    reasoning: reasoning.length > 0 ? reasoning : [],
  };
}

/**
 * Phase 7.1 Step 7.1.3 — MULTI-IMAGE CONSENSUS
 * 
 * Across 2–5 images:
 * - Average visual indicators
 * - Detect conflicting morphology
 * - Reduce confidence if images disagree
 * 
 * Consensus rules:
 * - Strong agreement → ratio confidence ↑
 * - Mixed signals → widen range (e.g. 55–65%)
 */
function getMultiImageConsensusV71(
  currentIndica: number,
  imageResults?: ImageResult[],
  imageCount: number = 1
): {
  adjustment: number;
  ratioRange?: { min: number; max: number };
  confidenceModifier: "boost" | "neutral" | "reduce";
  reasoning: string[];
  hasConflictingMorphology: boolean;
} {
  if (!imageResults || imageResults.length <= 1) {
    return {
      adjustment: 0,
      confidenceModifier: "neutral",
      reasoning: [],
      hasConflictingMorphology: false,
    };
  }

  // Phase 7.1.3 — Calculate ratio per image
  const imageRatios: Array<{ indicaPercent: number; confidence: number }> = [];

  imageResults.forEach(result => {
    const wikiDominance = result.wikiResult?.genetics?.dominance;
    if (wikiDominance && wikiDominance !== "Unknown") {
      let indicaPercent = 50;
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
      confidenceModifier: "neutral",
      reasoning: [],
      hasConflictingMorphology: false,
    };
  }

  // Phase 7.1.3 — Average visual indicators (confidence-weighted)
  const totalWeight = imageRatios.reduce((sum, r) => sum + r.confidence, 0);
  const avgIndica = imageRatios.reduce((sum, r) => sum + (r.indicaPercent * r.confidence), 0) / totalWeight;

  // Phase 7.1.3 — Calculate variance to detect conflicting morphology
  const variance = imageRatios.reduce((sum, r) => {
    const diff = r.indicaPercent - avgIndica;
    return sum + (diff * diff * r.confidence);
  }, 0) / totalWeight;
  const stdDev = Math.sqrt(variance);

  // Phase 7.1.3 — Detect conflicting morphology
  const hasConflictingMorphology = stdDev > 10; // High variance indicates conflict

  // Phase 7.1.3 — Net adjustment
  let netAdjustment = avgIndica - currentIndica;

  // Phase 7.1.3 — Reduce confidence if images disagree
  let confidenceModifier: "boost" | "neutral" | "reduce";
  if (hasConflictingMorphology) {
    // Phase 7.1.3 — Mixed signals → widen range (e.g. 55–65%)
    const rangeWidth = Math.min(10, stdDev); // Cap range at ±10%
    const ratioRange = {
      min: Math.max(20, Math.min(80, Math.round((currentIndica + netAdjustment - rangeWidth) * 10) / 10)),
      max: Math.max(20, Math.min(80, Math.round((currentIndica + netAdjustment + rangeWidth) * 10) / 10)),
    };
    
    // Reduce adjustment by 50% if conflicting
    netAdjustment *= 0.5;
    confidenceModifier = "reduce";
    
    const reasoning: string[] = [];
    reasoning.push(`Conflicting morphology detected (${stdDev.toFixed(1)}% std dev). Confidence reduced.`);
    reasoning.push(`Ratio range: ${ratioRange.min}% - ${ratioRange.max}% Indica`);
    
    return {
      adjustment: Math.round(netAdjustment * 10) / 10,
      ratioRange,
      confidenceModifier,
      reasoning,
      hasConflictingMorphology: true,
    };
  } else if (stdDev < 5 && imageCount >= 3) {
    // Phase 7.1.3 — Strong agreement → ratio confidence ↑
    confidenceModifier = "boost";
    const reasoning: string[] = [];
    reasoning.push(`Strong agreement across ${imageCount} images (${stdDev.toFixed(1)}% std dev). Confidence increased.`);
    
    return {
      adjustment: Math.round(netAdjustment * 10) / 10,
      confidenceModifier,
      reasoning,
      hasConflictingMorphology: false,
    };
  } else {
    confidenceModifier = "neutral";
    const reasoning: string[] = [];
    if (imageCount >= 2) {
      reasoning.push(`Consensus across ${imageCount} images`);
    }
    
    return {
      adjustment: Math.round(netAdjustment * 10) / 10,
      confidenceModifier,
      reasoning,
      hasConflictingMorphology: false,
    };
  }
}

/**
 * Phase 7.1 Step 7.1.4 — OUTPUT FORMAT
 * 
 * Always show:
 * - Classification: Indica / Sativa / Hybrid
 * - Ratio bar (visual)
 * - Numeric ratio (e.g. 65% Indica / 35% Sativa)
 * 
 * Optional:
 * - Dominance label:
 *   • Indica-dominant
 *   • Sativa-dominant
 *   • Balanced Hybrid
 */
function formatOutputV71(
  classification: "Indica" | "Sativa" | "Hybrid",
  indicaPercent: number,
  sativaPercent: number,
  ratioRange?: { min: number; max: number }
): {
  dominanceLabel?: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
  ratio: string;
} {
  // Phase 7.1.4 — Determine dominance label
  let dominanceLabel: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid" | undefined;
  
  if (classification === "Hybrid") {
    if (indicaPercent >= 55) {
      dominanceLabel = "Indica-dominant";
    } else if (sativaPercent >= 55) {
      dominanceLabel = "Sativa-dominant";
    } else {
      dominanceLabel = "Balanced Hybrid";
    }
  }

  // Phase 7.1.4 — Numeric ratio
  let ratio: string;
  if (ratioRange) {
    // Phase 7.1.4 — Show range if mixed signals
    ratio = `${ratioRange.min}% - ${ratioRange.max}% Indica / ${100 - ratioRange.max}% - ${100 - ratioRange.min}% Sativa`;
  } else {
    ratio = `${indicaPercent}% Indica / ${sativaPercent}% Sativa`;
  }

  return {
    dominanceLabel,
    ratio,
  };
}

/**
 * Phase 7.1 Step 7.1.5 — CONFIDENCE HANDLING
 * 
 * Attach confidence tier:
 * - Very High: known strain + ≥3 images
 * - High: known strain + 1–2 images
 * - Medium: close match strain
 * - Low: conflicting signals
 * 
 * Never claim lab certainty.
 */
function determineConfidenceV71(
  isKnownStrain: boolean,
  imageCount: number,
  hasConflictingMorphology: boolean,
  confidenceModifier: "boost" | "neutral" | "reduce"
): {
  confidence: "very_high" | "high" | "medium" | "low";
  confidenceLabel: string;
} {
  // Phase 7.1.5 — Never claim lab certainty
  let confidence: "very_high" | "high" | "medium" | "low";
  let confidenceLabel: string;

  if (hasConflictingMorphology) {
    confidence = "low";
    confidenceLabel = "Low: conflicting signals";
  } else if (isKnownStrain && imageCount >= 3 && confidenceModifier === "boost") {
    confidence = "very_high";
    confidenceLabel = "Very High: known strain + ≥3 images";
  } else if (isKnownStrain && imageCount >= 1) {
    confidence = "high";
    confidenceLabel = "High: known strain + 1–2 images";
  } else if (isKnownStrain) {
    confidence = "medium";
    confidenceLabel = "Medium: close match strain";
  } else {
    confidence = "low";
    confidenceLabel = "Low: conflicting signals";
  }

  return {
    confidence,
    confidenceLabel,
  };
}

/**
 * Phase 7.1 — MAIN FUNCTION
 */
export function resolveStrainRatioV71(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: NormalizedTerpeneProfile
): StrainRatioV71 {
  // Phase 7.1.1 — BASE RATIO SOURCES
  const baseRatio = getBaseRatioSourcesV71(strainName, dbEntry);
  
  if (!baseRatio) {
    // Failsafe: Return balanced hybrid
    return {
      classification: "Hybrid",
      dominanceLabel: "Balanced Hybrid",
      ratio: "~50/50 (Estimated)",
      indicaPercent: 50,
      sativaPercent: 50,
      confidence: "low",
      confidenceLabel: "Low: conflicting signals",
      explanation: ["No database entry found. Ratio estimated from default hybrid classification."],
      source: "default",
    };
  }

  let currentIndica = baseRatio.indicaPercent;
  const explanation: string[] = [...baseRatio.reasoning];

  // Phase 7.1.2 — VISUAL MODULATION
  const visualModulation = applyVisualModulationV71(currentIndica, fusedFeatures);
  if (visualModulation.adjustment !== 0) {
    currentIndica += visualModulation.adjustment;
    explanation.push(...visualModulation.reasoning);
  }

  // Phase 7.1.3 — MULTI-IMAGE CONSENSUS
  const consensus = getMultiImageConsensusV71(currentIndica, imageResults, imageCount);
  if (consensus.adjustment !== 0) {
    currentIndica += consensus.adjustment;
    explanation.push(...consensus.reasoning);
  }

  // Phase 7.1.5 — CONFIDENCE HANDLING: Ensure ratio sums to 100%, clamp to 20-80% (never pure)
  currentIndica = Math.max(20, Math.min(80, Math.round(currentIndica * 10) / 10));
  const currentSativa = Math.round((100 - currentIndica) * 10) / 10;

  // Phase 7.1.4 — Determine classification
  let classification: "Indica" | "Sativa" | "Hybrid";
  if (currentIndica >= 60) {
    classification = "Indica";
  } else if (currentSativa >= 60) {
    classification = "Sativa";
  } else {
    classification = "Hybrid";
  }

  // Phase 7.1.4 — OUTPUT FORMAT
  const output = formatOutputV71(classification, currentIndica, currentSativa, consensus.ratioRange);

  // Phase 7.1.5 — CONFIDENCE HANDLING
  const confidenceResult = determineConfidenceV71(
    baseRatio.isKnownStrain,
    imageCount,
    consensus.hasConflictingMorphology,
    consensus.confidenceModifier
  );

  // Phase 7.1.5 — Determine source
  let source: StrainRatioV71["source"];
  if (consensus.adjustment !== 0 && visualModulation.adjustment !== 0 && baseRatio.source !== null) {
    source = "database_lineage_visual_consensus";
  } else if (visualModulation.adjustment !== 0 && baseRatio.source !== null) {
    source = "database_lineage_visual";
  } else if (baseRatio.source === "database_canonical") {
    source = "database_canonical";
  } else if (baseRatio.source === "database_lineage" || baseRatio.source === "inferred_parents") {
    source = "database_lineage";
  } else {
    source = "inferred_visual";
  }

  return {
    classification,
    dominanceLabel: output.dominanceLabel,
    ratio: output.ratio,
    indicaPercent: Math.round(currentIndica),
    sativaPercent: Math.round(currentSativa),
    ratioRange: consensus.ratioRange,
    confidence: confidenceResult.confidence,
    confidenceLabel: confidenceResult.confidenceLabel,
    explanation,
    source,
  };
}
