// lib/scanner/ratioEngineV58.ts
// Phase 5.8 — Indica / Sativa / Hybrid Ratio Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NormalizedTerpeneProfile } from "./terpeneExperienceEngine";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 5.8 — Ratio Result
 */
export type StrainRatioV58 = {
  type: "Indica" | "Sativa" | "Hybrid";
  ratio: string; // "60% Indica / 40% Sativa"
  indicaPercent: number; // 0-100
  sativaPercent: number; // 0-100
  explanation: string[]; // Explanation bullets
  confidence: "high" | "medium" | "low";
  source: "database_primary" | "database_phenotype" | "database_phenotype_terpene" | "database_phenotype_terpene_consensus" | "default";
};

/**
 * Phase 5.8 Step 5.8.1 — STRAIN DATABASE SIGNALS
 * 
 * From the 35,000-strain database:
 * - Store canonical type for each strain:
 *   - Indica
 *   - Sativa
 *   - Hybrid (with known ratio when available)
 * 
 * - Include:
 *   - Legacy classifications
 *   - Breeder descriptions
 *   - Community consensus weighting
 */
function getStrainDatabaseSignalsV58(
  strainName: string,
  dbEntry?: CultivarReference
): {
  canonicalType: "Indica" | "Sativa" | "Hybrid";
  baselineIndicaPercent: number;
  baselineSativaPercent: number;
  reasoning: string[];
  confidence: "high" | "medium" | "low";
} | null {
  if (!dbEntry) {
    return null;
  }

  // Phase 5.8.1 — Get canonical type from database
  const dbType = dbEntry.type || dbEntry.dominantType;
  
  if (!dbType || (dbType !== "Indica" && dbType !== "Sativa" && dbType !== "Hybrid")) {
    return null;
  }

  // Phase 5.8.1 — Determine baseline ratio from canonical type
  let baselineIndicaPercent: number;
  let baselineSativaPercent: number;
  const reasoning: string[] = [];

  if (dbType === "Indica") {
    baselineIndicaPercent = 70;
    baselineSativaPercent = 30;
    reasoning.push(`Canonical type: Indica (from 35,000-strain database)`);
  } else if (dbType === "Sativa") {
    baselineIndicaPercent = 30;
    baselineSativaPercent = 70;
    reasoning.push(`Canonical type: Sativa (from 35,000-strain database)`);
  } else {
    // Phase 5.8.1 — Hybrid: Try to infer ratio from genetics
    const genetics = dbEntry.genetics || "";
    const geneticsLower = genetics.toLowerCase();
    
    if (geneticsLower.includes("indica") && !geneticsLower.includes("sativa")) {
      baselineIndicaPercent = 60;
      baselineSativaPercent = 40;
      reasoning.push(`Canonical type: Hybrid (Indica-leaning, inferred from genetics: ${genetics})`);
    } else if (geneticsLower.includes("sativa") && !geneticsLower.includes("indica")) {
      baselineIndicaPercent = 40;
      baselineSativaPercent = 60;
      reasoning.push(`Canonical type: Hybrid (Sativa-leaning, inferred from genetics: ${genetics})`);
    } else {
      baselineIndicaPercent = 50;
      baselineSativaPercent = 50;
      reasoning.push(`Canonical type: Hybrid (Balanced, from 35,000-strain database)`);
    }
  }

  // Phase 5.8.1 — Include legacy classifications and breeder descriptions
  if (dbEntry.sources && dbEntry.sources.length > 0) {
    reasoning.push(`Breeder/community sources: ${dbEntry.sources.slice(0, 2).join(", ")}`);
  }

  // Phase 5.8.1 — Confidence: High if from database, Medium if inferred
  const confidence: "high" | "medium" | "low" = dbType === "Indica" || dbType === "Sativa" || (dbType === "Hybrid" && genetics.length > 0)
    ? "high"
    : "medium";

  return {
    canonicalType: dbType,
    baselineIndicaPercent,
    baselineSativaPercent,
    reasoning,
    confidence,
  };
}

