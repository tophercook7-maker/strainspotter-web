// lib/scanner/ratioEngineV73.ts
// Phase 7.3 — Indica / Sativa / Hybrid Ratio Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 7.3 — Ratio Result
 */
export type StrainRatioV73 = {
  indicaPercent: number; // 0-100
  sativaPercent: number; // 0-100
  classification: "Indica" | "Sativa" | "Hybrid";
  dominanceLabel: "Indica-dominant" | "Sativa-dominant" | "Balanced" | undefined;
  displayText: string; // "Indica: 65%, Sativa: 35%"
  classificationText: string; // "Indica-dominant Hybrid"
  ratioRange?: { min: number; max: number }; // If uncertain, show range
  confidence: "very_high" | "high" | "medium" | "low";
  confidenceLabel: string;
  interpretation: string; // Plain-language meaning (e.g., "body relaxation, evening use")
  explanation: string[]; // Why this ratio was chosen
  source: "database_primary" | "database_blended" | "database_visual" | "database_visual_consensus" | "inferred_visual" | "default";
};

/**
 * Phase 7.3 Step 7.3.1 — GENETIC BASELINE
 * 
 * If strain is identified:
 * - Pull genetic ratio from:
 *   • Breeder lineage
 *   • Strain database ancestry
 *   • Historical classification (indica-dominant, etc.)
 * 
 * If strain is a close match:
 * - Blend ratios from top 3–5 candidates
 * - Weight by consensus confidence
 */
function getGeneticBaselineV73(
  strainName: string,
  dbEntry?: CultivarReference,
  candidateStrains?: Array<{ name: string; confidence: number }>
): {
  indicaPercent: number;
  sativaPercent: number;
  reasoning: string[];
  source: "database_primary" | "database_blended" | "default";
} {
  // Phase 7.3.1 — If strain is identified, pull from database
  if (dbEntry) {
    const dbType = dbEntry.type || dbEntry.dominantType;
    
    // Phase 7.3.1 — Infer ratio from strain type (historical classification)
    let indicaPercent: number;
    let sativaPercent: number;
    
    if (dbType === "Indica") {
      // Indica-dominant: typically 70-80% Indica
      indicaPercent = 75;
      sativaPercent = 25;
    } else if (dbType === "Sativa") {
      // Sativa-dominant: typically 70-80% Sativa
      indicaPercent = 25;
      sativaPercent = 75;
    } else {
      // Hybrid: typically 50-60% of dominant type
      // For balanced hybrid, use 50/50
      // For indica-leaning hybrid, use 60/40
      // For sativa-leaning hybrid, use 40/60
      // Default to balanced
      indicaPercent = 50;
      sativaPercent = 50;
    }
    
    // Phase 7.3.1 — Check genetics field for more specific info
    const genetics = dbEntry.genetics || "";
    if (genetics.includes("×") || genetics.includes("x")) {
      // Try to infer from parent names (simplified)
      const lowerGenetics = genetics.toLowerCase();
      const indicaParents = ["afghan", "kush", "purple", "northern lights", "granddaddy"];
      const sativaParents = ["haze", "diesel", "jack", "trainwreck", "sour"];
      
      let indicaCount = 0;
      let sativaCount = 0;
      
      indicaParents.forEach(parent => {
        if (lowerGenetics.includes(parent)) indicaCount++;
      });
      
      sativaParents.forEach(parent => {
        if (lowerGenetics.includes(parent)) sativaCount++;
      });
      
      if (indicaCount > sativaCount && dbType === "Hybrid") {
        indicaPercent = 60;
        sativaPercent = 40;
      } else if (sativaCount > indicaCount && dbType === "Hybrid") {
        indicaPercent = 40;
        sativaPercent = 60;
      }
    }
    
    return {
      indicaPercent,
      sativaPercent,
      reasoning: [
        `Genetic baseline from strain database: ${dbType} classification`,
        genetics ? `Lineage: ${genetics}` : "",
      ].filter(Boolean),
      source: "database_primary",
    };
  }
  
  // Phase 7.3.1 — If strain is a close match, blend ratios from top 3–5 candidates
  if (candidateStrains && candidateStrains.length > 0) {
    const topCandidates = candidateStrains.slice(0, 5);
    const candidateWeights = topCandidates.map(c => c.confidence);
    const totalWeight = candidateWeights.reduce((sum, w) => sum + w, 0);
    
    const ratioSums = { indica: 0, sativa: 0 };
    
    topCandidates.forEach((candidate, index) => {
      const candidateDb = CULTIVAR_LIBRARY.find(s => 
        s.name.toLowerCase() === candidate.name.toLowerCase()
      );
      
      if (candidateDb) {
        const weight = candidateWeights[index] / totalWeight;
        const candidateType = candidateDb.type || candidateDb.dominantType;
        
        let candidateIndica: number;
        let candidateSativa: number;
        
        if (candidateType === "Indica") {
          candidateIndica = 75;
          candidateSativa = 25;
        } else if (candidateType === "Sativa") {
          candidateIndica = 25;
          candidateSativa = 75;
        } else {
          // Hybrid: infer from genetics if available
          const genetics = candidateDb.genetics || "";
          const lowerGenetics = genetics.toLowerCase();
          const indicaParents = ["afghan", "kush", "purple", "northern lights", "granddaddy"];
          const sativaParents = ["haze", "diesel", "jack", "trainwreck", "sour"];
          
          let indicaCount = 0;
          let sativaCount = 0;
          
          indicaParents.forEach(parent => {
            if (lowerGenetics.includes(parent)) indicaCount++;
          });
          
          sativaParents.forEach(parent => {
            if (lowerGenetics.includes(parent)) sativaCount++;
          });
          
          if (indicaCount > sativaCount) {
            candidateIndica = 60;
            candidateSativa = 40;
          } else if (sativaCount > indicaCount) {
            candidateIndica = 40;
            candidateSativa = 60;
          } else {
            candidateIndica = 50;
            candidateSativa = 50;
          }
        }
        
        ratioSums.indica += candidateIndica * weight;
        ratioSums.sativa += candidateSativa * weight;
      }
    });
    
    const blendedIndica = Math.round(ratioSums.indica * 10) / 10;
    const blendedSativa = Math.round(ratioSums.sativa * 10) / 10;
    
    return {
      indicaPercent: blendedIndica,
      sativaPercent: blendedSativa,
      reasoning: [
        `Ratio blended from top ${topCandidates.length} candidate strains (weighted by confidence)`,
        `Candidates: ${topCandidates.map(c => c.name).join(", ")}`,
      ],
      source: "database_blended",
    };
  }
  
  // Phase 7.3.1 — Default: balanced hybrid
  return {
    indicaPercent: 50,
    sativaPercent: 50,
    reasoning: ["No genetic data available. Defaulting to balanced hybrid."],
    source: "default",
  };
}

