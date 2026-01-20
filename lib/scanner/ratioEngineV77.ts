// lib/scanner/ratioEngineV77.ts
// Phase 7.7 — Indica / Sativa / Hybrid Ratio Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 7.7 — Ratio Result
 */
export type StrainRatioV77 = {
  indicaPercent: number; // 0-100 (max 95, min 5)
  sativaPercent: number; // 0-100 (max 95, min 5)
  classification: "Indica" | "Sativa" | "Hybrid";
  dominanceLabel: "Indica-Dominant" | "Sativa-Dominant" | "Balanced Hybrid" | "Indica-Leaning Hybrid" | "Sativa-Leaning Hybrid" | undefined;
  displayText: string; // "70% Indica / 30% Sativa"
  humanReadableLabel: string; // "Indica-dominant (70% Indica / 30% Sativa)"
  ratioRange?: { min: number; max: number }; // Uncertainty range
  confidence: "very_high" | "high" | "medium" | "low";
  confidenceLabel: string;
  confidenceStatement: string; // "This ratio is based on visual traits, reference genetics, and observed consensus across multiple images."
  explanation: string[]; // Why this ratio exists
  source: "database_primary" | "database_blended" | "database_visual" | "database_visual_terpene" | "database_visual_terpene_consensus" | "inferred_visual" | "default";
};

/**
 * Phase 7.7 Step 7.7.1 — SOURCE SIGNALS
 * 
 * Collect dominance signals from:
 * 
 * A) STRAIN DATABASE (35,000)
 * - Known dominance ratios
 * - Parent genetics
 * - Historical classifications
 * - Consensus across sources
 * 
 * B) VISUAL MORPHOLOGY
 * Indica-leaning traits:
 * - Dense, compact buds
 * - Broad leaves
 * - Tight node spacing
 * - Heavy trichome clustering
 * 
 * Sativa-leaning traits:
 * - Airy / elongated buds
 * - Foxtailing
 * - Narrow leaves
 * - Taller structure indicators
 * 
 * C) TERPENE CORRELATION
 * Indica-skew:
 * - Myrcene dominant
 * - Linalool presence
 * - Caryophyllene support
 * 
 * Sativa-skew:
 * - Terpinolene
 * - Pinene
 * - Limonene-forward profiles
 */