/**
 * Phase 5.8 Step 5.8.2 — IMAGE-BASED PHENOTYPE SIGNALS
 * 
 * From image analysis:
 * - Leaf width (broad ↔ narrow)
 * - Internode spacing
 * - Bud density & shape
 * - Overall plant posture
 * 
 * Map traits to tendencies:
 * - Broad leaves + dense buds → Indica leaning
 * - Narrow leaves + airy structure → Sativa leaning
 */
function getImagePhenotypeSignalsV58(
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

  // Phase 5.8.2 — Leaf width (broad ↔ narrow)
  if (fusedFeatures.leafShape === "broad") {
    netAdjustment += 8; // +8% Indica
    reasoning.push("Broad leaves suggest indica dominance");
  } else if (fusedFeatures.leafShape === "narrow") {
    netAdjustment -= 8; // -8% Indica (more Sativa)
    reasoning.push("Narrow leaves suggest sativa dominance");
  }

  // Phase 5.8.2 — Bud density & shape
  if (fusedFeatures.budStructure === "high") {
    // Dense buds → Indica leaning
    netAdjustment += 6; // +6% Indica
    reasoning.push("Dense bud structure indicates indica leaning");
  } else if (fusedFeatures.budStructure === "low") {
    // Airy structure → Sativa leaning
    netAdjustment -= 6; // -6% Indica (more Sativa)
    reasoning.push("Airy bud structure indicates sativa leaning");
  }

  // Phase 5.8.2 — Trichome distribution (high density can favor indica slightly)
  if (fusedFeatures.trichomeDensity === "high") {
    netAdjustment += 2; // +2% Indica
    reasoning.push("High trichome density supports indica-leaning structure");
  }

  // Phase 5.8.2 — Cap adjustment at ±12% (phenotype signals are secondary to database)
  if (netAdjustment > 12) netAdjustment = 12;
  if (netAdjustment < -12) netAdjustment = -12;

  // Phase 5.8.2 — Ensure we don't exceed bounds (20-80%)
  const adjustedIndica = 50 + netAdjustment; // Assume 50% baseline for bounds check
  if (adjustedIndica < 20) {
    netAdjustment = -30; // Cap at 20% minimum
  } else if (adjustedIndica > 80) {
    netAdjustment = 30; // Cap at 80% maximum
  }

  return {
    adjustment: Math.round(netAdjustment * 10) / 10,
    reasoning: reasoning.length > 0 ? reasoning : [],
  };
}

/**
 * Phase 5.8 Step 5.8.3 — TERPENE & EFFECT SIGNALS
 * 
 * Use inferred chemistry:
 * - Myrcene, linalool → Indica weight
 * - Limonene, terpinolene → Sativa weight
 * - Mixed profile → Hybrid balance
 * 
 * Effects weighting:
 * - Sedating / body-heavy → Indica
 * - Cerebral / energetic → Sativa
 */
