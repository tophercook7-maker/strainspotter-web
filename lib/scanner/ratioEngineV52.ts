// lib/scanner/ratioEngineV52.ts
// Phase 5.2 — Indica / Sativa / Hybrid Ratio Engine
// Genetics + Terpene Weighting + Phenotype Signals

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NormalizedTerpeneProfile } from "./terpeneExperienceEngine";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 5.2 — Ratio Result
 */
export type StrainRatio = {
  indicaPercent: number; // 0-100
  sativaPercent: number; // 0-100
  dominance: "Indica" | "Sativa" | "Hybrid" | "Balanced";
  displayText: string; // "Hybrid (65% Indica / 35% Sativa)"
  confidence: "high" | "medium" | "low"; // Phase 5.2 Step 5.2.5
  explanation: {
    geneticBaseline: string; // Phase 5.2.1
    terpeneModulation?: string; // Phase 5.2.2
    phenotypeSignals?: string; // Phase 5.2.3
    multiImageConsensus?: string; // Phase 5.2.4
    source: "genetic_baseline" | "genetic_terpene" | "genetic_terpene_phenotype" | "genetic_terpene_phenotype_consensus" | "default";
  };
};

/**
 * Phase 5.2 Step 5.2.1 — GENETIC BASELINE
 * 
 * From the 35,000-strain database:
 * - Pull recorded lineage
 * - Map parents → indica/sativa bias
 * - Normalize to a baseline ratio
 */
function resolveGeneticBaseline(
  strainName: string,
  dbEntry?: CultivarReference
): { indicaPercent: number; sativaPercent: number; reasoning: string } | null {
  if (!dbEntry) {
    return null;
  }

  // Phase 5.2.1 — Try to infer from lineage (parents → indica/sativa bias)
  const genetics = dbEntry.genetics || "";
  
  // Check if we can parse parent strains from genetics string
  // Example: "OG Kush × Haze" or "OG Kush x Haze" or "Parent1 / Parent2"
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
      // Get parent ratios recursively (may need to infer from their lineage too)
      const parent1Baseline = resolveGeneticBaseline(parent1.name, parent1);
      const parent2Baseline = resolveGeneticBaseline(parent2.name, parent2);
      
      if (parent1Baseline && parent2Baseline) {
        const parent1Ratio = { indica: parent1Baseline.indicaPercent, sativa: parent1Baseline.sativaPercent };
        const parent2Ratio = { indica: parent2Baseline.indicaPercent, sativa: parent2Baseline.sativaPercent };
      
        // Average parent ratios
        const indicaPercent = Math.round((parent1Ratio.indica + parent2Ratio.indica) / 2);
        const sativaPercent = 100 - indicaPercent;
        
        return {
          indicaPercent,
          sativaPercent,
          reasoning: `Genetic baseline inferred from lineage: ${parent1.name} (${parent1Ratio.indica}% Indica) × ${parent2.name} (${parent2Ratio.indica}% Indica) → ${indicaPercent}% Indica / ${sativaPercent}% Sativa`,
        };
      }
    }
  }

  // Phase 5.2.1 — Fallback to dominance type
  const type = dbEntry.type || dbEntry.dominantType;
  const ratio = getTypeRatio(type);
  
  return {
    indicaPercent: ratio.indica,
    sativaPercent: ratio.sativa,
    reasoning: `Genetic baseline derived from database classification: ${strainName} is ${type}-dominant`,
  };
}

/**
 * Helper: Get ratio from type
 */
function getTypeRatio(type: "Indica" | "Sativa" | "Hybrid" | undefined): { indica: number; sativa: number } {
  if (type === "Indica") {
    return { indica: 70, sativa: 30 };
  } else if (type === "Sativa") {
    return { indica: 30, sativa: 70 };
  } else {
    return { indica: 50, sativa: 50 }; // Hybrid default
  }
}

/**
 * Phase 5.2 Step 5.2.2 — TERPENE MODULATION
 * 
 * Adjust baseline using terpene dominance:
 * 
 * Indica-leaning terpenes:
 * - Myrcene
 * - Caryophyllene
 * - Linalool
 * 
 * Sativa-leaning terpenes:
 * - Terpinolene
 * - Pinene
 * - Limonene
 * 
 * Apply soft shifts (±10–15% max).
 */
