// lib/scanner/ratioEngineV79.ts
// Phase 7.9 — Indica / Sativa / Hybrid Ratio Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 7.9 — Ratio Result
 */
export type StrainRatioV79 = {
  indicaPercent: number; // 0-100 (max 95, min 5)
  sativaPercent: number; // 0-100 (max 95, min 5)
  classification: "Indica" | "Sativa" | "Hybrid";
  dominanceLabel: "Indica-Dominant" | "Sativa-Dominant" | "Balanced Hybrid" | "Indica-Leaning Hybrid" | "Sativa-Leaning Hybrid";
  displayText: string; // "70% Indica / 30% Sativa"
  ratioRange: { min: number; max: number }; // e.g. 65–75% Indica
  confidence: "very_high" | "high" | "medium" | "low";
  confidenceLabel: string;
  explanation: string; // Short explanation text (1–2 lines)
  source: "database_primary" | "database_blended" | "database_visual" | "database_visual_terpene" | "database_visual_terpene_consensus" | "inferred_visual" | "default";
};

/**
 * Phase 7.9 Step 7.9.1 — INPUT SIGNALS
 * 
 * Aggregate signals from:
 * - Consensus strain genealogy
 * - Leaf shape inference (broad vs narrow)
 * - Bud density & structure
 * - Internodal spacing (from images)
 * - Terpene profile bias
 * - Known cultivar classifications
 * - Confidence tier
 */
type InputSignalsV79 = {
  strainName: string;
  dbEntry?: CultivarReference;
  fusedFeatures?: FusedFeatures;
  imageResults?: ImageResult[];
  imageCount: number;
  terpeneProfile?: Array<{ name: string; likelihood: string }>;
  confidence: "very_high" | "high" | "medium" | "low";
};

/**
 * Phase 7.9 Step 7.9.2 — BASE RATIO
 * 
 * Start from:
 * - Known strain baseline (if matched)
 * OR
 * - Visual morphology baseline (if unknown)
 * 
 * Examples:
 * - Broad leaves + dense buds → Indica-leaning
 * - Narrow leaves + airy structure → Sativa-leaning
 * - Mixed traits → Hybrid baseline (50/50)
 */
function getBaseRatioV79(
  signals: InputSignalsV79
): {
  baseIndica: number;
  baseSativa: number;
  reasoning: string[];
  source: "database_primary" | "database_blended" | "visual_morphology" | "default";
} {
  const { dbEntry, fusedFeatures } = signals;
  
  // Phase 7.9.2 — If strain is known, use database baseline
  if (dbEntry) {
    // Try to extract ratio from database entry
    // Most database entries don't have explicit ratios, so we infer from type
    const dbType = dbEntry.type?.toLowerCase() || "";
    
    if (dbType.includes("indica") && !dbType.includes("hybrid") && !dbType.includes("sativa")) {
      return {
        baseIndica: 80,
        baseSativa: 20,
        reasoning: [`Known Indica cultivar: ${dbEntry.name}`],
        source: "database_primary",
      };
    } else if (dbType.includes("sativa") && !dbType.includes("hybrid") && !dbType.includes("indica")) {
      return {
        baseIndica: 20,
        baseSativa: 80,
        reasoning: [`Known Sativa cultivar: ${dbEntry.name}`],
        source: "database_primary",
      };
    } else if (dbType.includes("indica") && dbType.includes("dominant")) {
      return {
        baseIndica: 70,
        baseSativa: 30,
        reasoning: [`Indica-dominant hybrid: ${dbEntry.name}`],
        source: "database_primary",
      };
    } else if (dbType.includes("sativa") && dbType.includes("dominant")) {
      return {
        baseIndica: 30,
        baseSativa: 70,
        reasoning: [`Sativa-dominant hybrid: ${dbEntry.name}`],
        source: "database_primary",
      };
    } else {
      // Default hybrid
      return {
        baseIndica: 50,
        baseSativa: 50,
        reasoning: [`Hybrid cultivar: ${dbEntry.name}`],
        source: "database_primary",
      };
    }
  }
  
  // Phase 7.9.2 — Visual morphology baseline (if unknown strain)
  if (fusedFeatures) {
    const { budStructure, leafShape } = fusedFeatures;
    
    // Broad leaves + dense buds → Indica-leaning
    if (budStructure === "high" && leafShape === "broad") {
      return {
        baseIndica: 65,
        baseSativa: 35,
        reasoning: ["Visual morphology: broad leaves + dense buds suggest Indica-leaning"],
        source: "visual_morphology",
      };
    }
    
    // Narrow leaves + airy structure → Sativa-leaning
    if (budStructure === "low" && leafShape === "narrow") {
      return {
        baseIndica: 35,
        baseSativa: 65,
        reasoning: ["Visual morphology: narrow leaves + airy structure suggest Sativa-leaning"],
        source: "visual_morphology",
      };
    }
    
    // Mixed traits → Hybrid baseline
    return {
      baseIndica: 50,
      baseSativa: 50,
      reasoning: ["Visual morphology: mixed traits suggest balanced hybrid"],
      source: "visual_morphology",
    };
  }
  
  // Phase 7.9.2 — Default fallback
  return {
    baseIndica: 50,
    baseSativa: 50,
    reasoning: ["No genetic or visual data available. Defaulting to balanced hybrid."],
    source: "default",
  };
}