/**
 * Phase 7.3 Step 7.3.2 — PHENOTYPE MODULATION (LIMITED)
 * 
 * Adjust ratio slightly using visual cues:
 * 
 * Indica-leaning signals:
 * - Dense, compact buds
 * - Short internodes
 * - Broad leaves
 * - Heavy resin clustering
 * 
 * Sativa-leaning signals:
 * - Airy / elongated buds
 * - Foxtailing
 * - Narrow leaves
 * - Taller growth structure
 * 
 * Rules:
 * - Max ±10% shift
 * - Cannot flip dominance class
 * - Visuals refine, never override genetics
 */
function applyPhenotypeModulationV73(
  currentIndica: number,
  fusedFeatures?: FusedFeatures
): {
  adjustment: number; // ±10% max
  reasoning: string[];
} {
  if (!fusedFeatures) {
    return { adjustment: 0, reasoning: [] };
  }

  const reasoning: string[] = [];
  let adjustment = 0;
  
  // Phase 7.3.2 — Determine current dominance class
  const isIndicaDominant = currentIndica > 55;
  const isSativaDominant = currentIndica < 45;
  const isBalanced = currentIndica >= 45 && currentIndica <= 55;
  
  // Phase 7.3.2 — Indica-leaning signals
  let indicaSignals = 0;
  
  // Dense, compact buds
  if (fusedFeatures.budStructure === "high") {
    indicaSignals += 2;
    reasoning.push("Dense, compact bud structure suggests indica influence");
  }
  
  // Broad leaves
  if (fusedFeatures.leafShape === "broad") {
    indicaSignals += 2;
    reasoning.push("Broad leaves are characteristic of indica varieties");
  }
  
  // Heavy resin clustering
  if (fusedFeatures.trichomeDensity === "high") {
    indicaSignals += 1;
    reasoning.push("Heavy resin clustering often seen in indica-dominant strains");
  }
  
  // Phase 7.3.2 — Sativa-leaning signals
  let sativaSignals = 0;
  
  // Airy / elongated buds
  if (fusedFeatures.budStructure === "low") {
    sativaSignals += 2;
    reasoning.push("Airy, elongated bud structure suggests sativa influence");
  }
  
  // Narrow leaves
  if (fusedFeatures.leafShape === "narrow") {
    sativaSignals += 2;
    reasoning.push("Narrow leaves are characteristic of sativa varieties");
  }
  
  // Phase 7.3.2 — Calculate net adjustment
  const netSignals = indicaSignals - sativaSignals;
  
  if (netSignals > 0) {
    // Indica-leaning signals
    adjustment = Math.min(10, netSignals * 2); // Max +10%
  } else if (netSignals < 0) {
    // Sativa-leaning signals
    adjustment = Math.max(-10, netSignals * 2); // Max -10%
  }
  
  // Phase 7.3.2 — Cannot flip dominance class
  const newIndica = currentIndica + adjustment;
  
  if (isIndicaDominant && newIndica < 50) {
    // Would flip to sativa-dominant, cap at 50%
    adjustment = 50 - currentIndica;
    reasoning.push("Visual cues refined ratio but cannot override genetic indica dominance");
  } else if (isSativaDominant && newIndica > 50) {
    // Would flip to indica-dominant, cap at 50%
    adjustment = 50 - currentIndica;
    reasoning.push("Visual cues refined ratio but cannot override genetic sativa dominance");
  }
  
  if (adjustment !== 0) {
    reasoning.push(`Phenotype modulation: ${adjustment > 0 ? "+" : ""}${adjustment.toFixed(1)}% indica`);
  }
  
  return {
    adjustment: Math.round(adjustment * 10) / 10,
    reasoning,
  };
}

