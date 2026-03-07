// lib/scanner/ratioEngineV81.ts
// Phase 8.1 — Indica / Sativa / Hybrid Ratio Engine
// 4-Source Weighted System: Database + Visual + Terpene + Name Consensus

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NameFirstResultV80 } from "./nameFirstV80";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 8.1 — Ratio Result
 */
export type StrainRatioV81 = {
  classification: "Indica" | "Sativa" | "Hybrid";
  classificationLabel: string; // "Indica-dominant Hybrid", "Sativa-dominant", etc.
  ratio: string; // "70% Indica / 30% Sativa"
  indicaPercent: number; // 0-100
  sativaPercent: number; // 0-100
  confidence: "very_high" | "high" | "medium" | "low";
  explanation: string; // Short explanation for UI
  sourceBreakdown: {
    database?: { indicaPercent: number; sativaPercent: number; weight: number; reasoning: string[] };
    visual?: { indicaPercent: number; sativaPercent: number; weight: number; reasoning: string[] };
    terpene?: { indicaPercent: number; sativaPercent: number; weight: number; reasoning: string[] };
    nameConsensus?: { indicaPercent: number; sativaPercent: number; weight: number; reasoning: string[] };
  };
};

/**
 * Phase 8.1 Step 8.1.1 — INPUT SIGNALS
 */
type InputSignalsV81 = {
  strainName: string;
  dbEntry?: CultivarReference;
  fusedFeatures?: FusedFeatures;
  imageResults?: ImageResult[];
  imageCount: number;
  terpeneProfile?: Array<{ name: string; likelihood: string }>;
  nameFirstResult?: NameFirstResultV80; // Phase 8.0 result for consensus alignment
};

/**
 * Phase 8.1 Step 8.1.2 — DATABASE BASELINE
 * 
 * Weight: HIGH (40-50%)
 * 
 * If primary strain exists in DB:
 * - Pull known ratio (or classification)
 * - Weight = 45% (high)
 * 
 * If multiple close matches:
 * - Average ratios weighted by confidence
 * - Penalize outliers
 * 
 * If unknown cultivar:
 * - Skip baseline, rely on morphology + chemistry
 */