function collectSourceSignalsV77(
  strainName: string,
  dbEntry?: CultivarReference,
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: Array<{ name: string; likelihood: string }>,
  candidateStrains?: Array<{ name: string; confidence: number }>
): {
  databaseSignal: { indicaPercent: number; sativaPercent: number; weight: number; reasoning: string[] };
  visualSignal: { indicaPercent: number; sativaPercent: number; weight: number; reasoning: string[] };
  terpeneSignal: { indicaPercent: number; sativaPercent: number; weight: number; reasoning: string[] };
} {
  // Phase 7.7.1 A) — STRAIN DATABASE SIGNAL
  let databaseIndica = 50;
  let databaseSativa = 50;
  const databaseReasoning: string[] = [];
  
  if (dbEntry) {
    const dbType = dbEntry.type || dbEntry.dominantType;
    
    if (dbType === "Indica") {
      databaseIndica = 80;
      databaseSativa = 20;
      databaseReasoning.push(`Strain database: ${strainName} is classified as Indica (80% Indica / 20% Sativa)`);
    } else if (dbType === "Sativa") {
      databaseIndica = 20;
      databaseSativa = 80;
      databaseReasoning.push(`Strain database: ${strainName} is classified as Sativa (20% Indica / 80% Sativa)`);
    } else {
      // Hybrid: try to infer from genetics
      const genetics = dbEntry.genetics || "";
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
        databaseIndica = 60;
        databaseSativa = 40;
        databaseReasoning.push(`Strain database: Hybrid inferred from parent genetics (${genetics}) → 60% Indica / 40% Sativa`);
      } else if (sativaCount > indicaCount) {
        databaseIndica = 40;
        databaseSativa = 60;
        databaseReasoning.push(`Strain database: Hybrid inferred from parent genetics (${genetics}) → 40% Indica / 60% Sativa`);
      } else {
        databaseIndica = 50;
        databaseSativa = 50;
        databaseReasoning.push(`Strain database: Balanced hybrid (50% Indica / 50% Sativa)`);
      }
    }
  } else if (candidateStrains && candidateStrains.length > 0) {
    // Phase 7.7.1 A) — Blend from candidate strains
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
    
    databaseIndica = Math.round(ratioSums.indica * 10) / 10;
    databaseSativa = Math.round(ratioSums.sativa * 10) / 10;
    databaseReasoning.push(`Blended from top ${topCandidates.length} candidate strains (weighted by confidence)`);
  } else {
    databaseReasoning.push("No genetic data available. Defaulting to balanced hybrid.");
  }
  
  // Phase 7.7.1 B) — VISUAL MORPHOLOGY SIGNAL
  let visualIndica = 50;
  let visualSativa = 50;
  const visualReasoning: string[] = [];
  
  if (fusedFeatures) {
    let indicaTraits = 0;
    let sativaTraits = 0;
    
    // Dense, compact buds
    if (fusedFeatures.budStructure === "high") {
      indicaTraits += 3;
      visualReasoning.push("Dense, compact bud structure suggests indica influence");
    } else if (fusedFeatures.budStructure === "low") {
      sativaTraits += 3;
      visualReasoning.push("Airy, elongated bud structure suggests sativa influence");
    }
    
    // Broad leaves
    if (fusedFeatures.leafShape === "broad") {
      indicaTraits += 2;
      visualReasoning.push("Broad leaves are characteristic of indica varieties");
    } else if (fusedFeatures.leafShape === "narrow") {
      sativaTraits += 2;
      visualReasoning.push("Narrow leaves are characteristic of sativa varieties");
    }
    
    // Heavy trichome clustering
    if (fusedFeatures.trichomeDensity === "high") {
      indicaTraits += 1;
      visualReasoning.push("Heavy trichome clustering often seen in indica-dominant strains");
    }
    
    // Phase 7.7.1 B) — Convert trait counts to ratio
    const totalTraits = indicaTraits + sativaTraits;
    if (totalTraits > 0) {
      visualIndica = 50 + (indicaTraits - sativaTraits) * 10; // ±10% per trait difference
      visualSativa = 100 - visualIndica;
      
      // Clamp to reasonable range
      visualIndica = Math.max(20, Math.min(80, visualIndica));
      visualSativa = 100 - visualIndica;
    }
  } else {
    visualReasoning.push("No visual morphology data available");
  }
  
  // Phase 7.7.1 C) — TERPENE CORRELATION SIGNAL
  let terpeneIndica = 50;
  let terpeneSativa = 50;
  const terpeneReasoning: string[] = [];
  
  if (terpeneProfile && terpeneProfile.length > 0) {
    const indicaTerpenes = ["myrcene", "linalool", "caryophyllene"];
    const sativaTerpenes = ["terpinolene", "pinene", "limonene"];
    
    let indicaTerpeneScore = 0;
    let sativaTerpeneScore = 0;
    
    terpeneProfile.forEach(terpene => {
      const nameLower = terpene.name.toLowerCase();
      const likelihood = terpene.likelihood.toLowerCase();
      const likelihoodWeight = likelihood === "high" ? 1.0 : likelihood === "medium" ? 0.7 : 0.4;
      
      if (indicaTerpenes.includes(nameLower)) {
        indicaTerpeneScore += likelihoodWeight;
        terpeneReasoning.push(`${terpene.name} (${likelihood}) supports indica-leaning profile`);
      } else if (sativaTerpenes.includes(nameLower)) {
        sativaTerpeneScore += likelihoodWeight;
        terpeneReasoning.push(`${terpene.name} (${likelihood}) supports sativa-leaning profile`);
      }
    });
    
    // Phase 7.7.1 C) — Convert terpene scores to ratio
    const totalTerpeneScore = indicaTerpeneScore + sativaTerpeneScore;
    if (totalTerpeneScore > 0) {
      terpeneIndica = 50 + ((indicaTerpeneScore - sativaTerpeneScore) / totalTerpeneScore) * 20; // ±20% max
      terpeneSativa = 100 - terpeneIndica;
      
      // Clamp to reasonable range
      terpeneIndica = Math.max(30, Math.min(70, terpeneIndica));
      terpeneSativa = 100 - terpeneIndica;
    }
  } else {
    terpeneReasoning.push("No terpene profile data available");
  }
  
  return {
    databaseSignal: {
      indicaPercent: databaseIndica,
      sativaPercent: databaseSativa,
      weight: 0.5, // 50%
      reasoning: databaseReasoning,
    },
    visualSignal: {
      indicaPercent: visualIndica,
      sativaPercent: visualSativa,
      weight: 0.3, // 30%
      reasoning: visualReasoning,
    },
    terpeneSignal: {
      indicaPercent: terpeneIndica,
      sativaPercent: terpeneSativa,
      weight: 0.2, // 20%
      reasoning: terpeneReasoning,
    },
  };
}

