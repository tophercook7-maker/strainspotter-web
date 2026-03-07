// lib/scanner/ratioEngineV75.ts
// Phase 7.5 — Indica / Sativa / Hybrid Ratio Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 7.5 — Ratio Result
 */
export type StrainRatioV75 = {
  indicaPercent: number; // 0-100
  sativaPercent: number; // 0-100
  classification: "Indica" | "Sativa" | "Hybrid";
  dominanceLabel: "Indica-Dominant" | "Sativa-Dominant" | "Balanced Hybrid" | "Indica-Leaning Hybrid" | "Sativa-Leaning Hybrid" | undefined;
  displayText: string; // "≈ 65% Indica / 35% Sativa"
  dominanceText: string; // "Hybrid leaning Indica"
  ratioRange?: { min: number; max: number }; // If uncertainty, show range
  confidence: "very_high" | "high" | "medium" | "low";
  confidenceLabel: string;
  uncertaintyDisclosure: string[]; // Always include disclaimers
  explanation: string[]; // Why this ratio was chosen
  source: "database_primary" | "database_blended" | "database_visual" | "database_visual_terpene" | "database_visual_terpene_consensus" | "inferred_visual" | "default";
};

/**
 * Phase 7.5 Step 7.5.1 — GENETIC BASELINE (PRIMARY)
 * 
 * If strain name or close match exists:
 * - Pull known dominance from strain DB
 * - Convert labels into ratios:
 *   • Indica → 80/20
 *   • Sativa → 20/80
 *   • Hybrid → 50/50
 * - If multiple candidate strains:
 *   • Weight by confidence
 *   • Average ratios across top candidates
 */
function getGeneticBaselineV75(
  strainName: string,
  dbEntry?: CultivarReference,
  candidateStrains?: Array<{ name: string; confidence: number }>
): {
  indicaPercent: number;
  sativaPercent: number;
  reasoning: string[];
  source: "database_primary" | "database_blended" | "default";
} {
  // Phase 7.5.1 — If strain identified, pull from database
  if (dbEntry) {
    const dbType = dbEntry.type || dbEntry.dominantType;
    
    // Phase 7.5.1 — Convert labels into ratios
    let indicaPercent: number;
    let sativaPercent: number;
    
    if (dbType === "Indica") {
      indicaPercent = 80;
      sativaPercent = 20;
    } else if (dbType === "Sativa") {
      indicaPercent = 20;
      sativaPercent = 80;
    } else {
      // Hybrid → 50/50
      indicaPercent = 50;
      sativaPercent = 50;
    }
    
    return {
      indicaPercent,
      sativaPercent,
      reasoning: [
        `Genetic baseline from strain database: ${dbType} classification → ${indicaPercent}% Indica / ${sativaPercent}% Sativa`,
      ],
      source: "database_primary",
    };
  }
  
  // Phase 7.5.1 — If multiple candidate strains, weight by confidence and average ratios
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
          candidateIndica = 80;
          candidateSativa = 20;
        } else if (candidateType === "Sativa") {
          candidateIndica = 20;
          candidateSativa = 80;
        } else {
          candidateIndica = 50;
          candidateSativa = 50;
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
  
  // Phase 7.5.1 — Default: balanced hybrid
  return {
    indicaPercent: 50,
    sativaPercent: 50,
    reasoning: ["No genetic data available. Defaulting to balanced hybrid (50/50)."],
    source: "default",
  };
}

/**
 * Phase 7.5 Step 7.5.2 — MORPHOLOGY ADJUSTMENTS
 * 
 * Visual traits (soft modifiers only):
 * 
 * Indica-leaning cues:
 * - Dense, chunky buds
 * - Short internodes
 * - Broad leaves
 * - Heavy trichome clustering
 * 
 * Sativa-leaning cues:
 * - Airy or elongated buds
 * - Long internodes
 * - Narrow leaves
 * - Foxtailing structures
 * 
 * Rules:
 * - Visuals adjust ratio by max ±15%
 * - Never override genetics
 * - Multiple images must agree to apply full adjustment
 */