function getDatabaseBaselineV81(
  signals: InputSignalsV81
): {
  indicaPercent: number;
  sativaPercent: number;
  weight: number;
  reasoning: string[];
} | null {
  const { dbEntry, nameFirstResult } = signals;
  
  // Phase 8.1.2 — If primary strain exists in DB, use it
  if (dbEntry) {
    const dbType = dbEntry.type?.toLowerCase() || "";
    
    // Extract ratio from database type
    if (dbType === "indica") {
      return {
        indicaPercent: 80,
        sativaPercent: 20,
        weight: 0.45, // 45% weight (HIGH)
        reasoning: [`Known Indica cultivar: ${dbEntry.name}`],
      };
    } else if (dbType === "sativa") {
      return {
        indicaPercent: 20,
        sativaPercent: 80,
        weight: 0.45,
        reasoning: [`Known Sativa cultivar: ${dbEntry.name}`],
      };
    } else if (dbType === "hybrid") {
      // For hybrids, try to infer from genetics or use balanced default
      const genetics = dbEntry.genetics?.toLowerCase() || "";
      if (genetics.includes("indica") && !genetics.includes("sativa")) {
        return {
          indicaPercent: 65,
          sativaPercent: 35,
          weight: 0.45,
          reasoning: [`Hybrid cultivar with Indica-dominant genetics: ${dbEntry.name}`],
        };
      } else if (genetics.includes("sativa") && !genetics.includes("indica")) {
        return {
          indicaPercent: 35,
          sativaPercent: 65,
          weight: 0.45,
          reasoning: [`Hybrid cultivar with Sativa-dominant genetics: ${dbEntry.name}`],
        };
      } else {
        // Balanced hybrid
        return {
          indicaPercent: 50,
          sativaPercent: 50,
          weight: 0.45,
          reasoning: [`Hybrid cultivar: ${dbEntry.name}`],
        };
      }
    }
  }
  
  // Phase 8.1.2 — If multiple close matches from Phase 8.0, average ratios
  if (nameFirstResult && nameFirstResult.alternateMatches.length > 0) {
    const allMatches = [
      { name: nameFirstResult.primaryMatch.name, confidence: nameFirstResult.primaryMatch.confidence },
      ...nameFirstResult.alternateMatches.map(a => ({ name: a.name, confidence: a.confidence })),
    ];
    
    // Find database entries for all matches
    const dbEntries = allMatches
      .map(match => {
        const entry = CULTIVAR_LIBRARY.find(
          c => c.name.toLowerCase() === match.name.toLowerCase() ||
              c.aliases.some(a => a.toLowerCase() === match.name.toLowerCase())
        );
        return entry ? { entry, confidence: match.confidence } : null;
      })
      .filter((e): e is { entry: CultivarReference; confidence: number } => e !== null);
    
    if (dbEntries.length > 0) {
      // Calculate weighted average
      let totalWeight = 0;
      let weightedIndica = 0;
      let weightedSativa = 0;
      const reasoning: string[] = [];
      
      for (const { entry, confidence } of dbEntries) {
        const dbType = entry.type?.toLowerCase() || "";
        let indica = 50;
        let sativa = 50;
        
        if (dbType === "indica") {
          indica = 80;
          sativa = 20;
        } else if (dbType === "sativa") {
          indica = 20;
          sativa = 80;
        } else if (dbType === "hybrid") {
          const genetics = entry.genetics?.toLowerCase() || "";
          if (genetics.includes("indica") && !genetics.includes("sativa")) {
            indica = 65;
            sativa = 35;
          } else if (genetics.includes("sativa") && !genetics.includes("indica")) {
            indica = 35;
            sativa = 65;
          }
        }
        
        // Weight by confidence (normalize to 0-1)
        const weight = confidence / 100;
        weightedIndica += indica * weight;
        weightedSativa += sativa * weight;
        totalWeight += weight;
        reasoning.push(`${entry.name} (${confidence}% confidence): ${indica}% Indica / ${sativa}% Sativa`);
      }
      
      if (totalWeight > 0) {
        return {
          indicaPercent: Math.round(weightedIndica / totalWeight),
          sativaPercent: Math.round(weightedSativa / totalWeight),
          weight: 0.40, // Slightly lower weight for blended (40%)
          reasoning: [`Blended ratio from ${dbEntries.length} close matches:`, ...reasoning],
        };
      }
    }
  }
  
  // Phase 8.1.2 — Unknown cultivar, skip database baseline
  return null;
}

/**
 * Phase 8.1 Step 8.1.3 — VISUAL MORPHOLOGY SIGNALS
 * 
 * Weight: MEDIUM (25-30%)
 * 
 * Extract indicators from images:
 * - Leaf width (broad vs narrow)
 * - Bud density (tight vs airy)
 * - Node spacing (inferred from structure)
 * - Flower shape (chunky vs elongated)
 * 
 * Map to tendencies:
 * - Broad leaves → Indica
 * - Narrow leaves → Sativa
 * - Mixed signals → Hybrid
 */