/**
 * Phase 7.7 Step 7.7.2 — WEIGHTED SCORING
 * 
 * Weight contributions:
 * 
 * - Database genetics: 50%
 * - Visual traits: 30%
 * - Terpene likelihood: 20%
 * 
 * Rules:
 * - No single signal can exceed 60%
 * - Visuals can correct outdated genetics
 * - Terpenes fine-tune, never override
 */
function applyWeightedScoringV77(
  databaseSignal: { indicaPercent: number; sativaPercent: number; weight: number; reasoning: string[] },
  visualSignal: { indicaPercent: number; sativaPercent: number; weight: number; reasoning: string[] },
  terpeneSignal: { indicaPercent: number; sativaPercent: number; weight: number; reasoning: string[] }
): {
  finalIndica: number;
  finalSativa: number;
  reasoning: string[];
} {
  // Phase 7.7.2 — Weighted combination
  const weightedIndica = 
    (databaseSignal.indicaPercent * databaseSignal.weight) +
    (visualSignal.indicaPercent * visualSignal.weight) +
    (terpeneSignal.indicaPercent * terpeneSignal.weight);
  
  const weightedSativa = 
    (databaseSignal.sativaPercent * databaseSignal.weight) +
    (visualSignal.sativaPercent * visualSignal.weight) +
    (terpeneSignal.sativaPercent * terpeneSignal.weight);
  
  // Phase 7.7.2 — Ensure no single signal exceeds 60%
  // Check if any signal is too dominant
  const dbContribution = Math.abs(databaseSignal.indicaPercent - 50) * databaseSignal.weight;
  const visualContribution = Math.abs(visualSignal.indicaPercent - 50) * visualSignal.weight;
  const terpeneContribution = Math.abs(terpeneSignal.indicaPercent - 50) * terpeneSignal.weight;
  
  const maxContribution = Math.max(dbContribution, visualContribution, terpeneContribution);
  
  let finalIndica = weightedIndica;
  let finalSativa = weightedSativa;
  const reasoning: string[] = [];
  
  if (maxContribution > 30) { // 30% of 50% = 15% shift, which is 60% of total
    // Phase 7.7.2 — Cap single signal contribution
    const scaleFactor = 30 / maxContribution;
    finalIndica = 50 + (weightedIndica - 50) * scaleFactor;
    finalSativa = 100 - finalIndica;
    reasoning.push("Single signal contribution capped to prevent over-reliance on one source");
  }
  
  // Phase 7.7.2 — Visuals can correct outdated genetics
  const dbVisualDiff = Math.abs(databaseSignal.indicaPercent - visualSignal.indicaPercent);
  if (dbVisualDiff > 30 && visualSignal.reasoning.length > 0) {
    // Large discrepancy: visuals may correct outdated genetics
    const correctionBoost = Math.min(5, dbVisualDiff * 0.1); // Up to +5% boost to visuals
    if (visualSignal.indicaPercent > databaseSignal.indicaPercent) {
      finalIndica += correctionBoost;
      finalSativa = 100 - finalIndica;
      reasoning.push("Visual traits correct genetic baseline (outdated genetics detected)");
    } else {
      finalIndica -= correctionBoost;
      finalSativa = 100 - finalIndica;
      reasoning.push("Visual traits correct genetic baseline (outdated genetics detected)");
    }
  }
  
  // Phase 7.7.2 — Terpenes fine-tune, never override
  const terpeneShift = terpeneSignal.indicaPercent - 50;
  if (Math.abs(terpeneShift) > 10) {
    // Terpenes can fine-tune by up to ±5%
    const fineTune = Math.sign(terpeneShift) * Math.min(5, Math.abs(terpeneShift) * 0.5);
    finalIndica += fineTune;
    finalSativa = 100 - finalIndica;
    reasoning.push("Terpene profile fine-tuned ratio");
  }
  
  return {
    finalIndica: Math.round(finalIndica * 10) / 10,
    finalSativa: Math.round(finalSativa * 10) / 10,
    reasoning: [
      ...databaseSignal.reasoning,
      ...visualSignal.reasoning,
      ...terpeneSignal.reasoning,
      ...reasoning,
    ],
  };
}