function applyMorphologyAdjustmentsV75(
  currentIndica: number,
  fusedFeatures?: FusedFeatures,
  imageCount: number = 1
): {
  adjustment: number; // ±15% max
  reasoning: string[];
  requiresAgreement: boolean;
} {
  if (!fusedFeatures) {
    return { adjustment: 0, reasoning: [], requiresAgreement: false };
  }

  const reasoning: string[] = [];
  let adjustment = 0;
  
  // Phase 7.5.2 — Determine current dominance class
  const isIndicaDominant = currentIndica > 55;
  const isSativaDominant = currentIndica < 45;
  const isBalanced = currentIndica >= 45 && currentIndica <= 55;
  
  // Phase 7.5.2 — Indica-leaning cues
  let indicaSignals = 0;
  
  // Dense, chunky buds
  if (fusedFeatures.budStructure === "high") {
    indicaSignals += 3;
    reasoning.push("Dense, chunky bud structure suggests indica influence");
  }
  
  // Broad leaves
  if (fusedFeatures.leafShape === "broad") {
    indicaSignals += 2;
    reasoning.push("Broad leaves are characteristic of indica varieties");
  }
  
  // Heavy trichome clustering
  if (fusedFeatures.trichomeDensity === "high") {
    indicaSignals += 2;
    reasoning.push("Heavy trichome clustering often seen in indica-dominant strains");
  }
  
  // Phase 7.5.2 — Sativa-leaning cues
  let sativaSignals = 0;
  
  // Airy or elongated buds
  if (fusedFeatures.budStructure === "low") {
    sativaSignals += 3;
    reasoning.push("Airy or elongated bud structure suggests sativa influence");
  }
  
  // Narrow leaves
  if (fusedFeatures.leafShape === "narrow") {
    sativaSignals += 2;
    reasoning.push("Narrow leaves are characteristic of sativa varieties");
  }
  
  // Phase 7.5.2 — Calculate net adjustment
  const netSignals = indicaSignals - sativaSignals;
  
  if (netSignals > 0) {
    // Indica-leaning signals
    adjustment = Math.min(15, netSignals * 2.5); // Max +15%
  } else if (netSignals < 0) {
    // Sativa-leaning signals
    adjustment = Math.max(-15, netSignals * 2.5); // Max -15%
  }
  
  // Phase 7.5.2 — Multiple images must agree to apply full adjustment
  const requiresAgreement = imageCount < 2;
  if (requiresAgreement) {
    adjustment = adjustment * 0.5; // Reduce adjustment by 50% if only 1 image
    reasoning.push("Single image: adjustment reduced (multiple images required for full confidence)");
  }
  
  // Phase 7.5.2 — Never override genetics
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
    reasoning.push(`Morphology adjustment: ${adjustment > 0 ? "+" : ""}${adjustment.toFixed(1)}% indica`);
  }
  
  return {
    adjustment: Math.round(adjustment * 10) / 10,
    reasoning,
    requiresAgreement,
  };
}

/**
 * Phase 7.5 Step 7.5.3 — TERPENE SUPPORT SIGNALS
 * 
 * Use terpene profile as secondary confirmation:
 * 
 * Indica-leaning terpenes:
 * - Myrcene
 * - Linalool
 * - Caryophyllene
 * 
 * Sativa-leaning terpenes:
 * - Limonene
 * - Terpinolene
 * - Pinene
 * 
 * Rules:
 * - Terpenes can reinforce but not flip dominance
 * - Max ±10% influence
 * - Conflicts widen uncertainty band
 */