function getVisualMorphologySignalsV81(
  signals: InputSignalsV81
): {
  indicaPercent: number;
  sativaPercent: number;
  weight: number;
  reasoning: string[];
} | null {
  if (!signals.fusedFeatures) {
    return null;
  }
  
  const { fusedFeatures, imageResults } = signals;
  const reasoning: string[] = [];
  let indicaScore = 0;
  let sativaScore = 0;
  let signalCount = 0;
  
  // Phase 8.1.3 — Leaf width (broad vs narrow)
  if (fusedFeatures.leafShape === "broad") {
    indicaScore += 70;
    sativaScore += 30;
    signalCount++;
    reasoning.push("Broad leaves suggest Indica influence");
  } else if (fusedFeatures.leafShape === "narrow") {
    indicaScore += 30;
    sativaScore += 70;
    signalCount++;
    reasoning.push("Narrow leaves suggest Sativa influence");
  }
  
  // Phase 8.1.3 — Bud density (tight vs airy)
  if (fusedFeatures.budStructure === "high") {
    indicaScore += 70;
    sativaScore += 30;
    signalCount++;
    reasoning.push("Dense bud structure suggests Indica genetics");
  } else if (fusedFeatures.budStructure === "low") {
    indicaScore += 30;
    sativaScore += 70;
    signalCount++;
    reasoning.push("Airy bud structure suggests Sativa genetics");
  }
  
  // Phase 8.1.3 — Trichome density (high can favor Indica slightly)
  if (fusedFeatures.trichomeDensity === "high") {
    indicaScore += 60;
    sativaScore += 40;
    signalCount++;
    reasoning.push("Heavy trichome coverage suggests Indica-leaning");
  }
  
  // Phase 8.1.3 — Flower shape (from image results if available)
  if (imageResults && imageResults.length > 0) {
    const hasFoxtailing = imageResults.some(img =>
      img.visualFeatures?.structure?.includes("foxtail") ||
      img.visualFeatures?.structure?.includes("elongated")
    );
    if (hasFoxtailing) {
      indicaScore += 25;
      sativaScore += 75;
      signalCount++;
      reasoning.push("Foxtailing structure suggests Sativa influence");
    }
    
    const hasChunkyStructure = imageResults.some(img =>
      img.visualFeatures?.structure?.includes("chunky") ||
      img.visualFeatures?.structure?.includes("dense")
    );
    if (hasChunkyStructure) {
      indicaScore += 75;
      sativaScore += 25;
      signalCount++;
      reasoning.push("Chunky flower structure suggests Indica influence");
    }
  }
  
  if (signalCount === 0) {
    return null;
  }
  
  // Average the signals
  const indicaPercent = Math.round(indicaScore / signalCount);
  const sativaPercent = 100 - indicaPercent;
  
  return {
    indicaPercent,
    sativaPercent,
    weight: 0.27, // 27% weight (MEDIUM, between 25-30%)
    reasoning,
  };
}

/**
 * Phase 8.1 Step 8.1.4 — TERPENE & EFFECT SIGNALS
 * 
 * Weight: MEDIUM (20-25%)
 * 
 * Use inferred terpene profile:
 * - Myrcene dominant → Indica lean
 * - Limonene / Terpinolene → Sativa lean
 * - Balanced profile → Hybrid
 * 
 * Cross-check with:
 * - Sedative vs energizing effect language
 */
function getTerpeneSignalsV81(
  signals: InputSignalsV81
): {
  indicaPercent: number;
  sativaPercent: number;
  weight: number;
  reasoning: string[];
} | null {
  if (!signals.terpeneProfile || signals.terpeneProfile.length === 0) {
    return null;
  }
  
  const terpeneNames = signals.terpeneProfile.map(t => t.name.toLowerCase());
  const terpeneLikelihoods = signals.terpeneProfile.map(t => t.likelihood.toLowerCase());
  const reasoning: string[] = [];
  
  let indicaScore = 50; // Start neutral
  let sativaScore = 50;
  let hasIndicaSignal = false;
  let hasSativaSignal = false;
  
  // Phase 8.1.4 — Myrcene dominant → Indica lean
  const myrceneIndex = terpeneNames.findIndex(n => n.includes("myrcene"));
  if (myrceneIndex !== -1) {
    const likelihood = terpeneLikelihoods[myrceneIndex];
    if (likelihood === "high") {
      indicaScore = 70;
      sativaScore = 30;
      hasIndicaSignal = true;
      reasoning.push("Myrcene-dominant profile suggests Indica-leaning");
    } else if (likelihood === "medium") {
      indicaScore = 60;
      sativaScore = 40;
      hasIndicaSignal = true;
      reasoning.push("Myrcene presence suggests mild Indica influence");
    }
  }
  
  // Phase 8.1.4 — Limonene / Terpinolene → Sativa lean
  const hasLimonene = terpeneNames.some(n => n.includes("limonene"));
  const hasTerpinolene = terpeneNames.some(n => n.includes("terpinolene"));
  
  if (hasLimonene || hasTerpinolene) {
    const limoneneIndex = terpeneNames.findIndex(n => n.includes("limonene"));
    const terpinoleneIndex = terpeneNames.findIndex(n => n.includes("terpinolene"));
    
    const limoneneLikelihood = limoneneIndex !== -1 ? terpeneLikelihoods[limoneneIndex] : "low";
    const terpinoleneLikelihood = terpinoleneIndex !== -1 ? terpeneLikelihoods[terpinoleneIndex] : "low";
    
    if (limoneneLikelihood === "high" || terpinoleneLikelihood === "high") {
      if (hasIndicaSignal) {
        // Balanced if both present
        indicaScore = 50;
        sativaScore = 50;
        reasoning.push("Limonene/Terpinolene presence balances Myrcene, suggesting hybrid");
      } else {
        indicaScore = 30;
        sativaScore = 70;
        hasSativaSignal = true;
        reasoning.push("Limonene/Terpinolene-dominant profile suggests Sativa-leaning");
      }
    } else if (limoneneLikelihood === "medium" || terpinoleneLikelihood === "medium") {
      if (!hasIndicaSignal) {
        indicaScore = 40;
        sativaScore = 60;
        hasSativaSignal = true;
        reasoning.push("Limonene/Terpinolene presence suggests mild Sativa influence");
      }
    }
  }
  
  // Phase 8.1.4 — Pinene can favor either, but often associated with Sativa
  const hasPinene = terpeneNames.some(n => n.includes("pinene"));
  if (hasPinene && !hasIndicaSignal && !hasSativaSignal) {
    indicaScore = 45;
    sativaScore = 55;
    reasoning.push("Pinene presence suggests slight Sativa lean");
  }
  
  // Phase 8.1.4 — If no clear signals, return null (don't use terpene signals)
  if (!hasIndicaSignal && !hasSativaSignal && !hasPinene) {
    return null;
  }
  
  return {
    indicaPercent: Math.round(indicaScore),
    sativaPercent: Math.round(sativaScore),
    weight: 0.23, // 23% weight (MEDIUM, between 20-25%)
    reasoning,
  };
}