/**
 * Phase 7.3 Step 7.3.3 — MULTI-IMAGE CONSENSUS
 * 
 * Across 2–5 images:
 * - Average phenotype signals
 * - Penalize conflicting cues
 * - If variance is high:
 *   • Widen ratio band
 *   • Reduce confidence tier
 */
function applyMultiImageConsensusV73(
  currentIndica: number,
  imageResults?: ImageResult[],
  imageCount: number = 1
): {
  finalIndica: number;
  ratioRange?: { min: number; max: number };
  hasHighVariance: boolean;
  reasoning: string[];
} {
  if (!imageResults || imageResults.length <= 1) {
    return {
      finalIndica: currentIndica,
      hasHighVariance: false,
      reasoning: [],
    };
  }

  // Phase 7.3.3 — Collect phenotype signals from each image
  const phenotypeSignals: Array<{ indica: number; sativa: number }> = [];
  
  imageResults.forEach(result => {
    // Infer phenotype from wiki result or candidate strains
    // Simplified: use bud structure and leaf shape if available
    const wikiResult = result.wikiResult;
    const visualTraits = wikiResult?.visualTraits || [];
    
    let imageIndica = 50; // Default balanced
    let imageSativa = 50;
    
    // Check for indica/sativa indicators in visual traits
    const hasIndicaTraits = visualTraits.some(trait => 
      trait.toLowerCase().includes("dense") || 
      trait.toLowerCase().includes("broad") ||
      trait.toLowerCase().includes("compact")
    );
    
    const hasSativaTraits = visualTraits.some(trait => 
      trait.toLowerCase().includes("airy") || 
      trait.toLowerCase().includes("narrow") ||
      trait.toLowerCase().includes("elongated")
    );
    
    if (hasIndicaTraits && !hasSativaTraits) {
      imageIndica = 60;
      imageSativa = 40;
    } else if (hasSativaTraits && !hasIndicaTraits) {
      imageIndica = 40;
      imageSativa = 60;
    }
    
    phenotypeSignals.push({ indica: imageIndica, sativa: imageSativa });
  });
  
  // Phase 7.3.3 — Average phenotype signals
  const avgIndica = phenotypeSignals.reduce((sum, s) => sum + s.indica, 0) / phenotypeSignals.length;
  const avgSativa = phenotypeSignals.reduce((sum, s) => sum + s.sativa, 0) / phenotypeSignals.length;
  
  // Phase 7.3.3 — Calculate variance
  const variance = phenotypeSignals.reduce((sum, s) => {
    const diff = Math.abs(s.indica - avgIndica);
    return sum + (diff * diff);
  }, 0) / phenotypeSignals.length;
  
  const hasHighVariance = variance > 100; // Threshold for high variance
  
  // Phase 7.3.3 — Blend genetic baseline (70%) with image consensus (30%)
  const consensusIndica = (currentIndica * 0.7) + (avgIndica * 0.3);
  
  // Phase 7.3.3 — If variance is high, widen ratio band
  let ratioRange: { min: number; max: number } | undefined;
  if (hasHighVariance) {
    const rangeWidth = Math.sqrt(variance) * 0.5; // Convert variance to range width
    ratioRange = {
      min: Math.max(0, Math.round((consensusIndica - rangeWidth) * 10) / 10),
      max: Math.min(100, Math.round((consensusIndica + rangeWidth) * 10) / 10),
    };
  }
  
  const reasoning: string[] = [];
  if (hasHighVariance) {
    reasoning.push(`High variance detected across ${imageCount} images. Ratio band widened.`);
  } else if (imageCount >= 3) {
    reasoning.push(`Consistent phenotype signals across ${imageCount} images. Ratio stabilized.`);
  }
  
  return {
    finalIndica: Math.round(consensusIndica * 10) / 10,
    ratioRange,
    hasHighVariance,
    reasoning,
  };
}