/**
 * Phase 7.7 Step 7.7.3 — MULTI-IMAGE CONSENSUS
 * 
 * With 2–5 images:
 * - Average morphology scores
 * - Penalize outlier images
 * - Boost agreement signals
 * 
 * Caps:
 * - 1 image → ±15% uncertainty
 * - 2 images → ±10%
 * - 3+ images → ±5%
 */
function applyMultiImageConsensusV77(
  currentIndica: number,
  imageResults?: ImageResult[],
  imageCount: number = 1
): {
  finalIndica: number;
  ratioRange: { min: number; max: number };
  reasoning: string[];
} {
  if (!imageResults || imageResults.length <= 1) {
    // Phase 7.7.3 — 1 image → ±15% uncertainty
    const rangeWidth = 15;
    return {
      finalIndica: currentIndica,
      ratioRange: {
        min: Math.max(5, Math.round((currentIndica - rangeWidth) * 10) / 10),
        max: Math.min(95, Math.round((currentIndica + rangeWidth) * 10) / 10),
      },
      reasoning: ["Single image: ±15% uncertainty range applied"],
    };
  }

  // Phase 7.7.3 — Collect morphology scores from each image
  const morphologyScores: number[] = [];
  
  imageResults.forEach(result => {
    const wikiResult = result.wikiResult;
    const visualTraits = wikiResult?.visualTraits || [];
    
    let imageIndica = 50;
    
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
      imageIndica = 65;
    } else if (hasSativaTraits && !hasIndicaTraits) {
      imageIndica = 35;
    }
    
    morphologyScores.push(imageIndica);
  });
  
  // Phase 7.7.3 — Average morphology scores
  const avgMorphology = morphologyScores.reduce((sum, s) => sum + s, 0) / morphologyScores.length;
  
  // Phase 7.7.3 — Calculate variance to detect outliers
  const variance = morphologyScores.reduce((sum, s) => {
    const diff = Math.abs(s - avgMorphology);
    return sum + (diff * diff);
  }, 0) / morphologyScores.length;
  
  const hasOutliers = variance > 100;
  
  // Phase 7.7.3 — Blend current ratio (70%) with image consensus (30%)
  const consensusIndica = (currentIndica * 0.7) + (avgMorphology * 0.3);
  
  // Phase 7.7.3 — Determine uncertainty cap based on image count
  let rangeWidth: number;
  if (hasOutliers) {
    // Outliers detected → wider range
    rangeWidth = imageCount >= 3 ? 10 : imageCount === 2 ? 12 : 15;
  } else if (imageCount >= 3) {
    // 3+ images → ±5%
    rangeWidth = 5;
  } else if (imageCount === 2) {
    // 2 images → ±10%
    rangeWidth = 10;
  } else {
    // 1 image → ±15%
    rangeWidth = 15;
  }
  
  const reasoning: string[] = [];
  if (hasOutliers) {
    reasoning.push(`Outlier images detected. Uncertainty range widened to ±${rangeWidth}%.`);
  } else if (imageCount >= 3) {
    reasoning.push(`Strong agreement across ${imageCount} images. Uncertainty range tightened to ±${rangeWidth}%.`);
  } else if (imageCount === 2) {
    reasoning.push(`Moderate agreement with ${imageCount} images. Uncertainty range: ±${rangeWidth}%.`);
  }
  
  return {
    finalIndica: Math.round(consensusIndica * 10) / 10,
    ratioRange: {
      min: Math.max(5, Math.round((consensusIndica - rangeWidth) * 10) / 10),
      max: Math.min(95, Math.round((consensusIndica + rangeWidth) * 10) / 10),
    },
    reasoning,
  };
}

/**
 * Phase 7.7 Step 7.7.4 — RATIO OUTPUT
 * 
 * Always output BOTH:
 * - Human-readable label
 * - Exact ratio estimate
 * 
 * Examples:
 * - Indica-dominant (70% Indica / 30% Sativa)
 * - Balanced Hybrid (50% / 50%)
 * - Sativa-leaning Hybrid (35% Indica / 65% Sativa)
 * 
 * Never output:
 * - "Pure Indica"
 * - "Pure Sativa"
 * (Max 95/5)
 */