/**
 * Phase 8.1 Step 8.1.5 — CONSENSUS NAME ALIGNMENT
 * 
 * Weight: LOW (5-10%)
 * 
 * Use Phase 8.0 name result to cross-check ratio:
 * - If primary match has known ratio, use it as validation
 * - If alternate matches agree on ratio, boost confidence
 */
function getNameConsensusSignalsV81(
  signals: InputSignalsV81
): {
  indicaPercent: number;
  sativaPercent: number;
  weight: number;
  reasoning: string[];
} | null {
  if (!signals.nameFirstResult) {
    return null;
  }
  
  const { nameFirstResult } = signals;
  const allNames = [
    nameFirstResult.primaryMatch.name,
    ...nameFirstResult.alternateMatches.map(a => a.name),
  ];
  
  // Find database entries for all names
  const dbEntries = allNames
    .map(name => {
      return CULTIVAR_LIBRARY.find(
        c => c.name.toLowerCase() === name.toLowerCase() ||
            c.aliases.some(a => a.toLowerCase() === name.toLowerCase())
      );
    })
    .filter((e): e is CultivarReference => e !== null);
  
  if (dbEntries.length === 0) {
    return null;
  }
  
  // Calculate average ratio from name consensus
  let totalIndica = 0;
  let totalSativa = 0;
  const reasoning: string[] = [];
  
  for (const entry of dbEntries) {
    const dbType = entry.type?.toLowerCase() || "";
    let indica = 50;
    let sativa = 50;
    
    if (dbType === "indica") {
      indica = 80;
      sativa = 20;
    } else if (dbType === "sativa") {
      indica = 20;
      sativa = 80;
    } else if (dbType === "hybrid") {
      const genetics = entry.genetics?.toLowerCase() || "";
      if (genetics.includes("indica") && !genetics.includes("sativa")) {
        indica = 65;
        sativa = 35;
      } else if (genetics.includes("sativa") && !genetics.includes("indica")) {
        indica = 35;
        sativa = 65;
      }
    }
    
    totalIndica += indica;
    totalSativa += sativa;
    reasoning.push(`${entry.name}: ${indica}% Indica / ${sativa}% Sativa`);
  }
  
  return {
    indicaPercent: Math.round(totalIndica / dbEntries.length),
    sativaPercent: Math.round(totalSativa / dbEntries.length),
    weight: 0.08, // 8% weight (LOW, between 5-10%)
    reasoning: [`Name consensus from Phase 8.0:`, ...reasoning],
  };
}