function applyTerpeneSupportSignalsV75(
  currentIndica: number,
  terpeneProfile?: Array<{ name: string; likelihood: string }>
): {
  adjustment: number; // ±10% max
  reasoning: string[];
  hasConflict: boolean;
} {
  if (!terpeneProfile || terpeneProfile.length === 0) {
    return { adjustment: 0, reasoning: [], hasConflict: false };
  }

  const reasoning: string[] = [];
  let adjustment = 0;
  let hasConflict = false;
  
  // Phase 7.5.3 — Determine current dominance class
  const isIndicaDominant = currentIndica > 55;
  const isSativaDominant = currentIndica < 45;
  
  // Phase 7.5.3 — Indica-leaning terpenes
  const indicaTerpenes = ["myrcene", "linalool", "caryophyllene"];
  let indicaTerpeneCount = 0;
  
  terpeneProfile.forEach(terpene => {
    const nameLower = terpene.name.toLowerCase();
    if (indicaTerpenes.includes(nameLower)) {
      const likelihood = terpene.likelihood.toLowerCase();
      if (likelihood === "high" || likelihood === "medium") {
        indicaTerpeneCount += 2;
      } else {
        indicaTerpeneCount += 1;
      }
    }
  });
  
  // Phase 7.5.3 — Sativa-leaning terpenes
  const sativaTerpenes = ["limonene", "terpinolene", "pinene"];
  let sativaTerpeneCount = 0;
  
  terpeneProfile.forEach(terpene => {
    const nameLower = terpene.name.toLowerCase();
    if (sativaTerpenes.includes(nameLower)) {
      const likelihood = terpene.likelihood.toLowerCase();
      if (likelihood === "high" || likelihood === "medium") {
        sativaTerpeneCount += 2;
      } else {
        sativaTerpeneCount += 1;
      }
    }
  });
  
  // Phase 7.5.3 — Calculate net adjustment
  const netTerpeneSignals = indicaTerpeneCount - sativaTerpeneCount;
  
  if (netTerpeneSignals > 0) {
    // Indica-leaning terpenes
    adjustment = Math.min(10, netTerpeneSignals * 1.5); // Max +10%
    reasoning.push("Terpene profile supports indica-leaning ratio");
  } else if (netTerpeneSignals < 0) {
    // Sativa-leaning terpenes
    adjustment = Math.max(-10, netTerpeneSignals * 1.5); // Max -10%
    reasoning.push("Terpene profile supports sativa-leaning ratio");
  }
  
  // Phase 7.5.3 — Detect conflicts
  if (isIndicaDominant && netTerpeneSignals < -2) {
    // Indica-dominant but sativa-leaning terpenes
    hasConflict = true;
    reasoning.push("Terpene profile conflicts with genetic indica dominance (uncertainty widened)");
  } else if (isSativaDominant && netTerpeneSignals > 2) {
    // Sativa-dominant but indica-leaning terpenes
    hasConflict = true;
    reasoning.push("Terpene profile conflicts with genetic sativa dominance (uncertainty widened)");
  }
  
  // Phase 7.5.3 — Terpenes can reinforce but not flip dominance
  const newIndica = currentIndica + adjustment;
  
  if (isIndicaDominant && newIndica < 50) {
    // Would flip to sativa-dominant, cap at 50%
    adjustment = 50 - currentIndica;
    reasoning.push("Terpenes reinforced ratio but cannot override genetic indica dominance");
  } else if (isSativaDominant && newIndica > 50) {
    // Would flip to indica-dominant, cap at 50%
    adjustment = 50 - currentIndica;
    reasoning.push("Terpenes reinforced ratio but cannot override genetic sativa dominance");
  }
  
  if (adjustment !== 0) {
    reasoning.push(`Terpene support: ${adjustment > 0 ? "+" : ""}${adjustment.toFixed(1)}% indica`);
  }
  
  return {
    adjustment: Math.round(adjustment * 10) / 10,
    reasoning,
    hasConflict,
  };
}

/**
 * Phase 7.5 Step 7.5.4 — MULTI-IMAGE CONSENSUS
 * 
 * Across images:
 * - Stable morphology → tighten ratio
 * - Conflicting structure → widen hybrid band
 * - One-off traits → ignored
 * 
 * Confidence scaling:
 * - 1 image → Broad ratio (e.g. 60/40)
 * - 2 images → Moderate precision (65/35)
 * - 3+ images → Narrow band (70/30, 55/45, etc.)
 */