function applyTerpeneModulation(
  baselineIndica: number,
  terpeneProfile?: NormalizedTerpeneProfile
): { adjustment: number; reasoning: string } {
  if (!terpeneProfile || terpeneProfile.primaryTerpenes.length === 0) {
    return { adjustment: 0, reasoning: "" };
  }

  // Phase 5.2.2 — Define terpene bias
  const indicaTerpenes = ["myrcene", "caryophyllene", "linalool"];
  const sativaTerpenes = ["terpinolene", "pinene", "limonene"];

  // Phase 5.2.2 — Calculate terpene influence
  let indicaBias = 0;
  let sativaBias = 0;
  const terpeneReasons: string[] = [];

  const allTerpenes = [...terpeneProfile.primaryTerpenes, ...terpeneProfile.secondaryTerpenes];
  
  allTerpenes.forEach(terpene => {
    const terpeneName = terpene.name.toLowerCase();
    const dominanceWeight = terpene.dominanceScore;
    
    if (indicaTerpenes.includes(terpeneName)) {
      // Indica-leaning terpenes boost indica percentage
      indicaBias += dominanceWeight * 0.5; // Each terpene contributes up to 50% of its dominance
      terpeneReasons.push(`${terpene.name} (Indica-leaning)`);
    } else if (sativaTerpenes.includes(terpeneName)) {
      // Sativa-leaning terpenes boost sativa percentage (reduce indica)
      sativaBias += dominanceWeight * 0.5;
      terpeneReasons.push(`${terpene.name} (Sativa-leaning)`);
    }
  });

  // Phase 5.2.2 — Net adjustment: positive = more indica, negative = more sativa
  let netAdjustment = (indicaBias - sativaBias) * 15; // Scale to ±15% max
  
  // Phase 5.2.2 — Cap at ±10–15% max
  if (netAdjustment > 15) netAdjustment = 15;
  if (netAdjustment < -15) netAdjustment = -15;

  // Phase 5.2.2 — Apply adjustment relative to baseline (so we don't exceed 0-100 bounds)
  const adjustedIndica = baselineIndica + netAdjustment;
  if (adjustedIndica < 20) {
    netAdjustment = 20 - baselineIndica; // Cap at 20% minimum (never pure sativa)
  } else if (adjustedIndica > 80) {
    netAdjustment = 80 - baselineIndica; // Cap at 80% maximum (never pure indica)
  }

  const reasoning = terpeneReasons.length > 0
    ? `Terpene modulation (${terpeneReasons.slice(0, 3).join(", ")}): ${netAdjustment > 0 ? '+' : ''}${netAdjustment.toFixed(1)}% ${netAdjustment > 0 ? 'Indica' : 'Sativa'}`
    : "";

  return {
    adjustment: Math.round(netAdjustment * 10) / 10, // Round to 1 decimal
    reasoning,
  };
}

/**
 * Phase 5.2 Step 5.2.3 — IMAGE-BASED PHENOTYPE SIGNALS
 * 
 * From visual analysis:
 * - Leaf width
 * - Bud density
 * - Internodal spacing
 * - Resin expression
 * 
 * Each signal nudges ratio slightly (±5%).
 * Never overrides genetics.
 */
function applyPhenotypeSignals(
  currentIndica: number,
  fusedFeatures?: FusedFeatures,
  imageResults?: ImageResult[]
): { adjustment: number; reasoning: string } {
  if (!fusedFeatures) {
    return { adjustment: 0, reasoning: "" };
  }

  let netAdjustment = 0;
  const signalReasons: string[] = [];

  // Phase 5.2.3 — Leaf width (broad → Indica, narrow → Sativa)
  if (fusedFeatures.leafShape === "broad") {
    netAdjustment += 3; // +3% Indica
    signalReasons.push("broad leaves (+3% Indica)");
  } else if (fusedFeatures.leafShape === "narrow") {
    netAdjustment -= 3; // -3% Indica (more Sativa)
    signalReasons.push("narrow leaves (+3% Sativa)");
  }

  // Phase 5.2.3 — Bud density (high/dense → Indica, low/airy → Sativa)
  if (fusedFeatures.budStructure === "high") {
    netAdjustment += 2; // +2% Indica
    signalReasons.push("dense bud structure (+2% Indica)");
  } else if (fusedFeatures.budStructure === "low") {
    netAdjustment -= 2; // -2% Indica (more Sativa)
    signalReasons.push("airy bud structure (+2% Sativa)");
  }

  // Phase 5.2.3 — Trichome/resin expression (high → Indica-leaning, but can vary)
  if (fusedFeatures.trichomeDensity === "high") {
    // High resin is common in both, but slightly favors Indica
    netAdjustment += 1;
    signalReasons.push("high resin expression (+1% Indica)");
  }

  // Phase 5.2.3 — Cap each signal at ±5% total
  if (netAdjustment > 5) netAdjustment = 5;
  if (netAdjustment < -5) netAdjustment = -5;

  // Phase 5.2.3 — Ensure we never override genetics (keep within 20-80% bounds)
  const adjustedIndica = currentIndica + netAdjustment;
  if (adjustedIndica < 20) {
    netAdjustment = 20 - currentIndica; // Cap at 20% minimum
  } else if (adjustedIndica > 80) {
    netAdjustment = 80 - currentIndica; // Cap at 80% maximum
  }

  const reasoning = signalReasons.length > 0
    ? `Phenotype signals: ${signalReasons.join(", ")} (${netAdjustment > 0 ? '+' : ''}${netAdjustment.toFixed(1)}% ${netAdjustment > 0 ? 'Indica' : 'Sativa'})`
    : "";

  return {
    adjustment: Math.round(netAdjustment * 10) / 10, // Round to 1 decimal
    reasoning,
  };
}