function formatRatioOutputV77(
  indicaPercent: number,
  sativaPercent: number,
  ratioRange?: { min: number; max: number }
): {
  classification: "Indica" | "Sativa" | "Hybrid";
  dominanceLabel: "Indica-Dominant" | "Sativa-Dominant" | "Balanced Hybrid" | "Indica-Leaning Hybrid" | "Sativa-Leaning Hybrid" | undefined;
  displayText: string;
  humanReadableLabel: string;
} {
  // Phase 7.7.4 — Ensure never "Pure" (max 95/5)
  const clampedIndica = Math.max(5, Math.min(95, indicaPercent));
  const clampedSativa = Math.max(5, Math.min(95, sativaPercent));
  
  // Phase 7.7.4 — Determine classification
  let classification: "Indica" | "Sativa" | "Hybrid";
  let dominanceLabel: "Indica-Dominant" | "Sativa-Dominant" | "Balanced Hybrid" | "Indica-Leaning Hybrid" | "Sativa-Leaning Hybrid" | undefined;
  
  if (clampedIndica >= 70) {
    classification = "Indica";
    dominanceLabel = "Indica-Dominant";
  } else if (clampedSativa >= 70) {
    classification = "Sativa";
    dominanceLabel = "Sativa-Dominant";
  } else if (clampedIndica > 60) {
    classification = "Hybrid";
    dominanceLabel = "Indica-Leaning Hybrid";
  } else if (clampedSativa > 60) {
    classification = "Hybrid";
    dominanceLabel = "Sativa-Leaning Hybrid";
  } else if (clampedIndica >= 45 && clampedIndica <= 55) {
    classification = "Hybrid";
    dominanceLabel = "Balanced Hybrid";
  } else if (clampedIndica > 55) {
    classification = "Hybrid";
    dominanceLabel = "Indica-Leaning Hybrid";
  } else {
    classification = "Hybrid";
    dominanceLabel = "Sativa-Leaning Hybrid";
  }
  
  // Phase 7.7.4 — Format display text
  let displayText: string;
  if (ratioRange) {
    displayText = `${ratioRange.min}–${ratioRange.max}% Indica / ${100 - ratioRange.max}–${100 - ratioRange.min}% Sativa`;
  } else {
    displayText = `${clampedIndica}% Indica / ${clampedSativa}% Sativa`;
  }
  
  // Phase 7.7.4 — Format human-readable label
  let humanReadableLabel: string;
  if (classification === "Indica") {
    humanReadableLabel = `Indica-dominant (${clampedIndica}% Indica / ${clampedSativa}% Sativa)`;
  } else if (classification === "Sativa") {
    humanReadableLabel = `Sativa-dominant (${clampedIndica}% Indica / ${clampedSativa}% Sativa)`;
  } else {
    if (dominanceLabel === "Balanced Hybrid") {
      humanReadableLabel = `Balanced Hybrid (${clampedIndica}% / ${clampedSativa}%)`;
    } else if (dominanceLabel === "Indica-Leaning Hybrid") {
      humanReadableLabel = `Indica-leaning Hybrid (${clampedIndica}% Indica / ${clampedSativa}% Sativa)`;
    } else if (dominanceLabel === "Sativa-Leaning Hybrid") {
      humanReadableLabel = `Sativa-leaning Hybrid (${clampedIndica}% Indica / ${clampedSativa}% Sativa)`;
    } else {
      humanReadableLabel = `Hybrid (${clampedIndica}% Indica / ${clampedSativa}% Sativa)`;
    }
  }
  
  return {
    classification,
    dominanceLabel,
    displayText,
    humanReadableLabel,
  };
}

/**
 * Phase 7.7 Step 7.7.5 — CONFIDENCE STATEMENT
 * 
 * Attach explanation:
 * "This ratio is based on visual traits, reference genetics, and observed consensus across multiple images."
 */
function generateConfidenceStatementV77(imageCount: number): string {
  if (imageCount >= 3) {
    return "This ratio is based on visual traits, reference genetics, and observed consensus across multiple images.";
  } else if (imageCount === 2) {
    return "This ratio is based on visual traits, reference genetics, and consensus across 2 images.";
  } else {
    return "This ratio is based on visual traits and reference genetics.";
  }
}