function applyMultiImageConsensusV75(
  currentIndica: number,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  hasConflict: boolean = false
): {
  finalIndica: number;
  ratioRange?: { min: number; max: number };
  reasoning: string[];
} {
  if (!imageResults || imageResults.length <= 1) {
    // Phase 7.5.4 — 1 image → Broad ratio
    const rangeWidth = 10; // ±10% range
    return {
      finalIndica: currentIndica,
      ratioRange: {
        min: Math.max(0, Math.round((currentIndica - rangeWidth) * 10) / 10),
        max: Math.min(100, Math.round((currentIndica + rangeWidth) * 10) / 10),
      },
      reasoning: ["Single image: broad ratio range applied (±10%)"],
    };
  }

  // Phase 7.5.4 — Collect morphology signals from each image
  const morphologySignals: number[] = [];
  
  imageResults.forEach(result => {
    // Infer morphology from wiki result or visual traits
    const wikiResult = result.wikiResult;
    const visualTraits = wikiResult?.visualTraits || [];
    
    let imageIndica = 50; // Default balanced
    
    // Check for indica/sativa indicators
    const hasIndicaTraits = visualTraits.some(trait => 
      trait.toLowerCase().includes("dense") || 
      trait.toLowerCase().includes("broad") ||
      trait.toLowerCase().includes("chunky")
    );
    
    const hasSativaTraits = visualTraits.some(trait => 
      trait.toLowerCase().includes("airy") || 
      trait.toLowerCase().includes("narrow") ||
      trait.toLowerCase().includes("elongated")
    );
    
    if (hasIndicaTraits && !hasSativaTraits) {
      imageIndica = 65;
    } else if (hasSativaTraits && !hasIndicaTraits) {
      imageIndica = 35;
    }
    
    morphologySignals.push(imageIndica);
  });
  
  // Phase 7.5.4 — Calculate variance
  const avgMorphology = morphologySignals.reduce((sum, s) => sum + s, 0) / morphologySignals.length;
  const variance = morphologySignals.reduce((sum, s) => {
    const diff = Math.abs(s - avgMorphology);
    return sum + (diff * diff);
  }, 0) / morphologySignals.length;
  
  const hasConflictingStructure = variance > 100 || hasConflict;
  
  // Phase 7.5.4 — Blend genetic baseline (70%) with image consensus (30%)
  const consensusIndica = (currentIndica * 0.7) + (avgMorphology * 0.3);
  
  // Phase 7.5.4 — Confidence scaling based on image count
  let rangeWidth: number;
  if (hasConflictingStructure) {
    // Conflicting structure → widen hybrid band
    rangeWidth = 15; // ±15% range
  } else if (imageCount >= 3) {
    // 3+ images → Narrow band
    rangeWidth = 5; // ±5% range
  } else if (imageCount === 2) {
    // 2 images → Moderate precision
    rangeWidth = 8; // ±8% range
  } else {
    // 1 image → Broad ratio
    rangeWidth = 10; // ±10% range
  }
  
  const reasoning: string[] = [];
  if (hasConflictingStructure) {
    reasoning.push(`Conflicting structure detected across ${imageCount} images. Hybrid band widened (±${rangeWidth}%).`);
  } else if (imageCount >= 3) {
    reasoning.push(`Stable morphology across ${imageCount} images. Ratio tightened (±${rangeWidth}%).`);
  } else if (imageCount === 2) {
    reasoning.push(`Moderate precision with ${imageCount} images (±${rangeWidth}%).`);
  }
  
  return {
    finalIndica: Math.round(consensusIndica * 10) / 10,
    ratioRange: {
      min: Math.max(0, Math.round((consensusIndica - rangeWidth) * 10) / 10),
      max: Math.min(100, Math.round((consensusIndica + rangeWidth) * 10) / 10),
    },
    reasoning,
  };
}

/**
 * Phase 7.5 Step 7.5.5 — OUTPUT FORMAT
 * 
 * Display as:
 * 
 * DOMINANCE:
 * Hybrid leaning Indica  
 * ≈ 65% Indica / 35% Sativa
 * 
 * Optional badges:
 * - "Balanced Hybrid"
 * - "Indica-Dominant"
 * - "Sativa-Leaning Hybrid"
 */
function formatOutputV75(
  indicaPercent: number,
  sativaPercent: number,
  ratioRange?: { min: number; max: number }
): {
  classification: "Indica" | "Sativa" | "Hybrid";
  dominanceLabel: "Indica-Dominant" | "Sativa-Dominant" | "Balanced Hybrid" | "Indica-Leaning Hybrid" | "Sativa-Leaning Hybrid" | undefined;
  displayText: string;
  dominanceText: string;
} {
  // Phase 7.5.5 — Determine classification
  let classification: "Indica" | "Sativa" | "Hybrid";
  let dominanceLabel: "Indica-Dominant" | "Sativa-Dominant" | "Balanced Hybrid" | "Indica-Leaning Hybrid" | "Sativa-Leaning Hybrid" | undefined;
  
  if (indicaPercent >= 75) {
    classification = "Indica";
    dominanceLabel = "Indica-Dominant";
  } else if (sativaPercent >= 75) {
    classification = "Sativa";
    dominanceLabel = "Sativa-Dominant";
  } else if (indicaPercent > 60) {
    classification = "Hybrid";
    dominanceLabel = "Indica-Leaning Hybrid";
  } else if (sativaPercent > 60) {
    classification = "Hybrid";
    dominanceLabel = "Sativa-Leaning Hybrid";
  } else if (indicaPercent >= 45 && indicaPercent <= 55) {
    classification = "Hybrid";
    dominanceLabel = "Balanced Hybrid";
  } else if (indicaPercent > 55) {
    classification = "Hybrid";
    dominanceLabel = "Indica-Leaning Hybrid";
  } else {
    classification = "Hybrid";
    dominanceLabel = "Sativa-Leaning Hybrid";
  }
  
  // Phase 7.5.5 — Format display text
  let displayText: string;
  if (ratioRange) {
    displayText = `≈ ${ratioRange.min}–${ratioRange.max}% Indica / ${100 - ratioRange.max}–${100 - ratioRange.min}% Sativa`;
  } else {
    displayText = `≈ ${indicaPercent}% Indica / ${sativaPercent}% Sativa`;
  }
  
  // Phase 7.5.5 — Format dominance text
  let dominanceText: string;
  if (classification === "Indica") {
    dominanceText = "Indica";
  } else if (classification === "Sativa") {
    dominanceText = "Sativa";
  } else {
    if (dominanceLabel === "Balanced Hybrid") {
      dominanceText = "Balanced Hybrid";
    } else if (dominanceLabel === "Indica-Leaning Hybrid") {
      dominanceText = "Hybrid leaning Indica";
    } else if (dominanceLabel === "Sativa-Leaning Hybrid") {
      dominanceText = "Hybrid leaning Sativa";
    } else {
      dominanceText = "Hybrid";
    }
  }
  
  return {
    classification,
    dominanceLabel,
    displayText,
    dominanceText,
  };
}