/**
 * Phase 7.3 Step 7.3.4 — OUTPUT FORMAT
 * 
 * Always display as:
 * 
 * GENETIC BALANCE:
 * - Indica: 65%
 * - Sativa: 35%
 * - Classification: Indica-dominant Hybrid
 * 
 * If uncertain:
 * - "Hybrid (balanced)"
 * - Show range: "Indica-leaning (55–65%)"
 */
function formatOutputV73(
  indicaPercent: number,
  sativaPercent: number,
  ratioRange?: { min: number; max: number }
): {
  classification: "Indica" | "Sativa" | "Hybrid";
  dominanceLabel: "Indica-dominant" | "Sativa-dominant" | "Balanced" | undefined;
  displayText: string;
  classificationText: string;
} {
  // Phase 7.3.4 — Determine classification
  let classification: "Indica" | "Sativa" | "Hybrid";
  let dominanceLabel: "Indica-dominant" | "Sativa-dominant" | "Balanced" | undefined;
  
  if (indicaPercent >= 70) {
    classification = "Indica";
    dominanceLabel = undefined; // Pure indica, no dominance label needed
  } else if (sativaPercent >= 70) {
    classification = "Sativa";
    dominanceLabel = undefined; // Pure sativa, no dominance label needed
  } else if (indicaPercent > 55) {
    classification = "Hybrid";
    dominanceLabel = "Indica-dominant";
  } else if (sativaPercent > 55) {
    classification = "Hybrid";
    dominanceLabel = "Sativa-dominant";
  } else {
    classification = "Hybrid";
    dominanceLabel = "Balanced";
  }
  
  // Phase 7.3.4 — Format display text
  let displayText: string;
  if (ratioRange) {
    // Show range if uncertain
    displayText = `Indica: ${ratioRange.min}–${ratioRange.max}%, Sativa: ${100 - ratioRange.max}–${100 - ratioRange.min}%`;
  } else {
    displayText = `Indica: ${indicaPercent}%, Sativa: ${sativaPercent}%`;
  }
  
  // Phase 7.3.4 — Format classification text
  let classificationText: string;
  if (classification === "Indica" || classification === "Sativa") {
    classificationText = classification;
  } else {
    if (dominanceLabel === "Balanced") {
      classificationText = "Hybrid (balanced)";
    } else {
      classificationText = `${dominanceLabel} Hybrid`;
    }
  }
  
  return {
    classification,
    dominanceLabel,
    displayText,
    classificationText,
  };
}

/**
 * Phase 7.3 Step 7.3.5 — USER INTERPRETATION LAYER
 * 
 * Attach plain-language meaning:
 * - Indica-leaning → body relaxation, evening use
 * - Sativa-leaning → cerebral, daytime-friendly
 * - Hybrid → balanced effects
 * 
 * No medical claims.
 */