/**
 * Phase 5.2 Step 5.2.4 — MULTI-IMAGE CONSENSUS
 * 
 * Across 2–5 images:
 * - Average phenotype signals
 * - Penalize conflicting morphology
 * - Boost consistent traits
 * 
 * Result:
 * Stabilized ratio with confidence tier.
 */
function applyMultiImageConsensus(
  currentIndica: number,
  imageResults?: ImageResult[]
): { adjustment: number; reasoning: string; confidence: "high" | "medium" | "low" } {
  if (!imageResults || imageResults.length <= 1) {
    return { adjustment: 0, reasoning: "", confidence: "medium" };
  }

  // Phase 5.2.4 — Collect phenotype signals from each image
  const imagePhenotypes: Array<{ indicaPercent: number; confidence: number }> = [];

  imageResults.forEach(result => {
    const wikiDominance = result.wikiResult?.genetics?.dominance;
    if (wikiDominance && wikiDominance !== "Unknown") {
      const ratio = getTypeRatio(wikiDominance as "Indica" | "Sativa" | "Hybrid");
      const imageConfidence = result.candidateStrains[0]?.confidence || 70;
      imagePhenotypes.push({
        indicaPercent: ratio.indica,
        confidence: imageConfidence,
      });
    }
  });

  if (imagePhenotypes.length === 0) {
    return { adjustment: 0, reasoning: "", confidence: "medium" };
  }

  // Phase 5.2.4 — Calculate weighted average (confidence-weighted)
  const totalWeight = imagePhenotypes.reduce((sum, p) => sum + p.confidence, 0);
  const avgIndica = imagePhenotypes.reduce((sum, p) => sum + (p.indicaPercent * p.confidence), 0) / totalWeight;

  // Phase 5.2.4 — Calculate variance to detect conflicts
  const variance = imagePhenotypes.reduce((sum, p) => {
    const diff = p.indicaPercent - avgIndica;
    return sum + (diff * diff * p.confidence);
  }, 0) / totalWeight;

  // Phase 5.2.4 — Net adjustment from consensus
  let netAdjustment = avgIndica - currentIndica;

  // Phase 5.2.4 — Penalize conflicting morphology (high variance = low confidence)
  const stdDev = Math.sqrt(variance);
  if (stdDev > 15) {
    // High variance: reduce adjustment by 50% (penalize conflicts)
    netAdjustment *= 0.5;
    // Lower confidence
  }

  // Phase 5.2.4 — Boost consistent traits (low variance = high confidence)
  const isConsistent = stdDev < 8;
  if (isConsistent && imageResults.length >= 3) {
    // Very consistent across 3+ images: slight boost
    netAdjustment *= 1.1;
  }

  // Phase 5.2.4 — Cap adjustment at ±5%
  if (netAdjustment > 5) netAdjustment = 5;
  if (netAdjustment < -5) netAdjustment = -5;

  // Phase 5.2.4 — Determine confidence
  let confidence: "high" | "medium" | "low";
  if (isConsistent && imageResults.length >= 3) {
    confidence = "high";
  } else if (stdDev < 15 && imageResults.length >= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  const reasoning = imagePhenotypes.length > 0
    ? `Multi-image consensus (${imageResults.length} images): ${netAdjustment > 0 ? '+' : ''}${netAdjustment.toFixed(1)}% ${netAdjustment > 0 ? 'Indica' : 'Sativa'} (${confidence} confidence, ${stdDev.toFixed(1)}% std dev)`
    : "";

  return {
    adjustment: Math.round(netAdjustment * 10) / 10, // Round to 1 decimal
    reasoning,
    confidence,
  };
}

/**
 * Phase 5.2 — MAIN FUNCTION: Resolve Strain Ratio
 * 
 * Sequential adjustment approach:
 * 1. Genetic baseline
 * 2. Terpene modulation (±10–15% max)
 * 3. Phenotype signals (±5% each)
 * 4. Multi-image consensus (stabilize)
 */
export function resolveStrainRatioV52(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: NormalizedTerpeneProfile
): StrainRatio {
  // Phase 5.2.1 — GENETIC BASELINE
  const geneticBaseline = resolveGeneticBaseline(strainName, dbEntry);
  
  if (!geneticBaseline) {
    // Failsafe: Return balanced hybrid
    console.warn(`Phase 5.2.1 — No genetic baseline found for "${strainName}", using balanced hybrid default`);
    return {
      indicaPercent: 50,
      sativaPercent: 50,
      dominance: "Balanced",
      displayText: "Balanced Hybrid (50% / 50%)",
      confidence: "low",
      explanation: {
        geneticBaseline: `No genetic data available for ${strainName}. Defaulting to balanced hybrid.`,
        source: "default",
      },
    };
  }

  let currentIndica = geneticBaseline.indicaPercent;
  const explanationParts: string[] = [];

  // Phase 5.2.2 — TERPENE MODULATION
  const terpeneModulation = applyTerpeneModulation(currentIndica, terpeneProfile);
  if (terpeneModulation.adjustment !== 0) {
    currentIndica += terpeneModulation.adjustment;
    explanationParts.push(terpeneModulation.reasoning);
  }

  // Phase 5.2.3 — PHENOTYPE SIGNALS
  const phenotypeSignals = applyPhenotypeSignals(currentIndica, fusedFeatures, imageResults);
  if (phenotypeSignals.adjustment !== 0) {
    currentIndica += phenotypeSignals.adjustment;
    explanationParts.push(phenotypeSignals.reasoning);
  }

  // Phase 5.2.4 — MULTI-IMAGE CONSENSUS
  const consensus = applyMultiImageConsensus(currentIndica, imageResults);
  if (consensus.adjustment !== 0) {
    currentIndica += consensus.adjustment;
    explanationParts.push(consensus.reasoning);
  }

  // Phase 5.2.5 — FINAL CLASSIFICATION: Ensure ratio sums to 100%, clamp to 20-80% (never pure)
  currentIndica = Math.max(20, Math.min(80, Math.round(currentIndica * 10) / 10)); // Never pure indica or pure sativa
  const currentSativa = Math.round((100 - currentIndica) * 10) / 10;

  // Phase 5.2.5 — Determine dominance and display text
  let dominance: "Indica" | "Sativa" | "Hybrid" | "Balanced";
  let displayText: string;

  if (currentIndica >= 60) {
    dominance = "Indica";
    displayText = `Indica-Dominant Hybrid (${currentIndica}% Indica / ${currentSativa}% Sativa)`;
  } else if (currentSativa >= 60) {
    dominance = "Sativa";
    displayText = `Sativa-Dominant Hybrid (${currentSativa}% Sativa / ${currentIndica}% Indica)`;
  } else if (currentIndica >= 45 && currentIndica <= 55) {
    dominance = "Balanced";
    displayText = `Balanced Hybrid (${currentIndica}% / ${currentSativa}%)`;
  } else {
    dominance = currentIndica > currentSativa ? "Indica" : "Sativa";
    displayText = `Hybrid (${currentIndica}% Indica / ${currentSativa}% Sativa)`;
  }

  // Phase 5.2.5 — Determine source
  let source: StrainRatio["explanation"]["source"];
  if (consensus.adjustment !== 0 && phenotypeSignals.adjustment !== 0 && terpeneModulation.adjustment !== 0) {
    source = "genetic_terpene_phenotype_consensus";
  } else if (phenotypeSignals.adjustment !== 0 && terpeneModulation.adjustment !== 0) {
    source = "genetic_terpene_phenotype";
  } else if (terpeneModulation.adjustment !== 0) {
    source = "genetic_terpene";
  } else {
    source = "genetic_baseline";
  }

  // Phase 5.2.5 — Final confidence (use consensus confidence if available, otherwise medium)
  const finalConfidence = consensus.confidence || "medium";

  return {
    indicaPercent: Math.round(currentIndica),
    sativaPercent: Math.round(currentSativa),
    dominance,
    displayText,
    confidence: finalConfidence,
    explanation: {
      geneticBaseline: geneticBaseline.reasoning,
      terpeneModulation: terpeneModulation.reasoning || undefined,
      phenotypeSignals: phenotypeSignals.reasoning || undefined,
      multiImageConsensus: consensus.reasoning || undefined,
      source,
    },
  };
}