/**
 * Phase 7.5 Step 7.5.6 — UNCERTAINTY DISCLOSURE
 * 
 * Always include:
 * - "Based on genetic references and visual traits"
 * - "Exact ratios vary by phenotype and grow conditions"
 */
function generateUncertaintyDisclosureV75(): string[] {
  return [
    "Based on genetic references and visual traits",
    "Exact ratios vary by phenotype and grow conditions",
  ];
}

/**
 * Phase 7.5 — MAIN FUNCTION
 */
export function resolveStrainRatioV75(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: Array<{ name: string; likelihood: string }>,
  candidateStrains?: Array<{ name: string; confidence: number }>
): StrainRatioV75 {
  // Phase 7.5.1 — GENETIC BASELINE (PRIMARY)
  const geneticBaseline = getGeneticBaselineV75(strainName, dbEntry, candidateStrains);
  
  let currentIndica = geneticBaseline.indicaPercent;
  const explanation: string[] = [...geneticBaseline.reasoning];
  
  // Phase 7.5.2 — MORPHOLOGY ADJUSTMENTS
  const morphologyAdjustment = applyMorphologyAdjustmentsV75(currentIndica, fusedFeatures, imageCount);
  if (morphologyAdjustment.adjustment !== 0) {
    currentIndica += morphologyAdjustment.adjustment;
    explanation.push(...morphologyAdjustment.reasoning);
  }
  
  // Phase 7.5.3 — TERPENE SUPPORT SIGNALS
  const terpeneSupport = applyTerpeneSupportSignalsV75(currentIndica, terpeneProfile);
  if (terpeneSupport.adjustment !== 0) {
    currentIndica += terpeneSupport.adjustment;
    explanation.push(...terpeneSupport.reasoning);
  }
  
  // Phase 7.5.4 — MULTI-IMAGE CONSENSUS
  const consensus = applyMultiImageConsensusV75(
    currentIndica,
    imageResults,
    imageCount,
    terpeneSupport.hasConflict
  );
  const finalIndica = consensus.finalIndica;
  const finalSativa = Math.round((100 - finalIndica) * 10) / 10;
  
  if (consensus.reasoning.length > 0) {
    explanation.push(...consensus.reasoning);
  }
  
  // Phase 7.5.5 — OUTPUT FORMAT
  const output = formatOutputV75(finalIndica, finalSativa, consensus.ratioRange);
  
  // Phase 7.5.6 — UNCERTAINTY DISCLOSURE
  const uncertaintyDisclosure = generateUncertaintyDisclosureV75();
  
  // Phase 7.5.6 — Determine confidence
  let confidence: "very_high" | "high" | "medium" | "low";
  let confidenceLabel: string;
  
  if (terpeneSupport.hasConflict || (consensus.ratioRange && (consensus.ratioRange.max - consensus.ratioRange.min) > 15)) {
    confidence = "low";
    confidenceLabel = "Low: conflicting signals or high uncertainty";
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
  
  // Phase 7.5.6 — Determine source
  let source: StrainRatioV75["source"];
  if (terpeneSupport.hasConflict && morphologyAdjustment.reasoning.length > 0 && geneticBaseline.source !== "default") {
    source = "database_visual_terpene_consensus";
  } else if (terpeneSupport.reasoning.length > 0 && morphologyAdjustment.reasoning.length > 0 && geneticBaseline.source !== "default") {
    source = "database_visual_terpene";
  } else if (morphologyAdjustment.reasoning.length > 0 && geneticBaseline.source !== "default") {
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
    dominanceText: output.dominanceText,
    ratioRange: consensus.ratioRange,
    confidence,
    confidenceLabel,
    uncertaintyDisclosure,
    explanation,
    source,
  };
}