/**
 * Phase 8.1 Step 8.1.5 — CONSENSUS RECONCILIATION
 * 
 * Combine all signals:
 * - Normalize to 100%
 * - Snap to:
 *   - Indica-dominant (≥65%)
 *   - Sativa-dominant (≥65%)
 *   - Hybrid (35-65 split)
 * 
 * Add uncertainty buffer if signals conflict.
 */
function reconcileConsensusV81(
  sourceBreakdown: StrainRatioV81["sourceBreakdown"]
): {
  indicaPercent: number;
  sativaPercent: number;
  classification: "Indica" | "Sativa" | "Hybrid";
  classificationLabel: string;
  reasoning: string[];
} {
  let totalWeight = 0;
  let weightedIndica = 0;
  let weightedSativa = 0;
  const reasoning: string[] = [];
  
  // Phase 8.1.5 — Weighted combination
  if (sourceBreakdown.database) {
    const { indicaPercent, sativaPercent, weight, reasoning: dbReasoning } = sourceBreakdown.database;
    weightedIndica += indicaPercent * weight;
    weightedSativa += sativaPercent * weight;
    totalWeight += weight;
    reasoning.push(`Database baseline (${Math.round(weight * 100)}%): ${dbReasoning.join(", ")}`);
  }
  
  if (sourceBreakdown.visual) {
    const { indicaPercent, sativaPercent, weight, reasoning: visualReasoning } = sourceBreakdown.visual;
    weightedIndica += indicaPercent * weight;
    weightedSativa += sativaPercent * weight;
    totalWeight += weight;
    reasoning.push(`Visual morphology (${Math.round(weight * 100)}%): ${visualReasoning.join(", ")}`);
  }
  
  if (sourceBreakdown.terpene) {
    const { indicaPercent, sativaPercent, weight, reasoning: terpeneReasoning } = sourceBreakdown.terpene;
    weightedIndica += indicaPercent * weight;
    weightedSativa += sativaPercent * weight;
    totalWeight += weight;
    reasoning.push(`Terpene signals (${Math.round(weight * 100)}%): ${terpeneReasoning.join(", ")}`);
  }
  
  if (sourceBreakdown.nameConsensus) {
    const { indicaPercent, sativaPercent, weight, reasoning: nameReasoning } = sourceBreakdown.nameConsensus;
    weightedIndica += indicaPercent * weight;
    weightedSativa += sativaPercent * weight;
    totalWeight += weight;
    reasoning.push(`Name consensus (${Math.round(weight * 100)}%): ${nameReasoning.join(", ")}`);
  }
  
  // Phase 8.1.5 — Normalize to 100%
  if (totalWeight === 0) {
    // Fallback if no signals
    return {
      indicaPercent: 50,
      sativaPercent: 50,
      classification: "Hybrid",
      classificationLabel: "Balanced Hybrid",
      reasoning: ["No signals available, defaulting to balanced hybrid"],
    };
  }
  
  const finalIndica = Math.round(weightedIndica / totalWeight);
  const finalSativa = 100 - finalIndica;
  
  // Phase 8.1.5 — Snap to classification categories
  let classification: "Indica" | "Sativa" | "Hybrid";
  let classificationLabel: string;
  
  if (finalIndica >= 65) {
    classification = "Indica";
    classificationLabel = finalIndica >= 80 ? "Indica" : "Indica-dominant Hybrid";
  } else if (finalSativa >= 65) {
    classification = "Sativa";
    classificationLabel = finalSativa >= 80 ? "Sativa" : "Sativa-dominant Hybrid";
  } else {
    classification = "Hybrid";
    if (finalIndica >= 55) {
      classificationLabel = "Indica-leaning Hybrid";
    } else if (finalSativa >= 55) {
      classificationLabel = "Sativa-leaning Hybrid";
    } else {
      classificationLabel = "Balanced Hybrid";
    }
  }
  
  return {
    indicaPercent: finalIndica,
    sativaPercent: finalSativa,
    classification,
    classificationLabel,
    reasoning,
  };
}