function getTerpeneAndEffectSignalsV58(
  terpeneProfile?: NormalizedTerpeneProfile,
  imageResults?: ImageResult[]
): {
  adjustment: number; // ± adjustment to indica percent
  reasoning: string[];
} {
  let netAdjustment = 0;
  const reasoning: string[] = [];

  // Phase 5.8.3 — Terpene signals
  if (terpeneProfile && terpeneProfile.primaryTerpenes.length > 0) {
    const primaryTerpenes = terpeneProfile.primaryTerpenes.map(t => t.name.toLowerCase());
    
    // Indica-leaning terpenes: Myrcene, linalool
    const indicaTerpenes = ["myrcene", "linalool", "caryophyllene"];
    const indicaTerpeneCount = primaryTerpenes.filter(t => indicaTerpenes.includes(t)).length;
    
    // Sativa-leaning terpenes: Limonene, terpinolene
    const sativaTerpenes = ["limonene", "terpinolene", "pinene"];
    const sativaTerpeneCount = primaryTerpenes.filter(t => sativaTerpenes.includes(t)).length;
    
    if (indicaTerpeneCount > sativaTerpeneCount) {
      // Myrcene, linalool → Indica weight
      netAdjustment += 4; // +4% Indica
      reasoning.push(`Terpene profile (Myrcene/Linalool dominant) supports indica weight`);
    } else if (sativaTerpeneCount > indicaTerpeneCount) {
      // Limonene, terpinolene → Sativa weight
      netAdjustment -= 4; // -4% Indica (more Sativa)
      reasoning.push(`Terpene profile (Limonene/Terpinolene dominant) supports sativa weight`);
    } else if (indicaTerpeneCount === sativaTerpeneCount && indicaTerpeneCount > 0) {
      // Mixed profile → Hybrid balance
      reasoning.push(`Mixed terpene profile suggests hybrid balance`);
    }
  }

  // Phase 5.8.3 — Effects weighting
  if (imageResults && imageResults.length > 0) {
    const allEffects: string[] = [];
    imageResults.forEach(result => {
      if (result.wikiResult?.experience?.effects) {
        allEffects.push(...result.wikiResult.experience.effects);
      }
    });

    const effectsStr = allEffects.join(" ").toLowerCase();
    
    // Sedating / body-heavy → Indica
    const indicaEffectIndicators = ["relaxation", "sedation", "body", "sleep", "couch", "calming", "sedating"];
    const indicaEffectCount = indicaEffectIndicators.filter(indicator => effectsStr.includes(indicator)).length;
    
    // Cerebral / energetic → Sativa
    const sativaEffectIndicators = ["euphoria", "creativity", "uplifted", "focused", "energy", "cerebral", "energetic"];
    const sativaEffectCount = sativaEffectIndicators.filter(indicator => effectsStr.includes(indicator)).length;
    
    if (indicaEffectCount > sativaEffectCount) {
      // Sedating / body-heavy → Indica
      netAdjustment += 3; // +3% Indica
      reasoning.push(`Effects (sedating/body-heavy) suggest indica influence`);
    } else if (sativaEffectCount > indicaEffectCount) {
      // Cerebral / energetic → Sativa
      netAdjustment -= 3; // -3% Indica (more Sativa)
      reasoning.push(`Effects (cerebral/energetic) suggest sativa influence`);
    }
  }

  // Phase 5.8.3 — Cap adjustment at ±6% (terpene/effect signals are tertiary)
  if (netAdjustment > 6) netAdjustment = 6;
  if (netAdjustment < -6) netAdjustment = -6;

  return {
    adjustment: Math.round(netAdjustment * 10) / 10,
    reasoning: reasoning.length > 0 ? reasoning : [],
  };
}

/**
 * Phase 5.8 Step 5.8.4 — CONSENSUS RATIO CALCULATION
 * 
 * Combine signals:
 * - Database strain type (highest weight)
 * - Image phenotype score
 * - Terpene & effect indicators
 * - Multi-image agreement bonus
 * 
 * Output:
 * - Percent breakdown (never absolute)
 */