/**
 * Phase 7.7 — MAIN FUNCTION
 */
export function resolveStrainRatioV77(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: Array<{ name: string; likelihood: string }>,
  candidateStrains?: Array<{ name: string; confidence: number }>
): StrainRatioV77 {
  // Phase 7.7.1 — SOURCE SIGNALS
  const sourceSignals = collectSourceSignalsV77(
    strainName,
    dbEntry,
    fusedFeatures,
    terpeneProfile,
    candidateStrains
  );
  
  // Phase 7.7.2 — WEIGHTED SCORING
  const weightedScoring = applyWeightedScoringV77(
    sourceSignals.databaseSignal,
    sourceSignals.visualSignal,
    sourceSignals.terpeneSignal
  );
  
  // Phase 7.7.3 — MULTI-IMAGE CONSENSUS
  const consensus = applyMultiImageConsensusV77(
    weightedScoring.finalIndica,
    imageResults,
    imageCount
  );
  
  // Phase 7.7.4 — RATIO OUTPUT
  const output = formatRatioOutputV77(consensus.finalIndica, consensus.finalSativa, consensus.ratioRange);
  
  // Phase 7.7.5 — CONFIDENCE STATEMENT
  const confidenceStatement = generateConfidenceStatementV77(imageCount);
  
  // Phase 7.7.5 — Determine confidence
  let confidence: "very_high" | "high" | "medium" | "low";
  let confidenceLabel: string;
  
  if (consensus.ratioRange && (consensus.ratioRange.max - consensus.ratioRange.min) > 15) {
    confidence = "low";
    confidenceLabel = "Low: high uncertainty detected";
  } else if (sourceSignals.databaseSignal.reasoning.length > 0 && sourceSignals.databaseSignal.reasoning[0].includes("Strain database") && imageCount >= 3) {
    confidence = "very_high";
    confidenceLabel = "Very High: known strain + ≥3 images";
  } else if (sourceSignals.databaseSignal.reasoning.length > 0 && sourceSignals.databaseSignal.reasoning[0].includes("Strain database") && imageCount >= 1) {
    confidence = "high";
    confidenceLabel = "High: known strain + 1–2 images";
  } else if (sourceSignals.databaseSignal.reasoning.length > 0 && sourceSignals.databaseSignal.reasoning[0].includes("Blended")) {
    confidence = "medium";
    confidenceLabel = "Medium: blended from candidate strains";
  } else {
    confidence = "low";
    confidenceLabel = "Low: estimated from visual cues";
  }
  
  // Phase 7.7.5 — Determine source
  let source: StrainRatioV77["source"];
  if (sourceSignals.terpeneSignal.reasoning.length > 0 && sourceSignals.visualSignal.reasoning.length > 0 && sourceSignals.databaseSignal.reasoning.length > 0 && !sourceSignals.databaseSignal.reasoning[0].includes("No genetic")) {
    source = "database_visual_terpene_consensus";
  } else if (sourceSignals.terpeneSignal.reasoning.length > 0 && sourceSignals.visualSignal.reasoning.length > 0 && sourceSignals.databaseSignal.reasoning.length > 0) {
    source = "database_visual_terpene";
  } else if (sourceSignals.visualSignal.reasoning.length > 0 && sourceSignals.databaseSignal.reasoning.length > 0) {
    source = "database_visual";
  } else if (sourceSignals.databaseSignal.reasoning.length > 0 && sourceSignals.databaseSignal.reasoning[0].includes("Blended")) {
    source = "database_blended";
  } else if (sourceSignals.databaseSignal.reasoning.length > 0 && sourceSignals.databaseSignal.reasoning[0].includes("Strain database")) {
    source = "database_primary";
  } else {
    source = "inferred_visual";
  }
  
  return {
    indicaPercent: consensus.finalIndica,
    sativaPercent: consensus.finalSativa,
    classification: output.classification,
    dominanceLabel: output.dominanceLabel,
    displayText: output.displayText,
    humanReadableLabel: output.humanReadableLabel,
    ratioRange: consensus.ratioRange,
    confidence,
    confidenceLabel,
    confidenceStatement,
    explanation: weightedScoring.reasoning.concat(consensus.reasoning),
    source,
  };
}