/**
 * Phase 8.1 Step 8.1.6 — OUTPUT FORMAT
 * 
 * Generate short explanation:
 * "Based on bud structure, terpene signals, and alignment with known cultivars."
 */
function generateExplanationV81(
  classificationLabel: string,
  sourceBreakdown: StrainRatioV81["sourceBreakdown"]
): string {
  const parts: string[] = [];
  
  if (sourceBreakdown.database) {
    parts.push("strain genetics");
  }
  if (sourceBreakdown.visual) {
    parts.push("visual structure");
  }
  if (sourceBreakdown.terpene) {
    parts.push("terpene signals");
  }
  if (sourceBreakdown.nameConsensus) {
    parts.push("alignment with known cultivars");
  }
  
  if (parts.length === 0) {
    return `This plant shows ${classificationLabel.toLowerCase()} characteristics.`;
  }
  
  return `Based on ${parts.join(", ")}, this plant most closely matches ${classificationLabel.toLowerCase()} characteristics.`;
}

/**
 * Phase 8.1 — MAIN FUNCTION
 */
export function resolveStrainRatioV81(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: Array<{ name: string; likelihood: string }>,
  nameFirstResult?: NameFirstResultV80
): StrainRatioV81 {
  // Phase 8.1.1 — INPUT SIGNALS
  const signals: InputSignalsV81 = {
    strainName,
    dbEntry,
    fusedFeatures,
    imageResults,
    imageCount,
    terpeneProfile,
    nameFirstResult,
  };
  
  // Phase 8.1.2 — DATABASE BASELINE
  const databaseSignal = getDatabaseBaselineV81(signals);
  
  // Phase 8.1.3 — VISUAL MORPHOLOGY SIGNALS
  const visualSignal = getVisualMorphologySignalsV81(signals);
  
  // Phase 8.1.4 — TERPENE & EFFECT SIGNALS
  const terpeneSignal = getTerpeneSignalsV81(signals);
  
  // Phase 8.1.5 — CONSENSUS NAME ALIGNMENT
  const nameConsensusSignal = getNameConsensusSignalsV81(signals);
  
  // Phase 8.1.5 — BUILD SOURCE BREAKDOWN
  const sourceBreakdown: StrainRatioV81["sourceBreakdown"] = {};
  if (databaseSignal) {
    sourceBreakdown.database = databaseSignal;
  }
  if (visualSignal) {
    sourceBreakdown.visual = visualSignal;
  }
  if (terpeneSignal) {
    sourceBreakdown.terpene = terpeneSignal;
  }
  if (nameConsensusSignal) {
    sourceBreakdown.nameConsensus = nameConsensusSignal;
  }
  
  // Phase 8.1.5 — CONSENSUS RECONCILIATION
  const reconciled = reconcileConsensusV81(sourceBreakdown);
  
  // Phase 8.1.6 — OUTPUT FORMAT
  const explanation = generateExplanationV81(reconciled.classificationLabel, sourceBreakdown);
  
  // Phase 8.1.6 — Determine confidence
  let confidence: "very_high" | "high" | "medium" | "low";
  const sourceCount = Object.keys(sourceBreakdown).length;
  
  if (sourceCount >= 3 && databaseSignal) {
    confidence = imageCount >= 3 ? "very_high" : "high";
  } else if (sourceCount >= 2) {
    confidence = imageCount >= 2 ? "high" : "medium";
  } else {
    confidence = "medium";
  }
  
  // Lower confidence if signals conflict significantly
  if (sourceCount >= 2) {
    const signals = Object.values(sourceBreakdown);
    const indicaValues = signals.map(s => s.indicaPercent);
    const maxIndica = Math.max(...indicaValues);
    const minIndica = Math.min(...indicaValues);
    if (maxIndica - minIndica > 30) {
      confidence = confidence === "very_high" ? "high" : confidence === "high" ? "medium" : "low";
    }
  }
  
  return {
    classification: reconciled.classification,
    classificationLabel: reconciled.classificationLabel,
    ratio: `${reconciled.indicaPercent}% Indica / ${reconciled.sativaPercent}% Sativa`,
    indicaPercent: reconciled.indicaPercent,
    sativaPercent: reconciled.sativaPercent,
    confidence,
    explanation,
    sourceBreakdown,
  };
}