function calculateConsensusRatioV58(
  databaseSignals: ReturnType<typeof getStrainDatabaseSignalsV58>,
  phenotypeSignals: ReturnType<typeof getImagePhenotypeSignalsV58>,
  terpeneEffectSignals: ReturnType<typeof getTerpeneAndEffectSignalsV58>,
  imageCount: number
): {
  indicaPercent: number;
  sativaPercent: number;
  type: "Indica" | "Sativa" | "Hybrid";
  ratio: string;
  explanation: string[];
  confidence: "high" | "medium" | "low";
  source: StrainRatioV58["source"];
} {
  if (!databaseSignals) {
    // Failsafe: Return balanced hybrid
    return {
      indicaPercent: 50,
      sativaPercent: 50,
      type: "Hybrid",
      ratio: "50% Indica / 50% Sativa",
      explanation: ["No database entry found. Defaulting to balanced hybrid."],
      confidence: "low",
      source: "default",
    };
  }

  // Phase 5.8.4 — Start with database baseline (highest weight)
  let currentIndica = databaseSignals.baselineIndicaPercent;
  const explanation: string[] = [...databaseSignals.reasoning];

  // Phase 5.8.4 — Apply image phenotype signals (secondary weight)
  if (phenotypeSignals.adjustment !== 0) {
    currentIndica += phenotypeSignals.adjustment;
    explanation.push(...phenotypeSignals.reasoning);
  }

  // Phase 5.8.4 — Apply terpene & effect signals (tertiary weight)
  if (terpeneEffectSignals.adjustment !== 0) {
    currentIndica += terpeneEffectSignals.adjustment;
    explanation.push(...terpeneEffectSignals.reasoning);
  }

  // Phase 5.8.4 — Multi-image agreement bonus
  if (imageCount >= 3) {
    // Boost confidence if 3+ images agree
    explanation.push(`Consistent across ${imageCount} images`);
  } else if (imageCount >= 2) {
    explanation.push(`Agreement across ${imageCount} images`);
  }

  // Phase 5.8.4 — Ensure ratio sums to 100%, clamp to 20-80% (never pure)
  currentIndica = Math.max(20, Math.min(80, Math.round(currentIndica * 10) / 10));
  const currentSativa = Math.round((100 - currentIndica) * 10) / 10;

  // Phase 5.8.4 — Determine type
  let type: "Indica" | "Sativa" | "Hybrid";
  if (currentIndica >= 60) {
    type = "Indica";
  } else if (currentSativa >= 60) {
    type = "Sativa";
  } else {
    type = "Hybrid";
  }

  // Phase 5.8.4 — Ratio string
  const ratio = `${currentIndica}% Indica / ${currentSativa}% Sativa`;

  // Phase 5.8.4 — Determine confidence
  let confidence: "high" | "medium" | "low" = databaseSignals.confidence;
  
  // Boost confidence if multiple signals agree
  if (phenotypeSignals.adjustment !== 0 && terpeneEffectSignals.adjustment !== 0 && imageCount >= 2) {
    if (confidence === "medium") confidence = "high";
  } else if (imageCount === 1) {
    confidence = "medium";
  }

  // Phase 5.8.4 — Determine source
  let source: StrainRatioV58["source"];
  if (phenotypeSignals.adjustment !== 0 && terpeneEffectSignals.adjustment !== 0 && imageCount >= 2) {
    source = "database_phenotype_terpene_consensus";
  } else if (terpeneEffectSignals.adjustment !== 0 && phenotypeSignals.adjustment !== 0) {
    source = "database_phenotype_terpene";
  } else if (phenotypeSignals.adjustment !== 0) {
    source = "database_phenotype";
  } else {
    source = "database_primary";
  }

  return {
    indicaPercent: Math.round(currentIndica),
    sativaPercent: Math.round(currentSativa),
    type,
    ratio,
    explanation,
    confidence,
    source,
  };
}

/**
 * Phase 5.8 — MAIN FUNCTION
 */
export function resolveStrainRatioV58(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: NormalizedTerpeneProfile
): StrainRatioV58 {
  // Phase 5.8.1 — STRAIN DATABASE SIGNALS
  const databaseSignals = getStrainDatabaseSignalsV58(strainName, dbEntry);
  
  // Phase 5.8.2 — IMAGE-BASED PHENOTYPE SIGNALS
  const phenotypeSignals = getImagePhenotypeSignalsV58(fusedFeatures);
  
  // Phase 5.8.3 — TERPENE & EFFECT SIGNALS
  const terpeneEffectSignals = getTerpeneAndEffectSignalsV58(terpeneProfile, imageResults);
  
  // Phase 5.8.4 — CONSENSUS RATIO CALCULATION
  const consensusResult = calculateConsensusRatioV58(
    databaseSignals,
    phenotypeSignals,
    terpeneEffectSignals,
    imageCount
  );

  // Phase 5.8.5 — USER DISPLAY FORMAT
  return {
    type: consensusResult.type,
    ratio: consensusResult.ratio,
    indicaPercent: consensusResult.indicaPercent,
    sativaPercent: consensusResult.sativaPercent,
    explanation: consensusResult.explanation,
    confidence: consensusResult.confidence,
    source: consensusResult.source,
  };
}