/**
 * Phase 7.9 Step 7.9.3 — MODIFIER LAYERS
 * 
 * Apply weighted adjustments:
 * 
 * A) VISUAL MODIFIERS
 * - Bud density → +Indica
 * - Foxtailing → +Sativa
 * - Trichome heaviness → +Indica
 * 
 * B) TERPENE MODIFIERS
 * - Myrcene-heavy → +Indica
 * - Limonene / Terpinolene → +Sativa
 * - Balanced mix → Stabilize ratio
 * 
 * C) CONSENSUS CONFIDENCE
 * - Multiple images agreeing → tighten range
 * - Conflicting images → widen range
 */
function applyModifierLayersV79(
  baseIndica: number,
  baseSativa: number,
  signals: InputSignalsV79
): {
  adjustedIndica: number;
  adjustedSativa: number;
  ratioRange: { min: number; max: number };
  reasoning: string[];
} {
  let currentIndica = baseIndica;
  const reasoning: string[] = [];
  
  // Phase 7.9.3 A) VISUAL MODIFIERS
  if (signals.fusedFeatures) {
    const { budStructure, trichomeDensity } = signals.fusedFeatures;
    
    // Bud density → +Indica
    if (budStructure === "high") {
      const adjustment = 5; // Max +5% for dense buds
      currentIndica = Math.min(95, currentIndica + adjustment);
      reasoning.push(`Dense bud structure suggests +${adjustment}% Indica influence`);
    } else if (budStructure === "low") {
      const adjustment = -5; // Max -5% for airy buds
      currentIndica = Math.max(5, currentIndica + adjustment);
      reasoning.push(`Airy bud structure suggests ${adjustment}% Indica influence (more Sativa)`);
    }
    
    // Trichome heaviness → +Indica
    if (trichomeDensity === "high") {
      const adjustment = 3; // Max +3% for heavy trichomes
      currentIndica = Math.min(95, currentIndica + adjustment);
      reasoning.push(`Heavy trichome density suggests +${adjustment}% Indica influence`);
    }
    
    // Foxtailing detection (from image results if available)
    if (signals.imageResults && signals.imageResults.length > 0) {
      const hasFoxtailing = signals.imageResults.some(img => 
        img.visualFeatures?.structure?.includes("foxtail") || 
        img.visualFeatures?.structure?.includes("elongated")
      );
      if (hasFoxtailing) {
        const adjustment = -4; // Max -4% for foxtailing (Sativa trait)
        currentIndica = Math.max(5, currentIndica + adjustment);
        reasoning.push(`Foxtailing structure suggests ${adjustment}% Indica influence (more Sativa)`);
      }
    }
  }
  
  // Phase 7.9.3 B) TERPENE MODIFIERS
  if (signals.terpeneProfile && signals.terpeneProfile.length > 0) {
    const terpeneNames = signals.terpeneProfile.map(t => t.name.toLowerCase());
    const terpeneLikelihoods = signals.terpeneProfile.map(t => t.likelihood.toLowerCase());
    
    // Myrcene-heavy → +Indica
    const myrceneIndex = terpeneNames.findIndex(n => n.includes("myrcene"));
    if (myrceneIndex !== -1 && (terpeneLikelihoods[myrceneIndex] === "high" || terpeneLikelihoods[myrceneIndex] === "medium")) {
      const adjustment = 4; // Max +4% for Myrcene
      currentIndica = Math.min(95, currentIndica + adjustment);
      reasoning.push(`Myrcene-dominant profile suggests +${adjustment}% Indica influence`);
    }
    
    // Limonene / Terpinolene → +Sativa
    const hasLimonene = terpeneNames.some(n => n.includes("limonene"));
    const hasTerpinolene = terpeneNames.some(n => n.includes("terpinolene"));
    if (hasLimonene || hasTerpinolene) {
      const limoneneIndex = terpeneNames.findIndex(n => n.includes("limonene"));
      const terpinoleneIndex = terpeneNames.findIndex(n => n.includes("terpinolene"));
      const limoneneLikelihood = limoneneIndex !== -1 ? terpeneLikelihoods[limoneneIndex] : "low";
      const terpinoleneLikelihood = terpinoleneIndex !== -1 ? terpeneLikelihoods[terpinoleneIndex] : "low";
      
      if (limoneneLikelihood === "high" || limoneneLikelihood === "medium" || 
          terpinoleneLikelihood === "high" || terpinoleneLikelihood === "medium") {
        const adjustment = -4; // Max -4% for Limonene/Terpinolene
        currentIndica = Math.max(5, currentIndica + adjustment);
        reasoning.push(`Limonene/Terpinolene profile suggests ${adjustment}% Indica influence (more Sativa)`);
      }
    }
    
    // Balanced mix → Stabilize ratio (no major adjustment)
    const hasBothIndicaAndSativaTerpenes = 
      (myrceneIndex !== -1) && (hasLimonene || hasTerpinolene);
    if (hasBothIndicaAndSativaTerpenes) {
      reasoning.push("Balanced terpene mix stabilizes ratio");
    }
  }
  
  // Phase 7.9.3 C) CONSENSUS CONFIDENCE
  // Calculate ratio range based on image count and agreement
  let rangeWidth: number;
  if (signals.imageCount >= 3) {
    rangeWidth = 5; // Tight range for 3+ images
  } else if (signals.imageCount === 2) {
    rangeWidth = 8; // Moderate range for 2 images
  } else {
    rangeWidth = 12; // Wide range for 1 image
  }
  
  // Adjust range based on confidence
  if (signals.confidence === "very_high") {
    rangeWidth = Math.max(3, rangeWidth - 2);
  } else if (signals.confidence === "low") {
    rangeWidth = rangeWidth + 5;
  }
  
  // Ensure ratio sums to 100%
  currentIndica = Math.max(5, Math.min(95, Math.round(currentIndica * 10) / 10));
  const currentSativa = Math.round((100 - currentIndica) * 10) / 10;
  
  const ratioRange = {
    min: Math.max(5, Math.round((currentIndica - rangeWidth / 2) * 10) / 10),
    max: Math.min(95, Math.round((currentIndica + rangeWidth / 2) * 10) / 10),
  };
  
  if (signals.imageCount >= 2) {
    reasoning.push(`${signals.imageCount} images provide consensus, tightening ratio range to ±${rangeWidth / 2}%`);
  } else {
    reasoning.push(`Single image analysis, ratio range ±${rangeWidth / 2}%`);
  }
  
  return {
    adjustedIndica: currentIndica,
    adjustedSativa: currentSativa,
    ratioRange,
    reasoning,
  };
}