function generateInterpretationV73(
  classification: "Indica" | "Sativa" | "Hybrid",
  dominanceLabel?: "Indica-dominant" | "Sativa-dominant" | "Balanced"
): string {
  if (classification === "Indica") {
    return "Typically associated with body relaxation and evening use";
  } else if (classification === "Sativa") {
    return "Typically associated with cerebral effects and daytime-friendly use";
  } else {
    // Hybrid
    if (dominanceLabel === "Indica-dominant") {
      return "Balanced effects with body relaxation emphasis, suitable for evening use";
    } else if (dominanceLabel === "Sativa-dominant") {
      return "Balanced effects with cerebral emphasis, suitable for daytime use";
    } else {
      return "Balanced effects combining body relaxation and cerebral stimulation";
    }
  }
}

/**
 * Phase 7.3 — MAIN FUNCTION
 */
export function resolveStrainRatioV73(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  candidateStrains?: Array<{ name: string; confidence: number }>
): StrainRatioV73 {
  // Phase 7.3.1 — GENETIC BASELINE
  const geneticBaseline = getGeneticBaselineV73(strainName, dbEntry, candidateStrains);
  
  let currentIndica = geneticBaseline.indicaPercent;
  const explanation: string[] = [...geneticBaseline.reasoning];
  
  // Phase 7.3.2 — PHENOTYPE MODULATION (LIMITED)
  const phenotypeModulation = applyPhenotypeModulationV73(currentIndica, fusedFeatures);
  if (phenotypeModulation.adjustment !== 0) {
    currentIndica += phenotypeModulation.adjustment;
    explanation.push(...phenotypeModulation.reasoning);
  }
  
  // Phase 7.3.3 — MULTI-IMAGE CONSENSUS
  const consensus = applyMultiImageConsensusV73(currentIndica, imageResults, imageCount);
  const finalIndica = consensus.finalIndica;
  const finalSativa = Math.round((100 - finalIndica) * 10) / 10;
  
  if (consensus.reasoning.length > 0) {
    explanation.push(...consensus.reasoning);
  }
  
  // Phase 7.3.4 — OUTPUT FORMAT
  const output = formatOutputV73(finalIndica, finalSativa, consensus.ratioRange);
  
  // Phase 7.3.5 — USER INTERPRETATION LAYER
  const interpretation = generateInterpretationV73(output.classification, output.dominanceLabel);
  
  // Phase 7.3.5 — Determine confidence
  let confidence: "very_high" | "high" | "medium" | "low";
  let confidenceLabel: string;
  
  if (consensus.hasHighVariance) {
    confidence = "low";
    confidenceLabel = "Low: conflicting phenotype signals detected";
  } else if (geneticBaseline.source === "database_primary" && imageCount >= 3) {
    confidence = "very_high";
    confidenceLabel = "Very High: known strain + ≥3 images";
  } else if (geneticBaseline.source === "database_primary" && imageCount >= 1) {
    confidence = "high";
    confidenceLabel = "High: known strain + 1–2 images";
  } else if (geneticBaseline.source === "database_blended") {
    confidence = "medium";
    confidenceLabel = "Medium: blended from candidate strains";
  } else {
    confidence = "low";
    confidenceLabel = "Low: estimated from visual cues";
  }
  
  // Phase 7.3.5 — Determine source
  let source: StrainRatioV73["source"];
  if (consensus.hasHighVariance && phenotypeModulation.reasoning.length > 0 && geneticBaseline.source !== "default") {
    source = "database_visual_consensus";
  } else if (phenotypeModulation.reasoning.length > 0 && geneticBaseline.source !== "default") {
    source = "database_visual";
  } else if (geneticBaseline.source === "database_blended") {
    source = "database_blended";
  } else if (geneticBaseline.source === "database_primary") {
    source = "database_primary";
  } else {
    source = "inferred_visual";
  }
  
  return {
    indicaPercent: finalIndica,
    sativaPercent: finalSativa,
    classification: output.classification,
    dominanceLabel: output.dominanceLabel,
    displayText: output.displayText,
    classificationText: output.classificationText,
    ratioRange: consensus.ratioRange,
    confidence,
    confidenceLabel,
    interpretation,
    explanation,
    source,
  };
}