/**
 * Phase 7.9 Step 7.9.4 — FINAL OUTPUT
 * 
 * Produce:
 * - Dominance label: Indica / Sativa / Hybrid
 * - Ratio range: e.g. 65–75% Indica
 * - Displayed ratio: midpoint (e.g. 70/30)
 * 
 * Never output 100/0.
 */
function formatFinalOutputV79(
  adjustedIndica: number,
  adjustedSativa: number,
  ratioRange: { min: number; max: number },
  baseSource: string
): {
  classification: "Indica" | "Sativa" | "Hybrid";
  dominanceLabel: "Indica-Dominant" | "Sativa-Dominant" | "Balanced Hybrid" | "Indica-Leaning Hybrid" | "Sativa-Leaning Hybrid";
  displayText: string;
} {
  // Phase 7.9.4 — Determine classification
  let classification: "Indica" | "Sativa" | "Hybrid";
  let dominanceLabel: "Indica-Dominant" | "Sativa-Dominant" | "Balanced Hybrid" | "Indica-Leaning Hybrid" | "Sativa-Leaning Hybrid";
  
  if (adjustedIndica >= 70) {
    classification = "Indica";
    dominanceLabel = "Indica-Dominant";
  } else if (adjustedSativa >= 70) {
    classification = "Sativa";
    dominanceLabel = "Sativa-Dominant";
  } else if (adjustedIndica >= 60) {
    classification = "Hybrid";
    dominanceLabel = "Indica-Leaning Hybrid";
  } else if (adjustedSativa >= 60) {
    classification = "Hybrid";
    dominanceLabel = "Sativa-Leaning Hybrid";
  } else {
    classification = "Hybrid";
    dominanceLabel = "Balanced Hybrid";
  }
  
  // Phase 7.9.4 — Format display text
  const displayText = `${adjustedIndica}% Indica / ${adjustedSativa}% Sativa`;
  
  return {
    classification,
    dominanceLabel,
    displayText,
  };
}

/**
 * Phase 7.9 Step 7.9.5 — EXPLANATION TEXT
 * 
 * Generate a short explanation:
 * 
 * Example:
 * "Based on bud structure, leaf morphology, and terpene signals, this cultivar shows a strong Indica dominance with minor Sativa influence."
 * 
 * Tone:
 * - Calm
 * - Informative
 * - No absolutes
 */
function generateExplanationV79(
  classification: "Indica" | "Sativa" | "Hybrid",
  dominanceLabel: string,
  reasoning: string[],
  baseSource: string
): string {
  // Phase 7.9.5 — Build explanation from reasoning
  const visualSignals = reasoning.filter(r => r.includes("bud") || r.includes("leaf") || r.includes("trichome") || r.includes("foxtail"));
  const terpeneSignals = reasoning.filter(r => r.includes("terpene") || r.includes("Myrcene") || r.includes("Limonene") || r.includes("Terpinolene"));
  const consensusSignals = reasoning.filter(r => r.includes("image") || r.includes("consensus"));
  
  let explanation = "Based on ";
  
  const parts: string[] = [];
  if (visualSignals.length > 0) {
    parts.push("visual morphology");
  }
  if (terpeneSignals.length > 0) {
    parts.push("terpene profile");
  }
  if (baseSource === "database_primary" || baseSource === "database_blended") {
    parts.push("strain genetics");
  }
  
  if (parts.length === 0) {
    explanation = "This cultivar shows ";
  } else {
    explanation += parts.join(", ") + ", this cultivar shows ";
  }
  
  // Phase 7.9.5 — Add dominance description
  if (dominanceLabel === "Indica-Dominant") {
    explanation += "strong Indica dominance";
  } else if (dominanceLabel === "Sativa-Dominant") {
    explanation += "strong Sativa dominance";
  } else if (dominanceLabel === "Indica-Leaning Hybrid") {
    explanation += "Indica-leaning hybrid characteristics";
  } else if (dominanceLabel === "Sativa-Leaning Hybrid") {
    explanation += "Sativa-leaning hybrid characteristics";
  } else {
    explanation += "balanced hybrid characteristics";
  }
  
  // Phase 7.9.5 — Add minor influence if hybrid
  if (classification === "Hybrid" && dominanceLabel !== "Balanced Hybrid") {
    if (dominanceLabel.includes("Indica")) {
      explanation += " with minor Sativa influence";
    } else {
      explanation += " with minor Indica influence";
    }
  }
  
  explanation += ".";
  
  return explanation;
}

/**
 * Phase 7.9 — MAIN FUNCTION
 */
export function resolveStrainRatioV79(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: Array<{ name: string; likelihood: string }>,
  confidence?: "very_high" | "high" | "medium" | "low"
): StrainRatioV79 {
  // Phase 7.9.1 — INPUT SIGNALS
  const signals: InputSignalsV79 = {
    strainName,
    dbEntry,
    fusedFeatures,
    imageResults,
    imageCount,
    terpeneProfile,
    confidence: confidence || "medium",
  };
  
  // Phase 7.9.2 — BASE RATIO
  const baseRatio = getBaseRatioV79(signals);
  
  // Phase 7.9.3 — MODIFIER LAYERS
  const modifierResult = applyModifierLayersV79(
    baseRatio.baseIndica,
    baseRatio.baseSativa,
    signals
  );
  
  // Phase 7.9.4 — FINAL OUTPUT
  const output = formatFinalOutputV79(
    modifierResult.adjustedIndica,
    modifierResult.adjustedSativa,
    modifierResult.ratioRange,
    baseRatio.source
  );
  
  // Phase 7.9.5 — EXPLANATION TEXT
  const explanation = generateExplanationV79(
    output.classification,
    output.dominanceLabel,
    [...baseRatio.reasoning, ...modifierResult.reasoning],
    baseRatio.source
  );
  
  // Phase 7.9.5 — Determine confidence label
  let confidenceLabel: string;
  if (signals.confidence === "very_high") {
    confidenceLabel = "Very High: known strain + high confidence visual agreement";
  } else if (signals.confidence === "high") {
    confidenceLabel = "High: known strain + moderate confidence visual agreement";
  } else if (signals.confidence === "medium") {
    confidenceLabel = "Medium: estimated from visual traits and terpene profile";
  } else {
    confidenceLabel = "Low: estimated from visual cues only";
  }
  
  // Phase 7.9.5 — Determine source
  let source: StrainRatioV79["source"];
  if (baseRatio.source === "database_primary" && signals.terpeneProfile && signals.terpeneProfile.length > 0 && signals.fusedFeatures) {
    source = "database_visual_terpene_consensus";
  } else if (baseRatio.source === "database_primary" && signals.terpeneProfile && signals.terpeneProfile.length > 0) {
    source = "database_visual_terpene";
  } else if (baseRatio.source === "database_primary" && signals.fusedFeatures) {
    source = "database_visual";
  } else if (baseRatio.source === "database_primary") {
    source = "database_primary";
  } else if (baseRatio.source === "visual_morphology") {
    source = "inferred_visual";
  } else {
    source = "default";
  }
  
  return {
    indicaPercent: modifierResult.adjustedIndica,
    sativaPercent: modifierResult.adjustedSativa,
    classification: output.classification,
    dominanceLabel: output.dominanceLabel,
    displayText: output.displayText,
    ratioRange: modifierResult.ratioRange,
    confidence: signals.confidence,
    confidenceLabel,
    explanation,
    source,
  };
}
