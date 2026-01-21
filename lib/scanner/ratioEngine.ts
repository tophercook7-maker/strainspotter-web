// lib/scanner/ratioEngine.ts
// Phase 4.6 — Indica / Sativa / Hybrid Ratio Engine
// Phase 4.8 — Enhanced Multi-Source Weighted Ratio Engine
// Phase 5.0 — Enhanced with Range Display & Explicit Phenotype Detection
// Phase 5.2 — Genetics + Terpene Weighting + Phenotype Signals Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NormalizedTerpeneProfile } from "./terpeneExperienceEngine";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 4.6 Step 4.6.1 — Ratio Result
 * Phase 4.8 — Enhanced with confidence-aware display
 * Phase 5.0 Step 5.0.4 — Enhanced with range display
 */
export type StrainRatio = {
  indicaPercent: number; // 0-100
  sativaPercent: number; // 0-100
  indicaRange?: { min: number; max: number }; // Phase 5.0 — Range if variance exists
  sativaRange?: { min: number; max: number }; // Phase 5.0 — Range if variance exists
  dominance: "Indica" | "Sativa" | "Hybrid" | "Balanced";
  displayText: string; // "Indica 70% · Sativa 30%" or "Indica-leaning Hybrid (60–70% Indica)"
  explanation: {
    source: "database_explicit" | "database_dominance" | "lineage_inferred" | "morphology_adjusted" | "consensus_weighted" | "default";
    databaseStrain?: string; // Strain name from database
    confidenceNotes?: string; // Why this ratio was chosen
    imageAlignment?: string; // Multi-image consensus notes
    lineageInference?: string; // Parent strain inference
    morphologyAdjustment?: string; // Visual trait adjustment
    confidenceLevel?: "high" | "medium" | "low"; // Confidence in ratio
    varianceRange?: string; // Phase 5.0 — Range explanation if variance exists
  };
};

/**
 * Phase 8.6.1 — DATABASE BASELINE
 * 
 * From strain database:
 * - If strain has known ratio → use as baseline
 * - Normalize all strains to:
 *   {
 *     indica: number,
 *     sativa: number
 *   }
 * Hybrid = 100 − (indica + sativa)
 */
function extractDatabaseBaselineV8_6(
  strainName: string,
  dbEntry?: CultivarReference
): { indica: number; sativa: number; hybrid: number } | null {
  const baseline = resolveGeneticBaseline(strainName, dbEntry);
  
  if (!baseline) {
    return null;
  }
  
  const indica = baseline.indicaPercent;
  const sativa = baseline.sativaPercent;
  const hybrid = 100 - (indica + sativa); // Phase 8.6.1 — Hybrid = 100 − (indica + sativa)
  
  console.log("DOMINANCE BASE:", `${indica}% Indica / ${sativa}% Sativa / ${hybrid}% Hybrid`);
  
  return {
    indica,
    sativa,
    hybrid: Math.max(0, hybrid), // Ensure non-negative
  };
}

/**
 * Phase 8.2.2 — DATABASE LINEAGE SIGNALS
 * Phase 8.4.2 — Enhanced to database dominance prior for top 5 candidate strain names
 * 
 * For top 5 candidate strain names:
 * - Pull known dominance ratios from DB
 * - If missing, infer from lineage
 * - Weight by name confidence
 * 
 * Produce:
 * {
 *   dbIndica: number,
 *   dbSativa: number
 * }
 */
function extractDatabaseLineageSignals(
  strainName: string,
  dbEntry?: CultivarReference
): { indicaScore: number; sativaScore: number } | null {
  const baseline = resolveGeneticBaseline(strainName, dbEntry);
  
  if (!baseline) {
    return null;
  }
  
  return {
    indicaScore: baseline.indicaPercent,
    sativaScore: baseline.sativaPercent,
  };
}

/**
 * Phase 8.4.2 — DATABASE DOMINANCE PRIOR
 * 
 * For top 5 candidate strain names:
 * - Pull known dominance ratios from DB
 * - If missing, infer from lineage
 * - Weight by name confidence
 */
function extractDatabaseDominancePrior(
  topCandidateNames?: Array<{ name: string; confidence: number }>
): { dbIndica: number; dbSativa: number } | null {
  if (!topCandidateNames || topCandidateNames.length === 0) {
    return null;
  }
  
  // Phase 8.4.2 — Process top 5 candidates (or all if < 5)
  const top5 = topCandidateNames.slice(0, 5);
  const weightedRatios: Array<{ indica: number; sativa: number; weight: number }> = [];
  
  top5.forEach(candidate => {
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name.toLowerCase() === candidate.name.toLowerCase() ||
      s.aliases?.some(a => a.toLowerCase() === candidate.name.toLowerCase())
    );
    
    if (dbEntry) {
      // Phase 8.4.2 — Pull known dominance ratios from DB
      const baseline = resolveGeneticBaseline(candidate.name, dbEntry);
      
      if (baseline) {
        // Phase 8.4.2 — Weight by name confidence
        const weight = candidate.confidence / 100; // Normalize to 0-1
        weightedRatios.push({
          indica: baseline.indicaPercent,
          sativa: baseline.sativaPercent,
          weight,
        });
      }
    }
  });
  
  if (weightedRatios.length === 0) {
    return null;
  }
  
  // Phase 8.4.2 — Calculate weighted average
  let totalWeight = 0;
  let weightedIndicaSum = 0;
  let weightedSativaSum = 0;
  
  weightedRatios.forEach(ratio => {
    weightedIndicaSum += ratio.indica * ratio.weight;
    weightedSativaSum += ratio.sativa * ratio.weight;
    totalWeight += ratio.weight;
  });
  
  const dbIndica = totalWeight > 0 ? Math.round(weightedIndicaSum / totalWeight) : 50;
  const dbSativa = totalWeight > 0 ? Math.round(weightedSativaSum / totalWeight) : 50;
  
  // Phase 8.4.2 — Normalize to 100%
  const total = dbIndica + dbSativa;
  const finalDbIndica = Math.round((dbIndica / total) * 100);
  const finalDbSativa = 100 - finalDbIndica;
  
  console.log("DOMINANCE DB:", `${finalDbIndica}% Indica / ${finalDbSativa}% Sativa (weighted from ${weightedRatios.length} candidates)`);
  
  return {
    dbIndica: finalDbIndica,
    dbSativa: finalDbSativa,
  };
}

/**
 * Phase 5.2.1 — CANONICAL RATIO SOURCE
 * 
 * For each candidate strain:
 * Pull baseline ratio from database:
 * {
 *   indicaPercent: number,
 *   sativaPercent: number,
 *   hybridType?: "balanced" | "indica-leaning" | "sativa-leaning"
 * }
 * 
 * If missing:
 * - Infer from lineage (parent averaging)
 * - Flag as inferred (not lab-confirmed)
 */
function resolveGeneticBaseline(
  strainName: string,
  dbEntry?: CultivarReference
): { indicaPercent: number; sativaPercent: number; hybridType?: "balanced" | "indica-leaning" | "sativa-leaning"; source: "database_explicit" | "database_dominance" | "lineage_inferred" | "breeder_classification" | "historical_phenotype" | null; isInferred: boolean; reasoning: string } | null {
  if (!dbEntry) {
    return null; // Cannot resolve without database entry
  }

  // Phase 5.0.9.1 — STEP 1: Check for explicit percentages in database (future enhancement)
  // For now, database doesn't have explicit percentages, so we derive from dominance type or lineage

  // Phase 5.0.9.1 — STEP 2: Extract breeder classification (if available)
  // Breeder notes often contain explicit indica/sativa percentages
  const breederNotes = dbEntry.breederNotes || dbEntry.notes || "";
  const breederRatioMatch = breederNotes.match(/(\d+)%?\s*(?:indica|indica-dominant)/i);
  const breederSativaMatch = breederNotes.match(/(\d+)%?\s*(?:sativa|sativa-dominant)/i);
  
  if (breederRatioMatch || breederSativaMatch) {
    const indicaFromBreeder = breederRatioMatch ? parseInt(breederRatioMatch[1]) : null;
    const sativaFromBreeder = breederSativaMatch ? parseInt(breederSativaMatch[1]) : null;
    
    if (indicaFromBreeder !== null || sativaFromBreeder !== null) {
      const indicaPercent = indicaFromBreeder !== null ? indicaFromBreeder : (sativaFromBreeder !== null ? 100 - sativaFromBreeder : 50);
      const sativaPercent = sativaFromBreeder !== null ? sativaFromBreeder : (indicaFromBreeder !== null ? 100 - indicaFromBreeder : 50);
      
      // Phase 5.2.1 — Determine hybridType
      let hybridType: "balanced" | "indica-leaning" | "sativa-leaning" | undefined;
      if (indicaPercent >= 55) {
        hybridType = "indica-leaning";
      } else if (sativaPercent >= 55) {
        hybridType = "sativa-leaning";
      } else if (indicaPercent >= 40 && indicaPercent <= 60) {
        hybridType = "balanced";
      }
      
      return {
        indicaPercent,
        sativaPercent,
        hybridType,
        source: "breeder_classification",
        isInferred: false, // Phase 5.2.1 — Breeder classification is explicit
        reasoning: `Breeder classification: ${indicaPercent}% Indica / ${sativaPercent}% Sativa`,
      };
    }
  }

  // Phase 5.0.9.1 — STEP 3: Historical phenotype records (if available)
  // Check for historical phenotype data in sources or metadata
  const historicalPhenotype = dbEntry.sources?.find(s => 
    typeof s === "string" && (s.toLowerCase().includes("phenotype") || s.toLowerCase().includes("historical"))
  );
  
  if (historicalPhenotype && dbEntry.morphology) {
    // Use morphology data as historical phenotype indicator
    const morphologyType = dbEntry.morphology.plantType || dbEntry.type;
    if (morphologyType === "Indica" || morphologyType === "Sativa" || morphologyType === "Hybrid") {
      // This will be handled by the type check below, but we mark it as historical
      // For now, continue to type-based classification
    }
  }

  // Phase 5.2.1 — STEP 4: Infer from lineage (parents → indica/sativa bias)
  const lineageInference = inferRatioFromLineage(dbEntry);
  if (lineageInference) {
    // Phase 5.2.1 — Determine hybridType from inferred ratio
    let hybridType: "balanced" | "indica-leaning" | "sativa-leaning" | undefined;
    if (lineageInference.indicaPercent >= 55) {
      hybridType = "indica-leaning";
    } else if (lineageInference.sativaPercent >= 55) {
      hybridType = "sativa-leaning";
    } else if (lineageInference.indicaPercent >= 40 && lineageInference.indicaPercent <= 60) {
      hybridType = "balanced";
    }
    
    return {
      indicaPercent: lineageInference.indicaPercent,
      sativaPercent: lineageInference.sativaPercent,
      hybridType,
      source: "lineage_inferred",
      isInferred: true, // Phase 5.2.1 — Flag as inferred (not lab-confirmed)
      reasoning: lineageInference.inference,
    };
  }

  // Phase 5.2 Step 5.2.1 — Fallback to dominance type
  const type = dbEntry.type || dbEntry.dominantType;
  
  let indicaPercent: number;
  let sativaPercent: number;
  let source: "database_explicit" | "database_dominance" | null;
  let reasoning: string;

  // Phase 5.2.1 — Determine hybridType and baseline ratios
  let hybridType: "balanced" | "indica-leaning" | "sativa-leaning" | undefined;
  
  if (type === "Indica") {
    indicaPercent = 70; // Indica-dominant baseline
    sativaPercent = 30;
    hybridType = "indica-leaning";
    source = "database_dominance";
    reasoning = `Genetic baseline derived from database classification: ${strainName} is Indica-dominant`;
  } else if (type === "Sativa") {
    indicaPercent = 30;
    sativaPercent = 70; // Sativa-dominant baseline
    hybridType = "sativa-leaning";
    source = "database_dominance";
    reasoning = `Genetic baseline derived from database classification: ${strainName} is Sativa-dominant`;
  } else if (type === "Hybrid") {
    // Phase 5.2.1 — Hybrid type defaults to 50/50, but will be adjusted by visual features
    indicaPercent = 50;
    sativaPercent = 50; // Balanced hybrid baseline
    hybridType = "balanced";
    source = "database_dominance";
    reasoning = `Genetic baseline derived from database classification: ${strainName} is a Hybrid (50/50 baseline, may be adjusted by visual traits)`;
  } else {
    return null; // Unknown type
  }

  return {
    indicaPercent,
    sativaPercent,
    hybridType,
    source,
    isInferred: false, // Phase 5.2.1 — Database dominance is explicit
    reasoning,
  };
}

/**
 * Phase 4.8 Step 4.8.2 — GENETIC LINEAGE INFERENCE
 * 
 * If ratio is missing or vague:
 * Infer from parents:
 * Example:
 * - Parent A: 80% indica
 * - Parent B: 60% sativa
 * → Child baseline: ~50/50 hybrid
 * 
 * Lineage weight = 25%
 */
function inferRatioFromLineage(
  dbEntry?: CultivarReference
): { indicaPercent: number; sativaPercent: number; inference: string } | null {
  if (!dbEntry || !dbEntry.genetics) {
    return null;
  }

  // Phase 4.8 Step 4.8.2 — Parse parent strains from genetics string
  // Example: "Afghan × Thai" or "Blueberry × Haze"
  const geneticsStr = dbEntry.genetics.trim();
  const parentPattern = /([^×x/]+)\s*[×x/]\s*([^×x/]+)/gi;
  const match = parentPattern.exec(geneticsStr);
  
  if (!match) {
    return null; // Cannot parse parents
  }

  const parent1Name = match[1].trim();
  const parent2Name = match[2].trim();

  // Phase 4.8 Step 4.8.2 — Look up parent strains in database
  const parent1 = CULTIVAR_LIBRARY.find(s => 
    s.name.toLowerCase() === parent1Name.toLowerCase() ||
    s.aliases?.some(a => a.toLowerCase() === parent1Name.toLowerCase())
  );
  
  const parent2 = CULTIVAR_LIBRARY.find(s => 
    s.name.toLowerCase() === parent2Name.toLowerCase() ||
    s.aliases?.some(a => a.toLowerCase() === parent2Name.toLowerCase())
  );

  if (!parent1 || !parent2) {
    return null; // Cannot find both parents
  }

  // Phase 4.8 Step 4.8.2 — Resolve parent ratios from database
  const parent1Ratio = resolveGeneticBaseline(parent1.name, parent1);
  const parent2Ratio = resolveGeneticBaseline(parent2.name, parent2);

  if (!parent1Ratio || !parent2Ratio) {
    return null; // Cannot resolve parent ratios
  }

  // Phase 4.8 Step 4.8.2 — Average parent ratios (simple genetic inference)
  const inferredIndica = Math.round((parent1Ratio.indicaPercent + parent2Ratio.indicaPercent) / 2);
  const inferredSativa = Math.round((parent1Ratio.sativaPercent + parent2Ratio.sativaPercent) / 2);

  // Phase 4.8 Step 4.8.2 — Normalize to 100%
  const total = inferredIndica + inferredSativa;
  const indicaPercent = Math.round((inferredIndica / total) * 100);
  const sativaPercent = 100 - indicaPercent;

  const inference = `Inferred from parent strains: ${parent1.name} (${parent1Ratio.indicaPercent}% indica, ${parent1Ratio.sativaPercent}% sativa) × ${parent2.name} (${parent2Ratio.indicaPercent}% indica, ${parent2Ratio.sativaPercent}% sativa) → ${indicaPercent}% / ${sativaPercent}%`;

  return {
    indicaPercent,
    sativaPercent,
    inference,
  };
}

/**
 * Phase 5.6.1 — SIGNAL SOURCES: Effect profile bias (secondary signal)
 * 
 * Derive ratios from:
 * - Effect profile bias (secondary signal)
 * - Terpene profile (Myrcene/Linalool → Indica, Limonene/Terpinolene → Sativa)
 * 
 * Effects can shift ±5% (Phase 5.6.2)
 */
function calculateEffectProfileBias(
  dbEntry?: CultivarReference,
  effectProfile?: { primaryEffects?: Array<{ name: string }>; secondaryEffects?: Array<{ name: string }> }
): { adjustment: number; reasoning: string } | null {
  if (!dbEntry && !effectProfile) {
    return null;
  }

  let adjustment = 0;
  const reasoning: string[] = [];
  const effectNames: string[] = [];

  // Phase 5.6.1 — Extract effects from database entry
  if (dbEntry?.effects && dbEntry.effects.length > 0) {
    effectNames.push(...dbEntry.effects.map(e => e.toLowerCase()));
  }

  // Phase 5.6.1 — Extract effects from effect profile
  if (effectProfile?.primaryEffects) {
    effectNames.push(...effectProfile.primaryEffects.map(e => e.name.toLowerCase()));
  }
  if (effectProfile?.secondaryEffects) {
    effectNames.push(...effectProfile.secondaryEffects.map(e => e.name.toLowerCase()));
  }

  if (effectNames.length === 0) {
    return null;
  }

  // Phase 5.6.1 — Indica-leaning effects
  const indicaEffects = ["relaxation", "sedation", "body", "sleep", "calm", "pain relief", "couch lock"];
  const indicaCount = effectNames.filter(e => indicaEffects.some(ie => e.includes(ie))).length;

  // Phase 5.6.1 — Sativa-leaning effects
  const sativaEffects = ["euphoria", "creativity", "uplifted", "focused", "energy", "energetic", "happy", "giggly", "talkative"];
  const sativaCount = effectNames.filter(e => sativaEffects.some(se => e.includes(se))).length;

  // Phase 5.6.2 — Effects can shift ±5%
  if (indicaCount > sativaCount) {
    adjustment = Math.min(5, (indicaCount - sativaCount) * 1.5); // Max +5%
    reasoning.push(`Indica-leaning effects (${indicaCount} vs ${sativaCount} sativa effects)`);
  } else if (sativaCount > indicaCount) {
    adjustment = Math.max(-5, -(sativaCount - indicaCount) * 1.5); // Max -5%
    reasoning.push(`Sativa-leaning effects (${sativaCount} vs ${indicaCount} indica effects)`);
  }

  if (adjustment === 0) {
    return null;
  }

  return {
    adjustment,
    reasoning: reasoning.join("; "),
  };
}

/**
 * Phase 5.0.9.3 — TERPENE & EFFECT CORRELATION
 * 
 * Use terpene likelihoods:
 * - Myrcene / Linalool → Indica bias
 * - Limonene / Terpinolene → Sativa bias
 * - Caryophyllene → Hybrid stabilizer
 * 
 * Apply soft weighting (no hard flips).
 * Weight: 20% of final ratio
 */
function calculateTerpeneWeighting(
  terpeneProfile?: NormalizedTerpeneProfile
): { indicaPercent: number; sativaPercent: number; weight: number; reasoning: string[] } | null {
  if (!terpeneProfile || terpeneProfile.primaryTerpenes.length === 0) {
    return null;
  }

  const reasoning: string[] = [];
  const indicaTerpenes = ["myrcene", "linalool"];
  const sativaTerpenes = ["limonene", "terpinolene"];
  const hybridStabilizers = ["caryophyllene", "humulene"]; // Phase 5.0.9.3 — Hybrid stabilizers

  let indicaScore = 0;
  let sativaScore = 0;
  let hybridStabilizerScore = 0; // Phase 5.0.9.3 — Track hybrid stabilizers

  // Phase 5.0.9.3 — Analyze primary terpenes
  terpeneProfile.primaryTerpenes.forEach(terpene => {
    const nameLower = terpene.name.toLowerCase();
    const dominanceWeight = terpene.dominanceScore || 1.0;

    if (indicaTerpenes.some(t => nameLower.includes(t))) {
      indicaScore += dominanceWeight;
      reasoning.push(`${terpene.name} (Indica-leaning, weight: ${dominanceWeight.toFixed(1)})`);
    } else if (sativaTerpenes.some(t => nameLower.includes(t))) {
      sativaScore += dominanceWeight;
      reasoning.push(`${terpene.name} (Sativa-leaning, weight: ${dominanceWeight.toFixed(1)})`);
    } else if (hybridStabilizers.some(t => nameLower.includes(t))) {
      // Phase 5.0.9.3 — Hybrid stabilizer: reduces bias toward either extreme
      hybridStabilizerScore += dominanceWeight;
      reasoning.push(`${terpene.name} (Hybrid stabilizer, weight: ${dominanceWeight.toFixed(1)})`);
    }
  });

  // Phase 5.0.9.3 — Analyze secondary terpenes (lower weight)
  terpeneProfile.secondaryTerpenes?.forEach(terpene => {
    const nameLower = terpene.name.toLowerCase();
    const dominanceWeight = (terpene.dominanceScore || 0.5) * 0.5; // Half weight for secondary

    if (indicaTerpenes.some(t => nameLower.includes(t))) {
      indicaScore += dominanceWeight;
    } else if (sativaTerpenes.some(t => nameLower.includes(t))) {
      sativaScore += dominanceWeight;
    } else if (hybridStabilizers.some(t => nameLower.includes(t))) {
      hybridStabilizerScore += dominanceWeight;
    }
  });

  if (indicaScore === 0 && sativaScore === 0 && hybridStabilizerScore === 0) {
    return null;
  }

  // Phase 5.0.9.3 — Convert scores to ratio with hybrid stabilizer effect
  // Hybrid stabilizers pull toward balanced (50/50)
  const totalScore = indicaScore + sativaScore + hybridStabilizerScore;
  
  // Phase 5.0.9.3 — Soft weighting: calculate bias, then apply stabilizer
  let indicaPercent: number;
  let sativaPercent: number;
  
  if (totalScore > 0) {
    // Calculate base bias from indica/sativa terpenes
    const indicaBias = (indicaScore / (indicaScore + sativaScore || 1)) * 100;
    const sativaBias = (sativaScore / (indicaScore + sativaScore || 1)) * 100;
    
    // Phase 5.0.9.3 — Apply hybrid stabilizer (pulls toward 50/50)
    const stabilizerWeight = hybridStabilizerScore / totalScore;
    const biasStrength = Math.abs(indicaBias - sativaBias) / 100; // 0-1
    
    // Soft weighting: stabilizer reduces extreme bias
    const adjustedBias = biasStrength * (1 - stabilizerWeight * 0.5); // Max 50% reduction
    
    if (indicaScore > sativaScore) {
      indicaPercent = 50 + (adjustedBias * 30); // Max ±30% from center
      sativaPercent = 100 - indicaPercent;
    } else if (sativaScore > indicaScore) {
      sativaPercent = 50 + (adjustedBias * 30);
      indicaPercent = 100 - sativaPercent;
    } else {
      // Balanced or stabilizer-dominant
      indicaPercent = 50;
      sativaPercent = 50;
    }
  } else {
    // Only stabilizers present
    indicaPercent = 50;
    sativaPercent = 50;
  }

  // Phase 5.0.5.1 — Clamp to reasonable range
  const clampedIndica = Math.max(20, Math.min(80, indicaPercent));
  const clampedSativa = 100 - clampedIndica;

  if (reasoning.length === 0) {
    reasoning.push("Terpene profile analyzed but no clear indica/sativa signals");
  }

  console.log("Phase 5.0.5.1 — TERPENE WEIGHTING:", {
    indicaScore,
    sativaScore,
    indicaPercent: clampedIndica,
    sativaPercent: clampedSativa,
  });

  return {
    indicaPercent: clampedIndica,
    sativaPercent: clampedSativa,
    weight: 0.2, // 20% weight
    reasoning,
  };
}

/**
 * Phase 8.0.1 — PER-IMAGE DOMINANCE SIGNALS
 * 
 * For EACH image analyzed, infer dominance signals from:
 * - Leaf width (broad vs narrow)
 * - Internode spacing
 * - Bud density & shape
 * - Trichome distribution
 * - Growth posture cues already extracted
 * 
 * Generate per-image scores:
 * {
 *   indicaScore: number,   // 0–100
 *   sativaScore: number,   // 0–100
 * }
 * 
 * Hybrid implied when both > 40.
 */
/**
 * Phase 8.2.1 — PER-IMAGE DOMINANCE SIGNALS
 * 
 * For EACH image, extract dominance signals:
 * - Leaf width (broad vs narrow)
 * - Bud structure (dense vs airy)
 * - Internodal spacing
 * - Flower shape
 * 
 * Output per image:
 * {
 *   imageLabel: string,
 *   indicaScore: number,
 *   sativaScore: number
 * }
 */
function extractPerImageDominanceSignals(
  imageResults: ImageResult[]
): Array<{
  imageLabel: string;
  indicaScore: number;
  sativaScore: number;
}> {
  const perImageDominance: Array<{
    imageLabel: string;
    indicaScore: number;
    sativaScore: number;
  }> = [];
  
  imageResults.forEach((result, imageIndex) => {
    const imageLabel = `Image ${imageIndex + 1}`;
    // Phase 8.4.1 — Use enhanced calculation with color tone & structure
    const dominance = calculatePerImageDominanceV8_4(result, 50); // Start with 50/50 baseline
    
    if (dominance) {
      perImageDominance.push({
        imageLabel,
        indicaScore: dominance.indica,
        sativaScore: dominance.sativa,
      });
    }
  });
  
  console.log("DOMINANCE VISUAL:", perImageDominance.map(img => 
    `${img.imageLabel}: ${img.indicaScore}% Indica / ${img.sativaScore}% Sativa`
  ).join(", "));
  
  return perImageDominance;
}

/**
 * Phase 8.6.2 — VISUAL MODULATION
 * 
 * Adjust baseline using visual cues:
 * - Leaf width
 * - Bud density
 * - Internodal spacing
 * - Color & structure
 * 
 * Rules:
 * + Wide leaves → +Indica
 * + Tall/airy → +Sativa
 * + Mixed signals → push toward Hybrid
 * 
 * Max visual adjustment: ±15%
 */
function calculateVisualModulationV8_6(
  baselineRatio: { indica: number; sativa: number; hybrid: number },
  imageResults: ImageResult[],
  fusedFeatures?: FusedFeatures
): { indica: number; sativa: number; hybrid: number; adjustment: number } {
  let indicaAdjustment = 0;
  let sativaAdjustment = 0;
  let hybridAdjustment = 0;
  
  // Phase 8.6.2 — Leaf width (wide leaves → +Indica)
  if (fusedFeatures?.leafShape === "broad") {
    indicaAdjustment += 5; // Wide leaves → +Indica
    sativaAdjustment -= 5;
  } else if (fusedFeatures?.leafShape === "narrow") {
    indicaAdjustment -= 5; // Narrow leaves → +Sativa
    sativaAdjustment += 5;
  }
  
  // Phase 8.6.2 — Bud density (dense → +Indica, airy → +Sativa)
  if (fusedFeatures?.budStructure === "high") {
    indicaAdjustment += 4; // Dense → +Indica
    sativaAdjustment -= 4;
  } else if (fusedFeatures?.budStructure === "low") {
    indicaAdjustment -= 4; // Airy → +Sativa
    sativaAdjustment += 4;
  }
  
  // Phase 8.6.2 — Internodal spacing (short → +Indica, long → +Sativa)
  // Infer from image results
  let hasCompactStructure = false;
  let hasStretchyStructure = false;
  
  imageResults.forEach(result => {
    const morphologyText = (result.wikiResult.morphology.budStructure + " " + result.wikiResult.morphology.coloration).toLowerCase();
    if (morphologyText.includes("compact") || morphologyText.includes("tight") || morphologyText.includes("dense")) {
      hasCompactStructure = true;
    }
    if (morphologyText.includes("stretchy") || morphologyText.includes("elongated") || morphologyText.includes("airy") || morphologyText.includes("tall")) {
      hasStretchyStructure = true;
    }
  });
  
  if (hasCompactStructure && !hasStretchyStructure) {
    indicaAdjustment += 3; // Short internodes → +Indica
    sativaAdjustment -= 3;
  } else if (hasStretchyStructure && !hasCompactStructure) {
    indicaAdjustment -= 3; // Long internodes → +Sativa
    sativaAdjustment += 3;
  } else if (hasCompactStructure && hasStretchyStructure) {
    // Phase 8.6.2 — Mixed signals → push toward Hybrid
    hybridAdjustment += 3;
    indicaAdjustment -= 1.5;
    sativaAdjustment -= 1.5;
  }
  
  // Phase 8.6.2 — Color & structure (darker → +Indica, lighter → +Sativa)
  let hasDarkColors = false;
  let hasLightColors = false;
  
  imageResults.forEach(result => {
    const colorText = (result.wikiResult.morphology.coloration || "").toLowerCase();
    if (colorText.includes("purple") || colorText.includes("deep") || colorText.includes("dark")) {
      hasDarkColors = true;
    }
    if (colorText.includes("lime") || colorText.includes("bright") || colorText.includes("yellow")) {
      hasLightColors = true;
    }
  });
  
  if (hasDarkColors && !hasLightColors) {
    indicaAdjustment += 2; // Darker colors → +Indica
    sativaAdjustment -= 2;
  } else if (hasLightColors && !hasDarkColors) {
    indicaAdjustment -= 2; // Lighter colors → +Sativa
    sativaAdjustment += 2;
  } else if (hasDarkColors && hasLightColors) {
    // Phase 8.6.2 — Mixed signals → push toward Hybrid
    hybridAdjustment += 2;
    indicaAdjustment -= 1;
    sativaAdjustment -= 1;
  }
  
  // Phase 8.6.2 — Max visual adjustment: ±15%
  const totalIndicaAdjustment = Math.max(-15, Math.min(15, indicaAdjustment));
  const totalSativaAdjustment = Math.max(-15, Math.min(15, sativaAdjustment));
  const totalHybridAdjustment = Math.max(-15, Math.min(15, hybridAdjustment));
  
  // Phase 8.6.2 — Apply adjustments to baseline
  let adjustedIndica = baselineRatio.indica + totalIndicaAdjustment;
  let adjustedSativa = baselineRatio.sativa + totalSativaAdjustment;
  let adjustedHybrid = baselineRatio.hybrid + totalHybridAdjustment;
  
  // Phase 8.6.2 — Clamp to valid range
  adjustedIndica = Math.max(0, Math.min(100, adjustedIndica));
  adjustedSativa = Math.max(0, Math.min(100, adjustedSativa));
  adjustedHybrid = Math.max(0, Math.min(100, adjustedHybrid));
  
  // Phase 8.6.2 — Normalize to 100%
  const total = adjustedIndica + adjustedSativa + adjustedHybrid;
  if (Math.abs(total - 100) > 0.1) {
    adjustedIndica = Math.round((adjustedIndica / total) * 100);
    adjustedSativa = Math.round((adjustedSativa / total) * 100);
    adjustedHybrid = 100 - adjustedIndica - adjustedSativa;
  }
  
  const totalAdjustment = Math.abs(totalIndicaAdjustment) + Math.abs(totalSativaAdjustment) + Math.abs(totalHybridAdjustment);
  
  console.log("DOMINANCE VISUAL ADJUSTED:", `${adjustedIndica}% Indica / ${adjustedSativa}% Sativa / ${adjustedHybrid}% Hybrid (adjustment: ±${totalAdjustment.toFixed(1)}%)`);
  
  return {
    indica: Math.round(adjustedIndica),
    sativa: Math.round(adjustedSativa),
    hybrid: Math.round(adjustedHybrid),
    adjustment: totalAdjustment,
  };
}

/**
 * Phase 8.4.1 — Enhanced per-image dominance calculation with color tone & structure
 */
function calculatePerImageDominanceV8_4(
  imageResult: ImageResult,
  baselineIndica: number
): { indica: number; sativa: number } | null {
  if (!imageResult.detectedTraits) {
    return null;
  }
  
  let indicaScore = baselineIndica;
  let sativaScore = 100 - baselineIndica;
  
  const traits = imageResult.detectedTraits;
  const wikiResult = imageResult.wikiResult;
  
  // Phase 8.4.1 — Leaf width (broad vs narrow)
  if (traits.leafShape === "broad") {
    indicaScore += 10; // Broad leaves = indica
    sativaScore -= 10;
  } else if (traits.leafShape === "narrow") {
    indicaScore -= 10; // Narrow leaves = sativa
    sativaScore += 10;
  }
  
  // Phase 8.4.1 — Bud density (compact vs airy)
  if (traits.budStructure === "high") {
    indicaScore += 8; // Compact/dense = indica
    sativaScore -= 8;
  } else if (traits.budStructure === "low") {
    indicaScore -= 8; // Airy = sativa
    sativaScore += 8;
  }
  
  // Phase 8.4.1 — Internodal spacing (inferred from bud structure and morphology)
  const morphologyText = (wikiResult.morphology.budStructure + " " + wikiResult.morphology.coloration).toLowerCase();
  if (morphologyText.includes("compact") || morphologyText.includes("tight") || morphologyText.includes("dense")) {
    indicaScore += 6; // Short internodes = indica
    sativaScore -= 6;
  } else if (morphologyText.includes("stretchy") || morphologyText.includes("elongated") || morphologyText.includes("airy")) {
    indicaScore -= 6; // Long internodes = sativa
    sativaScore += 6;
  }
  
  // Phase 8.4.1 — Color tone & structure
  const colorText = (wikiResult.morphology.coloration || "").toLowerCase();
  // Darker, deeper colors often indicate indica (purple, deep green)
  if (colorText.includes("purple") || colorText.includes("deep") || colorText.includes("dark")) {
    indicaScore += 4; // Darker colors = indica
    sativaScore -= 4;
  }
  // Lighter, brighter colors often indicate sativa (lime green, yellow)
  if (colorText.includes("lime") || colorText.includes("bright") || colorText.includes("yellow")) {
    indicaScore -= 4; // Lighter colors = sativa
    sativaScore += 4;
  }
  
  // Phase 8.4.1 — Structure cues (foxtailing = sativa, dense = indica)
  if (morphologyText.includes("foxtail")) {
    indicaScore -= 5; // Foxtailing = sativa
    sativaScore += 5;
  } else if (morphologyText.includes("dense") || morphologyText.includes("tight")) {
    indicaScore += 5; // Dense structure = indica
    sativaScore -= 5;
  }
  
  // Phase 8.4.1 — Clamp to valid range
  indicaScore = Math.max(0, Math.min(100, indicaScore));
  sativaScore = Math.max(0, Math.min(100, sativaScore));
  
  // Phase 8.4.1 — Normalize to 100%
  const total = indicaScore + sativaScore;
  if (Math.abs(total - 100) > 0.1) {
    indicaScore = Math.round((indicaScore / total) * 100);
    sativaScore = 100 - indicaScore;
  }
  
  return {
    indica: Math.round(indicaScore),
    sativa: Math.round(sativaScore),
  };
}

function calculatePerImageDominance(
  imageResult: ImageResult,
  baselineIndica: number
): { indica: number; sativa: number } | null {
  if (!imageResult.detectedTraits) {
    return null;
  }
  
  let indicaScore = baselineIndica;
  let sativaScore = 100 - baselineIndica;
  
  const traits = imageResult.detectedTraits;
  const wikiResult = imageResult.wikiResult;
  
  // Phase 8.0.1 — Leaf width (broad vs narrow)
  if (traits.leafShape === "broad") {
    indicaScore += 10; // Broad leaves = indica
    sativaScore -= 10;
  } else if (traits.leafShape === "narrow") {
    indicaScore -= 10; // Narrow leaves = sativa
    sativaScore += 10;
  }
  
  // Phase 8.0.1 — Internode spacing (inferred from bud structure)
  // Dense buds = short internodes (indica), airy buds = long internodes (sativa)
  if (traits.budStructure === "high") {
    indicaScore += 8; // Dense buds = indica (short internodes)
    sativaScore -= 8;
  } else if (traits.budStructure === "low") {
    indicaScore -= 8; // Airy buds = sativa (long internodes)
    sativaScore += 8;
  }
  
  // Phase 8.0.1 — Bud density & shape
  if (traits.budStructure === "high") {
    indicaScore += 7; // Dense = indica
    sativaScore -= 7;
  } else if (traits.budStructure === "low") {
    indicaScore -= 7; // Airy = sativa
    sativaScore += 7;
  }
  
  // Phase 8.0.1 — Trichome distribution
  if (traits.trichomeDensity === "high") {
    // High trichome density can indicate either, but dense coverage often = indica
    indicaScore += 3; // Slight indica lean for high trichomes
    sativaScore -= 3;
  } else if (traits.trichomeDensity === "low") {
    // Low trichomes might indicate sativa (less resinous)
    indicaScore -= 2;
    sativaScore += 2;
  }
  
  // Phase 8.0.1 — Growth posture cues (from morphology)
  const morphologyText = (wikiResult.morphology.budStructure + " " + wikiResult.morphology.coloration + " " + (wikiResult.morphology.growthIndicators || []).join(" ")).toLowerCase();
  
  // Compact/columnar growth = indica
  if (morphologyText.includes("compact") || morphologyText.includes("columnar") || morphologyText.includes("bushy")) {
    indicaScore += 5;
    sativaScore -= 5;
  }
  
  // Stretchy/elongated growth = sativa
  if (morphologyText.includes("foxtail") || morphologyText.includes("stretchy") || morphologyText.includes("elongated") || morphologyText.includes("tall")) {
    indicaScore -= 5;
    sativaScore += 5;
  }
  
  // Phase 8.0.1 — Coloration & foxtailing (from wikiResult morphology)
  if (morphologyText.includes("foxtail")) {
    indicaScore -= 4; // Foxtailing = sativa
    sativaScore += 4;
  } else if (morphologyText.includes("dense") || morphologyText.includes("tight")) {
    indicaScore += 4; // Dense/compact = indica
    sativaScore -= 4;
  }
  
  // Phase 8.0.1 — Clamp to valid range
  indicaScore = Math.max(0, Math.min(100, indicaScore));
  sativaScore = Math.max(0, Math.min(100, sativaScore));
  
  // Phase 8.0.1 — Normalize to 100%
  const total = indicaScore + sativaScore;
  if (Math.abs(total - 100) > 0.1) {
    indicaScore = Math.round((indicaScore / total) * 100);
    sativaScore = 100 - indicaScore;
  }
  
  return {
    indica: Math.round(indicaScore),
    sativa: Math.round(sativaScore),
  };
}

/**
 * Phase 5.4.1 — TRAIT-BASED SCORING
 * 
 * For each image + consensus result:
 * Score indicators:
 * 
 * INDICA signals:
 * - Short, dense buds
 * - Broad leaves
 * - Tight internodes
 * - Sedating effects
 * - Myrcene dominance
 * 
 * SATIVA signals:
 * - Long, airy buds
 * - Narrow leaves
 * - Stretchy structure
 * - Uplifting effects
 * - Limonene / Terpinolene
 * 
 * HYBRID:
 * - Mixed indicators
 * - Balanced terpene spread
 * - Conflicting morphology
 * 
 * Assign numeric weights.
 */
function calculateMorphologyAdjustment(
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: NormalizedTerpeneProfile
): { adjustment: number; reasoning: string; adjustments: Array<{ signal: string; adjustment: number }>; traitSignals: { indica: string[]; sativa: string[]; hybrid: string[] } } | null {
  if (!fusedFeatures) {
    return null;
  }

  let adjustment = 0; // Adjustment in percentage points (±10% max - Phase 5.6.2)
  const reasoning: string[] = [];
  const adjustments: Array<{ signal: string; adjustment: number }> = []; // Phase 5.0.9.2 — Track individual adjustments
  const traitSignals: { indica: string[]; sativa: string[]; hybrid: string[] } = { // Phase 5.4.1 — Trait-based signals
    indica: [],
    sativa: [],
    hybrid: [],
  };

  // Phase 5.6.1 — Leaf width (broad ↔ narrow) — ±5% adjustment
  if (fusedFeatures.leafShape === "broad") {
    const leafAdjustment = 5; // Indica-leaning
    adjustment += leafAdjustment;
    adjustments.push({ signal: "Leaf width (broad)", adjustment: leafAdjustment });
    reasoning.push("broad leaves suggest indica genetics");
    traitSignals.indica.push("Broad leaves");
  } else if (fusedFeatures.leafShape === "narrow") {
    const leafAdjustment = -5; // Sativa-leaning
    adjustment += leafAdjustment;
    adjustments.push({ signal: "Leaf width (narrow)", adjustment: leafAdjustment });
    reasoning.push("narrow leaves suggest sativa genetics");
    traitSignals.sativa.push("Narrow leaves");
  }

  // Phase 5.6.1 — Bud structure (dense vs airy) — ±5% adjustment
  if (fusedFeatures.budStructure === "high") {
    const budAdjustment = 5; // Indica-leaning (dense buds)
    adjustment += budAdjustment;
    adjustments.push({ signal: "Bud structure (dense)", adjustment: budAdjustment });
    reasoning.push("dense bud structure indicates indica influence");
    traitSignals.indica.push("Short, dense buds");
  } else if (fusedFeatures.budStructure === "low") {
    const budAdjustment = -5; // Sativa-leaning (airy buds)
    adjustment += budAdjustment;
    adjustments.push({ signal: "Bud structure (airy)", adjustment: budAdjustment });
    reasoning.push("airy bud structure indicates sativa influence");
    traitSignals.sativa.push("Long, airy buds");
  }
  
  // Phase 5.4.1 — Terpene signals (if available)
  if (terpeneProfile && terpeneProfile.primaryTerpenes.length > 0) {
    const terpeneNames = terpeneProfile.primaryTerpenes.map(t => t.name.toLowerCase());
    const hasMyrcene = terpeneNames.some(t => t.includes("myrcene"));
    const hasLinalool = terpeneNames.some(t => t.includes("linalool"));
    const hasLimonene = terpeneNames.some(t => t.includes("limonene"));
    const hasTerpinolene = terpeneNames.some(t => t.includes("terpinolene"));
    
    if (hasMyrcene || hasLinalool) {
      traitSignals.indica.push("Myrcene/Linalool dominance");
    }
    if (hasLimonene || hasTerpinolene) {
      traitSignals.sativa.push("Limonene/Terpinolene dominance");
    }
    
    // Phase 5.4.1 — Hybrid: Balanced terpene spread
    const indicaTerpenes = (hasMyrcene ? 1 : 0) + (hasLinalool ? 1 : 0);
    const sativaTerpenes = (hasLimonene ? 1 : 0) + (hasTerpinolene ? 1 : 0);
    if (indicaTerpenes > 0 && sativaTerpenes > 0) {
      traitSignals.hybrid.push("Balanced terpene spread");
    }
  }
  
  // Phase 5.4.1 — Conflicting morphology (hybrid indicator)
  if (traitSignals.indica.length > 0 && traitSignals.sativa.length > 0) {
    traitSignals.hybrid.push("Conflicting morphology");
  }

  // Phase 4.8 Step 4.8.3 — Color profile (Indica = dark green/purple, Sativa = light green) — ±2% adjustment
  const colorProfile = fusedFeatures.colorProfile?.toLowerCase() || "";
  if (colorProfile.includes("purple") || colorProfile.includes("dark green") || colorProfile.includes("deep green")) {
    const colorAdjustment = 2; // Indica-leaning
    adjustment += colorAdjustment;
    adjustments.push({ signal: "Color profile (dark/purple)", adjustment: colorAdjustment });
    reasoning.push("dark green/purple hues suggest indica genetics");
  } else if (colorProfile.includes("lime") || colorProfile.includes("light green") || colorProfile.includes("pale")) {
    const colorAdjustment = -2; // Sativa-leaning
    adjustment += colorAdjustment;
    adjustments.push({ signal: "Color profile (light/lime)", adjustment: colorAdjustment });
    reasoning.push("lime/light green hues suggest sativa genetics");
  }

  // Phase 5.2.2 — Cap adjustment at ±12% (small deltas only, never override lineage entirely)
  adjustment = Math.max(-12, Math.min(12, adjustment));

  if (adjustment === 0) {
    return null; // No adjustment needed
  }

  return {
    adjustment,
    reasoning: reasoning.join("; "),
    adjustments, // Phase 5.0.9.2 — Return individual adjustments for logging
    traitSignals, // Phase 5.4.1 — Return trait signals for logging
  };
}

/**
 * Phase 5.0.3.2 — CONSENSUS MERGE
 * 
 * When multiple candidates exist, weight ratios by confidence score
 * Average ratios across top candidates
 * Clamp totals to 100%
 */
function mergeConsensusRatios(
  candidates: Array<{ name: string; confidence: number; dbEntry?: CultivarReference }>
): { indicaPercent: number; sativaPercent: number; sources: string[]; variance: number } | null {
  if (candidates.length === 0) {
    return null;
  }
  
  // Phase 5.0.3.2 — Get ratio for each candidate
  const candidateRatios: Array<{ indica: number; sativa: number; confidence: number; name: string }> = [];
  const sources: string[] = [];
  
  for (const candidate of candidates) {
    const baseline = resolveGeneticBaseline(candidate.name, candidate.dbEntry);
    if (baseline) {
      candidateRatios.push({
        indica: baseline.indicaPercent,
        sativa: baseline.sativaPercent,
        confidence: candidate.confidence,
        name: candidate.name,
      });
      sources.push(`${candidate.name} (${candidate.confidence}%)`);
    }
  }
  
  if (candidateRatios.length === 0) {
    return null;
  }
  
  // Phase 5.0.3.2 — Weight by confidence score
  let totalWeight = 0;
  let weightedIndicaSum = 0;
  let weightedSativaSum = 0;
  
  candidateRatios.forEach(ratio => {
    const weight = ratio.confidence / 100; // Normalize confidence to 0-1
    totalWeight += weight;
    weightedIndicaSum += ratio.indica * weight;
    weightedSativaSum += ratio.sativa * weight;
  });
  
  if (totalWeight === 0) {
    return null;
  }
  
  // Phase 5.0.3.2 — Calculate weighted average
  const avgIndica = weightedIndicaSum / totalWeight;
  const avgSativa = weightedSativaSum / totalWeight;
  
  // Phase 5.0.3.2 — Normalize to 100%
  const total = avgIndica + avgSativa;
  const indicaPercent = Math.round((avgIndica / total) * 100);
  const sativaPercent = 100 - indicaPercent;
  
  // Phase 5.0.3.2 — Calculate variance between candidates
  const indicaValues = candidateRatios.map(r => r.indica);
  const maxIndica = Math.max(...indicaValues);
  const minIndica = Math.min(...indicaValues);
  const variance = maxIndica - minIndica;
  
  return {
    indicaPercent,
    sativaPercent,
    sources,
    variance,
  };
}

/**
 * Phase 5.0.3 — Indica / Sativa / Hybrid Ratio Engine
 * Phase 4.8 Step 4.8.4 — FINAL RATIO CALCULATION
 * 
 * SOURCE OF TRUTH ORDER:
 * 1) Exact strain record
 * 2) Parent lineage averaging
 * 3) Consensus merge (multiple candidates)
 * 4) Database population average (last resort)
 * 
 * Formula:
 * Final Ratio =
 * (DB Baseline × 0.60)
 * + (Lineage × 0.25)
 * + (Image Morphology × 0.15)
 * 
 * Normalize to:
 * - Indica %
 * - Sativa %
 * - Hybrid label if within 45–55%
 */
export function resolveStrainRatio(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures, // Phase 4.8 — Added for morphology adjustment
  candidateStrains?: Array<{ name: string; confidence: number }>, // Phase 5.0.3.2 — For consensus merge
  terpeneProfile?: NormalizedTerpeneProfile, // Phase 5.0.5.1 — For terpene weighting
  effectProfile?: { primaryEffects?: Array<{ name: string }>; secondaryEffects?: Array<{ name: string }> }, // Phase 5.6.1 — For effect profile bias
  topCandidateNames?: Array<{ name: string; confidence: number }> // Phase 8.4.2 — Top 5 candidate strain names for database dominance prior
): StrainRatio {
  // Phase 5.0.5.1 — SIGNAL SOURCES: Collect all signals
  console.log("Phase 5.0.5.1 — SIGNAL SOURCES: Collecting ratio signals for", strainName);
  
  // Phase 5.4.2 — LINEAGE OVERRIDE
  // If strain name is known:
  // - Pull genetic breakdown from DB
  // - Use as baseline
  // - Allow ±15% adjustment based on visuals
  console.log("Phase 5.4.2 — LINEAGE OVERRIDE: Extracting genetic breakdown for", strainName);
  const databaseBaseline = resolveGeneticBaseline(strainName, dbEntry);
  
  // Phase 5.4.2 — Log base genetic ratio
  if (databaseBaseline) {
    console.log("BASE GENETIC RATIO:", `${databaseBaseline.indicaPercent}% Indica / ${databaseBaseline.sativaPercent}% Sativa (${databaseBaseline.source})`);
  }
  
  // Phase 5.0.3.1 — STEP 2: Parent lineage averaging (if exact record not found)
  let lineageBaseline: ReturnType<typeof inferRatioFromLineage> | null = null;
  if (!databaseBaseline && dbEntry) {
    console.log("Phase 5.0.3.1 — STEP 2: Parent lineage averaging");
    lineageBaseline = inferRatioFromLineage(dbEntry);
  }
  
  // Phase 5.0.3.2 — STEP 3: Consensus merge (if multiple candidates)
  let consensusRatio: ReturnType<typeof mergeConsensusRatios> | null = null;
  if (candidateStrains && candidateStrains.length > 1) {
    console.log("Phase 5.0.3.2 — CONSENSUS MERGE: Merging ratios from", candidateStrains.length, "candidates");
    // Get db entries for all candidates
    const candidatesWithDb = candidateStrains.map(c => ({
      name: c.name,
      confidence: c.confidence,
      dbEntry: CULTIVAR_LIBRARY.find(s => 
        s.name === c.name || s.aliases?.includes(c.name)
      ),
    }));
    consensusRatio = mergeConsensusRatios(candidatesWithDb);
    if (consensusRatio) {
      console.log("Phase 5.0.3.2 — CONSENSUS MERGE: Weighted average =", consensusRatio.indicaPercent, "/", consensusRatio.sativaPercent);
      console.log("Phase 5.0.3.2 — CONSENSUS MERGE: Variance =", consensusRatio.variance, "%");
    }
  }
  
  // Phase 5.0.3.1 — STEP 3: Database population average (last resort)
  if (!databaseBaseline && !lineageBaseline && !consensusRatio) {
    console.warn(`Phase 5.0.3.1 — STEP 3: No database entry found for "${strainName}", using population average`);
    // Phase 5.0.3.3 — Never output 50/50 unless database truly supports it
    // Use a slight bias based on visual features if available
    const visualBias = fusedFeatures?.leafShape === "broad" ? 5 : fusedFeatures?.leafShape === "narrow" ? -5 : 0;
    const populationIndica = 50 + visualBias;
    const populationSativa = 100 - populationIndica;
    
    return {
      indicaPercent: populationIndica,
      sativaPercent: populationSativa,
      dominance: populationIndica >= 55 ? "Indica" : populationSativa >= 55 ? "Sativa" : "Hybrid",
      displayText: `Hybrid ${populationIndica}% Indica · ${populationSativa}% Sativa (Estimated)`,
      explanation: {
        source: "default",
        confidenceNotes: "Ratio not available from database. Estimated from population average with visual bias.",
        confidenceLevel: "low",
      },
    };
  }

  // Phase 5.0.3.2 — Use consensus ratio if available (preferred over single strain)
  let baseIndica: number;
  let baseSativa: number;
  let dbSource: string;
  let baseReasoning: string;
  let usedConsensus = false;
  
  if (consensusRatio) {
    // Phase 5.0.3.2 — Use consensus-weighted ratio (preferred)
    baseIndica = consensusRatio.indicaPercent;
    baseSativa = consensusRatio.sativaPercent;
    dbSource = "consensus_weighted";
    baseReasoning = `Weighted average from ${consensusRatio.sources.length} candidates`;
    usedConsensus = true;
    console.log("Phase 5.0.3.2 — Using consensus ratio:", baseIndica, "/", baseSativa);
  } else if (databaseBaseline) {
    // Phase 5.0.3.1 — Use exact strain record
    baseIndica = databaseBaseline.indicaPercent;
    baseSativa = databaseBaseline.sativaPercent;
    dbSource = databaseBaseline.source || "database_dominance";
    baseReasoning = databaseBaseline.reasoning;
    console.log("Phase 5.0.3.1 — Using exact strain record:", baseIndica, "/", baseSativa);
  } else if (lineageBaseline) {
    // Phase 5.0.3.1 — Use parent lineage average
    baseIndica = lineageBaseline.indicaPercent;
    baseSativa = lineageBaseline.sativaPercent;
    dbSource = "lineage_inferred";
    baseReasoning = lineageBaseline.inference;
    console.log("Phase 5.0.3.1 — Using parent lineage:", baseIndica, "/", baseSativa);
  } else {
    // Should not reach here (handled above)
    throw new Error("Phase 5.0.3 — No ratio source available");
  }

  // Phase 4.8 Step 4.8.2 — LINEAGE INFERENCE (weight 25%) - only if not already used
  const lineageInference = dbSource !== "lineage_inferred" ? inferRatioFromLineage(dbEntry) : null;

  // Phase 5.0.5.1 — TERPENE PROFILE WEIGHTING (weight 20%)
  const terpeneWeighting = calculateTerpeneWeighting(terpeneProfile);
  if (terpeneWeighting) {
    console.log("Phase 5.0.5.1 — TERPENE WEIGHTING:", terpeneWeighting.reasoning.join(", "));
  }

  // Phase 5.6.1 — SIGNAL SOURCES: Morphology signals (leaf width, bud structure)
  const morphologyAdjustment = calculateMorphologyAdjustment(fusedFeatures, terpeneProfile);
  
  // Phase 5.6.1 — SIGNAL SOURCES: Effect profile bias (secondary signal)
  const effectProfileBias = calculateEffectProfileBias(dbEntry, effectProfile);
  
  // Phase 5.6.1 — Log genetic signals
  if (morphologyAdjustment) {
    const geneticSignals: string[] = [];
    if (morphologyAdjustment.traitSignals.indica.length > 0) {
      geneticSignals.push(`Indica: ${morphologyAdjustment.traitSignals.indica.join(", ")}`);
    }
    if (morphologyAdjustment.traitSignals.sativa.length > 0) {
      geneticSignals.push(`Sativa: ${morphologyAdjustment.traitSignals.sativa.join(", ")}`);
    }
    if (morphologyAdjustment.traitSignals.hybrid.length > 0) {
      geneticSignals.push(`Hybrid: ${morphologyAdjustment.traitSignals.hybrid.join(", ")}`);
    }
    console.log("GENETIC SIGNALS:", geneticSignals.join(" | "));
    
    const adjustmentDetails = morphologyAdjustment.adjustments.map(a => 
      `${a.signal}: ${a.adjustment > 0 ? '+' : ''}${a.adjustment}%`
    ).join(", ");
    console.log("PHENOTYPE ADJUSTMENTS:", adjustmentDetails, `(Total: ${morphologyAdjustment.adjustment > 0 ? '+' : ''}${morphologyAdjustment.adjustment}%)`);
  }
  
  // Phase 5.6.1 — Log effect profile bias
  if (effectProfileBias) {
    console.log("Phase 5.6.1 — EFFECT PROFILE BIAS:", effectProfileBias.reasoning, `(${effectProfileBias.adjustment > 0 ? '+' : ''}${effectProfileBias.adjustment}%)`);
  }
  
  // Phase 5.0.7.1 — SIGNAL SOURCES: Collect and log all signals
  const indicaSignals: string[] = [];
  const sativaSignals: string[] = [];
  
  // Phase 5.0.7.1 — A) GENETICS signals
  if (databaseBaseline) {
    if (databaseBaseline.indicaPercent > databaseBaseline.sativaPercent) {
      indicaSignals.push(`Genetics: ${databaseBaseline.indicaPercent}% indica (${databaseBaseline.source || "database"})`);
    } else if (databaseBaseline.sativaPercent > databaseBaseline.indicaPercent) {
      sativaSignals.push(`Genetics: ${databaseBaseline.sativaPercent}% sativa (${databaseBaseline.source || "database"})`);
    } else {
      indicaSignals.push(`Genetics: Balanced (${databaseBaseline.source || "database"})`);
      sativaSignals.push(`Genetics: Balanced (${databaseBaseline.source || "database"})`);
    }
  }
  
  if (lineageInference) {
    if (lineageInference.indicaPercent > lineageInference.sativaPercent) {
      indicaSignals.push(`Lineage: ${lineageInference.indicaPercent}% indica (parent averaging)`);
    } else if (lineageInference.sativaPercent > lineageInference.indicaPercent) {
      sativaSignals.push(`Lineage: ${lineageInference.sativaPercent}% sativa (parent averaging)`);
    }
  }
  
  // Phase 5.0.7.1 — B) MORPHOLOGY signals
  if (morphologyAdjustment) {
    if (morphologyAdjustment.adjustment > 0) {
      indicaSignals.push(`Morphology: +${morphologyAdjustment.adjustment}% (${morphologyAdjustment.reasoning})`);
    } else if (morphologyAdjustment.adjustment < 0) {
      sativaSignals.push(`Morphology: ${Math.abs(morphologyAdjustment.adjustment)}% (${morphologyAdjustment.reasoning})`);
    }
  }
  
  // Phase 5.0.7.1 — C) CHEMISTRY (ESTIMATED) signals
  if (terpeneWeighting) {
    if (terpeneWeighting.indicaPercent > terpeneWeighting.sativaPercent) {
      indicaSignals.push(`Terpenes: ${terpeneWeighting.indicaPercent}% indica (${terpeneWeighting.reasoning.join(", ")})`);
    } else if (terpeneWeighting.sativaPercent > terpeneWeighting.indicaPercent) {
      sativaSignals.push(`Terpenes: ${terpeneWeighting.sativaPercent}% sativa (${terpeneWeighting.reasoning.join(", ")})`);
    } else {
      indicaSignals.push(`Terpenes: Balanced profile`);
      sativaSignals.push(`Terpenes: Balanced profile`);
    }
  }
  
  // Phase 5.0.7.1 — Log signals
  console.log("INDICA SIGNALS:", indicaSignals.length > 0 ? indicaSignals.join("; ") : "None");
  console.log("SATIVA SIGNALS:", sativaSignals.length > 0 ? sativaSignals.join("; ") : "None");
  
  // Phase 5.0.5.1 — Collect all signals for logging (legacy)
  const ratioSignals: string[] = [];
  if (databaseBaseline) ratioSignals.push(`Genetics: ${databaseBaseline.source || "database"}`);
  if (lineageInference) ratioSignals.push("Lineage inference");
  if (terpeneWeighting) ratioSignals.push("Terpene profile");
  if (morphologyAdjustment) ratioSignals.push("Growth morphology");
  if (consensusRatio) ratioSignals.push("Community consensus");
  console.log("RATIO SIGNALS:", ratioSignals.join(", "));

  // Phase 5.8.1 — RATIO SOURCES: Compute ratio from 4 signals (weighted)
  // 1. DATABASE GENETICS (40%) - Parent strains ratios, Lineage confidence
  // 2. VISUAL MORPHOLOGY (30%) - Leaf width, Bud density, Internodal spacing, Plant posture
  // 3. EFFECT PROFILE (20%) - Sedative vs cerebral signals, Body vs head emphasis
  // 4. TERPENE LIKELIHOOD (10%) - Myrcene → Indica lean, Limonene/Terpinolene → Sativa lean
  
  // Phase 5.8.2 — SCORING MODEL: Produce three scores (indicaScore, sativaScore, hybridScore)
  // ENSURE ORIGINAL SCORES EXIST
  const initialScores = {
    indica: baseIndica,
    sativa: baseSativa,
    hybrid: 100 - baseIndica - baseSativa,
  };
  const indicaScore: number = initialScores.indica;
  const sativaScore: number = initialScores.sativa;
  const hybridScore: number = initialScores.hybrid;
  
  let rawIndicaScore: number = 0;
  let rawSativaScore: number = 0;
  let rawHybridScore: number = 0;
  const rawRatios: Array<{ source: string; indica: number; sativa: number; hybrid: number; weight: number }> = [];
  
  // Declare mutable score variables before use
  let finalIndicaScore: number = 0;
  let finalSativaScore: number = 0;
  let finalHybridScore: number = 0;

  // Phase 5.8.1 — RATIO SOURCES: Compute from 4 weighted signals
  // 1. DATABASE GENETICS (40%)
  const databaseGeneticsWeight = 0.40;
  const databaseIndica = baseIndica;
  const databaseSativa = baseSativa;
  const databaseHybrid = Math.abs(databaseIndica - databaseSativa) < 20 ? 100 - Math.abs(databaseIndica - databaseSativa) : 0; // Hybrid score based on balance
  rawIndicaScore += databaseIndica * databaseGeneticsWeight;
  rawSativaScore += databaseSativa * databaseGeneticsWeight;
  rawHybridScore += databaseHybrid * databaseGeneticsWeight;
  rawRatios.push({ source: "Database Genetics", indica: databaseIndica, sativa: databaseSativa, hybrid: databaseHybrid, weight: databaseGeneticsWeight });
  
  // 2. VISUAL MORPHOLOGY (30%)
  const morphologyWeight = 0.30;
  if (morphologyAdjustment) {
    const morphologyIndica = Math.max(0, Math.min(100, baseIndica + morphologyAdjustment.adjustment));
    const morphologySativa = Math.max(0, Math.min(100, baseSativa - morphologyAdjustment.adjustment));
    const morphologyHybrid = Math.abs(morphologyIndica - morphologySativa) < 20 ? 100 - Math.abs(morphologyIndica - morphologySativa) : 0;
    rawIndicaScore += morphologyIndica * morphologyWeight;
    rawSativaScore += morphologySativa * morphologyWeight;
    rawHybridScore += morphologyHybrid * morphologyWeight;
    rawRatios.push({ source: "Visual Morphology", indica: morphologyIndica, sativa: morphologySativa, hybrid: morphologyHybrid, weight: morphologyWeight });
  } else {
    // No morphology adjustment - use base ratios
    rawIndicaScore += baseIndica * morphologyWeight;
    rawSativaScore += baseSativa * morphologyWeight;
    rawHybridScore += databaseHybrid * morphologyWeight;
    rawRatios.push({ source: "Visual Morphology", indica: baseIndica, sativa: baseSativa, hybrid: databaseHybrid, weight: morphologyWeight });
  }
  
  // 3. EFFECT PROFILE (20%)
  const effectWeight = 0.20;
  if (effectProfileBias) {
    const effectIndica = Math.max(0, Math.min(100, baseIndica + effectProfileBias.adjustment));
    const effectSativa = Math.max(0, Math.min(100, baseSativa - effectProfileBias.adjustment));
    const effectHybrid = Math.abs(effectIndica - effectSativa) < 20 ? 100 - Math.abs(effectIndica - effectSativa) : 0;
    rawIndicaScore += effectIndica * effectWeight;
    rawSativaScore += effectSativa * effectWeight;
    rawHybridScore += effectHybrid * effectWeight;
    rawRatios.push({ source: "Effect Profile", indica: effectIndica, sativa: effectSativa, hybrid: effectHybrid, weight: effectWeight });
  } else {
    // No effect profile - use base ratios
    rawIndicaScore += baseIndica * effectWeight;
    rawSativaScore += baseSativa * effectWeight;
    rawHybridScore += databaseHybrid * effectWeight;
    rawRatios.push({ source: "Effect Profile", indica: baseIndica, sativa: baseSativa, hybrid: databaseHybrid, weight: effectWeight });
  }
  
  // 4. TERPENE LIKELIHOOD (10%)
  const terpeneWeight = 0.10;
  if (terpeneWeighting) {
    const terpeneIndica = terpeneWeighting.indicaPercent;
    const terpeneSativa = terpeneWeighting.sativaPercent;
    const terpeneHybrid = Math.abs(terpeneIndica - terpeneSativa) < 20 ? 100 - Math.abs(terpeneIndica - terpeneSativa) : 0;
    rawIndicaScore += terpeneIndica * terpeneWeight;
    rawSativaScore += terpeneSativa * terpeneWeight;
    rawHybridScore += terpeneHybrid * terpeneWeight;
    rawRatios.push({ source: "Terpene Likelihood", indica: terpeneIndica, sativa: terpeneSativa, hybrid: terpeneHybrid, weight: terpeneWeight });
  } else {
    // No terpene profile - use base ratios
    rawIndicaScore += baseIndica * terpeneWeight;
    rawSativaScore += baseSativa * terpeneWeight;
    rawHybridScore += databaseHybrid * terpeneWeight;
    rawRatios.push({ source: "Terpene Likelihood", indica: baseIndica, sativa: baseSativa, hybrid: databaseHybrid, weight: terpeneWeight });
  }
  
  // Phase 5.8.2 — Normalize to 100%
  const totalScore = rawIndicaScore + rawSativaScore + rawHybridScore;
  finalIndicaScore = (rawIndicaScore / totalScore) * 100;
  finalSativaScore = (rawSativaScore / totalScore) * 100;
  finalHybridScore = (rawHybridScore / totalScore) * 100;
  
  // Phase 5.8.3 — EDGE CASES: If database confidence < 70%, cap any category at 85%
  const databaseConfidence = databaseBaseline?.source === "database_explicit" ? 100 
    : databaseBaseline?.source === "database_dominance" ? 85
    : databaseBaseline?.source === "lineage_inferred" ? 70
    : databaseBaseline?.source === "breeder_classification" ? 80
    : databaseBaseline?.source === "historical_phenotype" ? 75
    : 60; // Default confidence
  
  if (databaseConfidence < 70) {
    finalIndicaScore = Math.min(85, finalIndicaScore);
    finalSativaScore = Math.min(85, finalSativaScore);
    finalHybridScore = Math.min(85, finalHybridScore);
    console.log("Phase 5.8.3 — EDGE CASE: Database confidence < 70%, capping all categories at 85%");
  }
  
  // Phase 5.8.3 — EDGE CASES: If scores within ±8%, classify as "Balanced Hybrid"
  const scoreDiff = Math.abs(finalIndicaScore - finalSativaScore);
  if (scoreDiff <= 8) {
    // Rebalance to emphasize hybrid nature
    const avgScore = (finalIndicaScore + finalSativaScore) / 2;
    finalIndicaScore = avgScore;
    finalSativaScore = avgScore;
    finalHybridScore = 100 - (finalIndicaScore + finalSativaScore);
    console.log("Phase 5.8.3 — EDGE CASE: Scores within ±8%, classifying as Balanced Hybrid");
  }
  
  // Phase 5.8.2 — Re-normalize to ensure sum = 100%
  const finalTotal = finalIndicaScore + finalSativaScore + finalHybridScore;
  finalIndicaScore = (finalIndicaScore / finalTotal) * 100;
  finalSativaScore = (finalSativaScore / finalTotal) * 100;
  finalHybridScore = (finalHybridScore / finalTotal) * 100;
  
  // Round to integers
  let finalIndicaPercent = Math.round(finalIndicaScore);
  let finalSativaPercent = Math.round(finalSativaScore);
  let finalHybridPercent = Math.round(finalHybridScore);
  
  // Ensure sum = 100
  const sum = finalIndicaPercent + finalSativaPercent + finalHybridPercent;
  if (sum !== 100) {
    const diff = 100 - sum;
    finalIndicaPercent += diff; // Add difference to indica
  }
  
  // Phase 5.8.2 — Log ratio scores
  console.log("RATIO SCORES:", `Indica: ${finalIndicaPercent}%, Sativa: ${finalSativaPercent}%, Hybrid: ${finalHybridPercent}%`);
  
  // Phase 5.8.2 — Log raw ratios (legacy format for compatibility)
  console.log("RAW RATIOS:", rawRatios.map(r => `${r.source}: I:${r.indica.toFixed(1)}% S:${r.sativa.toFixed(1)}% H:${r.hybrid.toFixed(1)}% (${(r.weight * 100).toFixed(0)}%)`).join(", "));

  // Phase 5.8.2 — Determine ratio label based on scores
  let ratioLabel: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
  if (scoreDiff <= 8) {
    ratioLabel = "Balanced Hybrid";
  } else if (finalIndicaPercent > finalSativaPercent) {
    ratioLabel = "Indica-dominant";
  } else if (finalSativaPercent > finalIndicaPercent) {
    ratioLabel = "Sativa-dominant";
  } else {
    ratioLabel = "Balanced Hybrid";
  }
  
  // Phase 5.8.2 — Log ratio label
  console.log("RATIO LABEL:", ratioLabel);
  
  // Phase 5.0.9.4 — FINAL RATIO OUTPUT: Classification rules (legacy compatibility)
  // Rule: ≥70% → Dominant (changed from ≥90% for pure)
  // 40–60% → Hybrid
  // Never return 50/50 unless truly balanced
  const isDominantIndica = finalIndicaPercent >= 70;
  const isDominantSativa = finalSativaPercent >= 70;
  const isPureIndica = finalIndicaPercent >= 90; // Keep for legacy compatibility
  const isPureSativa = finalSativaPercent >= 90; // Keep for legacy compatibility
  
  // Phase 5.8.2 — Ensure sum = 100% (normalize three scores)
  const totalThreeScores = finalIndicaPercent + finalSativaPercent + finalHybridPercent;
  if (Math.abs(totalThreeScores - 100) > 0.1) {
    // Normalize to 100%
    finalIndicaPercent = Math.round((finalIndicaPercent / totalThreeScores) * 100);
    finalSativaPercent = Math.round((finalSativaPercent / totalThreeScores) * 100);
    finalHybridPercent = 100 - finalIndicaPercent - finalSativaPercent; // Remaining goes to hybrid
  }
  
  // Phase 5.0.5.2 — Clamp to valid range (legacy compatibility for indicaPercent/sativaPercent)
  finalIndicaPercent = Math.max(0, Math.min(100, finalIndicaPercent));
  finalSativaPercent = Math.max(0, Math.min(100, finalSativaPercent));
  finalHybridPercent = Math.max(0, Math.min(100, finalHybridPercent));
  
  // Phase 5.0.7.2 — SCORING MODEL: Calculate indicaScore and sativaScore separately
  // These are the final scores used for classification
  const classificationIndicaScore = finalIndicaPercent;
  const classificationSativaScore = finalSativaPercent;
  
  // Phase 5.0.7.2 — Log scores
  console.log("Phase 5.0.7.2 — SCORING MODEL: indicaScore =", classificationIndicaScore.toFixed(1), ", sativaScore =", classificationSativaScore.toFixed(1));
  
  // Phase 5.6.3 — CONFIDENCE GUARDS: Never claim 100/0 unless landrace
  // Check if strain is a landrace (pure indica or sativa)
  const isLandrace = dbEntry?.type === "Indica" && dbEntry?.genetics?.toLowerCase().includes("landrace") ||
                     dbEntry?.type === "Sativa" && dbEntry?.genetics?.toLowerCase().includes("landrace");
  
  if ((finalIndicaPercent === 100 || finalSativaPercent === 100) && !isLandrace) {
    // Phase 5.6.3 — Not a landrace, adjust away from 100/0
    if (finalIndicaPercent === 100) {
      finalIndicaPercent = 95;
      finalSativaPercent = 5;
      console.log("Phase 5.6.3 — CONFIDENCE GUARD: Adjusted 100/0 ratio (not a landrace) to 95/5");
    } else if (finalSativaPercent === 100) {
      finalSativaPercent = 95;
      finalIndicaPercent = 5;
      console.log("Phase 5.6.3 — CONFIDENCE GUARD: Adjusted 0/100 ratio (not a landrace) to 5/95");
    }
  }
  
  // Phase 5.6.3 — CONFIDENCE GUARDS: If uncertainty > 20% → label "Hybrid (leaning indica/sativa)"
  // Calculate uncertainty as variance between sources
  const varianceSources: string[] = [];
  if (consensusRatio && consensusRatio.variance > 20) {
    varianceSources.push(`Consensus variance: ${consensusRatio.variance}%`);
  }
  if (morphologyAdjustment && Math.abs(morphologyAdjustment.adjustment) > 10) {
    varianceSources.push(`Morphology adjustment: ${morphologyAdjustment.adjustment}%`);
  }
  if (effectProfileBias && Math.abs(effectProfileBias.adjustment) > 5) {
    varianceSources.push(`Effect profile bias: ${effectProfileBias.adjustment}%`);
  }
  
  const hasHighUncertainty = varianceSources.length > 0;
  if (hasHighUncertainty) {
    console.log("Phase 5.6.3 — CONFIDENCE GUARD: High uncertainty detected:", varianceSources.join(", "));
  }
  
  // Phase 5.0.5.2 — Log final ratios
  console.log("FINAL RATIOS:", `${finalIndicaPercent}% Indica / ${finalSativaPercent}% Sativa`);
  console.log("FINAL RATIO:", `${finalIndicaPercent}/${finalSativaPercent}`);
  
  // Phase 5.6.1 — Log genetic ratio source
  const geneticRatioSource = databaseBaseline?.source || lineageBaseline ? "lineage_inferred" : consensusRatio ? "consensus_weighted" : "default";
  console.log("GENETIC RATIO SOURCE:", geneticRatioSource);
  
  // Phase 5.0.9.4 — Never return 50/50 unless truly balanced
  // If ratio is exactly 50/50, check if database supports it
  if (finalIndicaPercent === 50 && finalSativaPercent === 50) {
    // Phase 5.0.3.3 — Check if database truly supports 50/50
    // Support conditions:
    // 1. Database entry type is "Hybrid" (explicit hybrid classification)
    // 2. Database baseline is exactly 50/50 (from explicit data)
    // 3. Lineage baseline is exactly 50/50 (from parent averaging)
    // 4. Consensus merge resulted in 50/50 with low variance (high agreement)
    const dbSupportsBalanced = dbEntry?.type === "Hybrid" || 
                               (databaseBaseline && databaseBaseline.indicaPercent === 50 && databaseBaseline.source === "database_explicit") ||
                               (lineageBaseline && lineageBaseline.indicaPercent === 50) ||
                               (consensusRatio && consensusRatio.indicaPercent === 50 && consensusRatio.variance < 5);
    
    if (!dbSupportsBalanced) {
      // Phase 5.0.3.3 — Nudge away from 50/50 (use visual bias or slight preference)
      const nudge = fusedFeatures?.leafShape === "broad" ? 3 : fusedFeatures?.leafShape === "narrow" ? -3 : 2;
      finalIndicaPercent = 50 + nudge;
      finalSativaPercent = 100 - finalIndicaPercent;
      console.log("Phase 5.0.3.3 — Adjusted 50/50 ratio (not supported by database):", finalIndicaPercent, "/", finalSativaPercent);
    } else {
      console.log("Phase 5.0.3.3 — 50/50 ratio confirmed by database");
    }
  }
  
  // Phase 5.0.3.3 — Hybrid label ONLY if both >30%
  // This is handled in dominance calculation below

  // Phase 5.0.9.4 — FINAL RATIO OUTPUT: Classification rules
  // ≥70% → Dominant
  // 40–60% → Hybrid
  // Never return 50/50 unless truly balanced
  let dominance: "Indica" | "Sativa" | "Hybrid" | "Balanced";
  let displayText: string;
  let hybridLabel: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid" | "Indica-leaning Hybrid" | "Sativa-leaning Hybrid";
  let classification: "Indica" | "Sativa" | "Hybrid"; // Phase 5.0.9.4 — Simplified classification

  if (isPureIndica) {
    // Phase 5.0.9.4 — Pure Indica (≥90%)
    dominance = "Indica";
    hybridLabel = "Indica-dominant";
    classification = "Indica"; // Phase 5.0.9.4
    displayText = `Indica ${finalIndicaPercent}% · Sativa ${finalSativaPercent}%`;
  } else if (isPureSativa) {
    // Phase 5.0.9.4 — Pure Sativa (≥90%)
    dominance = "Sativa";
    hybridLabel = "Sativa-dominant";
    classification = "Sativa"; // Phase 5.0.9.4
    displayText = `Sativa ${finalSativaPercent}% · Indica ${finalIndicaPercent}%`;
  } else if (isDominantIndica) {
    // Phase 5.0.9.4 — Indica-dominant (≥70% but <90%)
    dominance = "Indica";
    hybridLabel = "Indica-dominant";
    classification = "Indica"; // Phase 5.0.9.4
    displayText = `Indica ${finalIndicaPercent}% · Sativa ${finalSativaPercent}%`;
  } else if (isDominantSativa) {
    // Phase 5.0.9.4 — Sativa-dominant (≥70% but <90%)
    dominance = "Sativa";
    hybridLabel = "Sativa-dominant";
    classification = "Sativa"; // Phase 5.0.9.4
    displayText = `Sativa ${finalSativaPercent}% · Indica ${finalIndicaPercent}%`;
  } else if (finalIndicaPercent >= 40 && finalIndicaPercent <= 60) {
    // Phase 5.0.9.4 — Hybrid (40-60% range)
    dominance = "Hybrid";
    hybridLabel = "Balanced Hybrid";
    classification = "Hybrid"; // Phase 5.0.9.4
    displayText = `Hybrid ${finalIndicaPercent}% Indica · ${finalSativaPercent}% Sativa`;
  } else {
    // Phase 5.0.9.4 — Outside 40-60% but <70%: Still hybrid, but leaning
    dominance = "Hybrid";
    // Phase 5.6.3 — CONFIDENCE GUARDS: If uncertainty > 20% → label "Hybrid (leaning indica/sativa)"
    if (hasHighUncertainty) {
      hybridLabel = finalIndicaPercent > finalSativaPercent ? "Indica-leaning Hybrid" : "Sativa-leaning Hybrid";
      displayText = `Hybrid (leaning ${finalIndicaPercent > finalSativaPercent ? "indica" : "sativa"}) — ${finalIndicaPercent}% Indica / ${finalSativaPercent}% Sativa`;
    } else {
      hybridLabel = finalIndicaPercent > finalSativaPercent ? "Indica-leaning Hybrid" : "Sativa-leaning Hybrid";
      displayText = `Hybrid ${finalIndicaPercent}% Indica · ${finalSativaPercent}% Sativa`;
    }
    classification = "Hybrid"; // Phase 5.0.9.4
  }
  
  // Phase 5.0.3.3 — Log variance between candidates (if consensus was used)
  if (consensusRatio && consensusRatio.variance > 0) {
    console.log("Phase 5.0.3.3 — Variance between candidates:", consensusRatio.variance, "%");
  }
  
  // Phase 8.6.1 — DATABASE BASELINE: Extract known ratio from strain database
  const databaseBaselineV8_6 = extractDatabaseBaselineV8_6(strainName, dbEntry);
  
  // Phase 8.6.2 — VISUAL MODULATION: Adjust baseline using visual cues (max ±15%)
  let visualModulatedRatio: { indica: number; sativa: number; hybrid: number; adjustment: number } | null = null;
  
  if (databaseBaselineV8_6) {
    visualModulatedRatio = calculateVisualModulationV8_6(databaseBaselineV8_6, imageResults || [], fusedFeatures);
  }
  
  // Phase 8.2.1 — PER-IMAGE DOMINANCE SIGNALS
  const perImageDominanceSignals = imageResults && imageResults.length > 0
    ? extractPerImageDominanceSignals(imageResults)
    : [];
  
  // Phase 8.2.2 — DATABASE LINEAGE SIGNALS (legacy)
  const databaseLineageSignals = extractDatabaseLineageSignals(strainName, dbEntry);
  
  if (databaseLineageSignals) {
    console.log("Phase 8.2.2 — DATABASE LINEAGE SIGNALS:", `${databaseLineageSignals.indicaScore}% Indica / ${databaseLineageSignals.sativaScore}% Sativa`);
  }
  
  // Phase 8.4.2 — DATABASE DOMINANCE PRIOR: For top 5 candidate strain names
  const databaseDominancePrior = extractDatabaseDominancePrior(topCandidateNames);
  
  // Phase 8.6.3 — MULTI-IMAGE CONSENSUS: For 2–5 images
  // Calculate ratio per image, average results, reduce variance when images agree
  let multiImageConsensusV8_6: { indica: number; sativa: number; hybrid: number; variance: number } | null = null;
  
  if (imageResults && imageResults.length >= 2 && imageResults.length <= 5) {
    // Phase 8.6.3 — Calculate ratio per image
    const perImageRatios: Array<{ indica: number; sativa: number; hybrid: number }> = [];
    
    imageResults.forEach(result => {
      const perImageDominance = calculatePerImageDominanceV8_4(result, databaseBaselineV8_6?.indica || 50);
      if (perImageDominance) {
        const hybrid = 100 - (perImageDominance.indica + perImageDominance.sativa);
        perImageRatios.push({
          indica: perImageDominance.indica,
          sativa: perImageDominance.sativa,
          hybrid: Math.max(0, hybrid),
        });
      }
    });
    
    if (perImageRatios.length >= 2) {
      // Phase 8.6.3 — Average results
      const avgIndica = perImageRatios.reduce((sum, r) => sum + r.indica, 0) / perImageRatios.length;
      const avgSativa = perImageRatios.reduce((sum, r) => sum + r.sativa, 0) / perImageRatios.length;
      const avgHybrid = perImageRatios.reduce((sum, r) => sum + r.hybrid, 0) / perImageRatios.length;
      
      // Phase 8.6.3 — Calculate variance
      const indicaVariance = Math.sqrt(perImageRatios.reduce((sum, r) => sum + Math.pow(r.indica - avgIndica, 2), 0) / perImageRatios.length);
      const sativaVariance = Math.sqrt(perImageRatios.reduce((sum, r) => sum + Math.pow(r.sativa - avgSativa, 2), 0) / perImageRatios.length);
      const hybridVariance = Math.sqrt(perImageRatios.reduce((sum, r) => sum + Math.pow(r.hybrid - avgHybrid, 2), 0) / perImageRatios.length);
      const totalVariance = (indicaVariance + sativaVariance + hybridVariance) / 3;
      
      // Phase 8.6.3 — Reduce variance when images agree (if variance < 10%, boost confidence)
      let varianceReduction = 0;
      if (totalVariance < 10) {
        varianceReduction = 0.1; // 10% reduction for high agreement
      } else if (totalVariance < 20) {
        varianceReduction = 0.05; // 5% reduction for moderate agreement
      }
      
      // Phase 8.6.3 — Normalize to 100%
      const total = avgIndica + avgSativa + avgHybrid;
      const finalIndica = Math.round((avgIndica / total) * 100);
      const finalSativa = Math.round((avgSativa / total) * 100);
      const finalHybrid = 100 - finalIndica - finalSativa;
      
      multiImageConsensusV8_6 = {
        indica: finalIndica,
        sativa: finalSativa,
        hybrid: Math.max(0, finalHybrid),
        variance: Math.round(totalVariance),
      };
      
      console.log("Phase 8.6.3 — MULTI-IMAGE CONSENSUS:", `${finalIndica}% Indica / ${finalSativa}% Sativa / ${finalHybrid}% Hybrid (variance: ${Math.round(totalVariance)}%)`);
    }
  }
  
  // Phase 8.6.4 — CONFIDENCE WEIGHTING: Weight ratio confidence by number of images, database certainty, visual agreement
  let finalDominanceV8_6: { indica: number; sativa: number; hybrid: number; confidence: number } | null = null;
  
  if (visualModulatedRatio) {
    // Phase 8.6.4 — Use visual modulated ratio as base
    let finalIndica = visualModulatedRatio.indica;
    let finalSativa = visualModulatedRatio.sativa;
    let finalHybrid = visualModulatedRatio.hybrid;
    
    // Phase 8.6.4 — Blend with multi-image consensus if available
    if (multiImageConsensusV8_6) {
      // Weight: 60% visual modulated, 40% multi-image consensus
      finalIndica = Math.round((visualModulatedRatio.indica * 0.6) + (multiImageConsensusV8_6.indica * 0.4));
      finalSativa = Math.round((visualModulatedRatio.sativa * 0.6) + (multiImageConsensusV8_6.sativa * 0.4));
      finalHybrid = Math.round((visualModulatedRatio.hybrid * 0.6) + (multiImageConsensusV8_6.hybrid * 0.4));
      
      // Normalize to 100%
      const total = finalIndica + finalSativa + finalHybrid;
      if (Math.abs(total - 100) > 0.1) {
        finalIndica = Math.round((finalIndica / total) * 100);
        finalSativa = Math.round((finalSativa / total) * 100);
        finalHybrid = 100 - finalIndica - finalSativa;
      }
    }
    
    // Phase 8.6.4 — Calculate confidence
    let confidence = 70; // Base confidence
    
    // Phase 8.6.4 — Number of images (more images = higher confidence)
    if (imageCount >= 3) {
      confidence += 15; // 3+ images = +15%
    } else if (imageCount === 2) {
      confidence += 8; // 2 images = +8%
    }
    
    // Phase 8.6.4 — Database certainty (if baseline exists and is explicit)
    if (databaseBaselineV8_6 && databaseBaseline) {
      if (databaseBaseline.source === "database_explicit" || databaseBaseline.source === "breeder_classification") {
        confidence += 10; // Explicit database entry = +10%
      } else if (databaseBaseline.source === "lineage_inferred") {
        confidence += 5; // Inferred from lineage = +5%
      }
    }
    
    // Phase 8.6.4 — Visual agreement (if multi-image consensus variance is low)
    if (multiImageConsensusV8_6 && multiImageConsensusV8_6.variance < 10) {
      confidence += 5; // Low variance = +5%
    } else if (multiImageConsensusV8_6 && multiImageConsensusV8_6.variance > 25) {
      confidence -= 5; // High variance = -5%
    }
    
    // Phase 8.6.4 — Clamp confidence to 0-100
    confidence = Math.max(0, Math.min(100, confidence));
    
    finalDominanceV8_6 = {
      indica: finalIndica,
      sativa: finalSativa,
      hybrid: Math.max(0, finalHybrid),
      confidence: Math.round(confidence),
    };
    
    console.log("DOMINANCE FINAL:", JSON.stringify(finalDominanceV8_6));
  } else if (multiImageConsensusV8_6) {
    // Phase 8.6.4 — Fallback: use multi-image consensus only
    let confidence = 60; // Base confidence
    
    if (imageCount >= 3) {
      confidence += 10;
    } else if (imageCount === 2) {
      confidence += 5;
    }
    
    if (multiImageConsensusV8_6.variance < 10) {
      confidence += 5;
    } else if (multiImageConsensusV8_6.variance > 25) {
      confidence -= 5;
    }
    
    confidence = Math.max(0, Math.min(100, confidence));
    
    finalDominanceV8_6 = {
      indica: multiImageConsensusV8_6.indica,
      sativa: multiImageConsensusV8_6.sativa,
      hybrid: multiImageConsensusV8_6.hybrid,
      confidence: Math.round(confidence),
    };
    
    console.log("DOMINANCE FINAL (multi-image only):", JSON.stringify(finalDominanceV8_6));
  } else if (databaseBaselineV8_6) {
    // Phase 8.6.4 — Fallback: use database baseline only
    finalDominanceV8_6 = {
      indica: databaseBaselineV8_6.indica,
      sativa: databaseBaselineV8_6.sativa,
      hybrid: databaseBaselineV8_6.hybrid,
      confidence: 65, // Lower confidence without visual confirmation
    };
    
    console.log("DOMINANCE FINAL (database only):", JSON.stringify(finalDominanceV8_6));
  }
  
  // Phase 8.4.3 — CONSENSUS MERGE
  // Combine:
  // - 60% database prior
  // - 40% visual analysis
  // Across images:
  // - Average results
  // - Reduce variance outliers
  // - Normalize to 100%
  let consensusRatio8_4: { indicaPercent: number; sativaPercent: number; dominanceLabel: "Indica" | "Sativa" | "Hybrid" } | null = null;
  
  // Phase 8.4.3 — Use database dominance prior if available, otherwise fall back to lineage signals
  const dbPrior = databaseDominancePrior || (databaseLineageSignals ? { dbIndica: databaseLineageSignals.indicaScore, dbSativa: databaseLineageSignals.sativaScore } : null);
  
  if (perImageDominanceSignals.length > 0 && dbPrior) {
    // Phase 8.4.3 — Calculate visual signals average (40% weight)
    const avgVisualIndica = perImageDominanceSignals.reduce((sum, img) => sum + img.indicaScore, 0) / perImageDominanceSignals.length;
    const avgVisualSativa = perImageDominanceSignals.reduce((sum, img) => sum + img.sativaScore, 0) / perImageDominanceSignals.length;
    
    // Phase 8.4.3 — Reduce variance outliers (remove scores >2 standard deviations from mean)
    const indicaValues = perImageDominanceSignals.map(img => img.indicaScore);
    const meanIndica = avgVisualIndica;
    const stdDevIndica = Math.sqrt(indicaValues.reduce((sum, val) => sum + Math.pow(val - meanIndica, 2), 0) / indicaValues.length);
    const filteredIndica = indicaValues.filter(val => Math.abs(val - meanIndica) <= 2 * stdDevIndica);
    const filteredAvgIndica = filteredIndica.length > 0 ? filteredIndica.reduce((sum, val) => sum + val, 0) / filteredIndica.length : avgVisualIndica;
    
    const sativaValues = perImageDominanceSignals.map(img => img.sativaScore);
    const meanSativa = avgVisualSativa;
    const stdDevSativa = Math.sqrt(sativaValues.reduce((sum, val) => sum + Math.pow(val - meanSativa, 2), 0) / sativaValues.length);
    const filteredSativa = sativaValues.filter(val => Math.abs(val - meanSativa) <= 2 * stdDevSativa);
    const filteredAvgSativa = filteredSativa.length > 0 ? filteredSativa.reduce((sum, val) => sum + val, 0) / filteredSativa.length : avgVisualSativa;
    
    // Phase 8.4.3 — Combine: 60% database prior + 40% visual analysis
    const combinedIndica = (dbPrior.dbIndica * 0.6) + (filteredAvgIndica * 0.4);
    const combinedSativa = (dbPrior.dbSativa * 0.6) + (filteredAvgSativa * 0.4);
    
    // Phase 8.4.3 — Normalize to 100%
    const total = combinedIndica + combinedSativa;
    const finalIndica8_4 = Math.round((combinedIndica / total) * 100);
    const finalSativa8_4 = 100 - finalIndica8_4;
    
    // Phase 8.4.4 — FINAL RATIO OUTPUT
    // Rules:
    // - Always sum to 100%
    // - If within 10% → label Hybrid
    // - Never output "Unknown" unless data < threshold
    let dominanceLabel8_4: "Indica" | "Sativa" | "Hybrid";
    const diff = Math.abs(finalIndica8_4 - finalSativa8_4);
    
    if (diff <= 10) {
      // Phase 8.4.4 — If within 10% → label Hybrid
      dominanceLabel8_4 = "Hybrid";
    } else if (finalIndica8_4 > finalSativa8_4) {
      dominanceLabel8_4 = "Indica";
    } else {
      dominanceLabel8_4 = "Sativa";
    }
    
    consensusRatio8_4 = {
      indicaPercent: finalIndica8_4,
      sativaPercent: finalSativa8_4,
      dominanceLabel: dominanceLabel8_4,
    };
    
    console.log("DOMINANCE FINAL:", JSON.stringify(consensusRatio8_4));
  } else if (perImageDominanceSignals.length > 0) {
    // Phase 8.4.3 — Fallback: use visual signals only if no database
    const avgVisualIndica = perImageDominanceSignals.reduce((sum, img) => sum + img.indicaScore, 0) / perImageDominanceSignals.length;
    const avgVisualSativa = perImageDominanceSignals.reduce((sum, img) => sum + img.sativaScore, 0) / perImageDominanceSignals.length;
    
    const total = avgVisualIndica + avgVisualSativa;
    const finalIndica8_4 = Math.round((avgVisualIndica / total) * 100);
    const finalSativa8_4 = 100 - finalIndica8_4;
    
    const diff = Math.abs(finalIndica8_4 - finalSativa8_4);
    const dominanceLabel8_4: "Indica" | "Sativa" | "Hybrid" = diff <= 10 ? "Hybrid" : (finalIndica8_4 > finalSativa8_4 ? "Indica" : "Sativa");
    
    consensusRatio8_4 = {
      indicaPercent: finalIndica8_4,
      sativaPercent: finalSativa8_4,
      dominanceLabel: dominanceLabel8_4,
    };
    
    console.log("DOMINANCE FINAL (visual only):", JSON.stringify(consensusRatio8_4));
  } else if (dbPrior) {
    // Phase 8.4.3 — Fallback: use database only if no visual signals
    const diff = Math.abs(dbPrior.dbIndica - dbPrior.dbSativa);
    const dominanceLabel8_4: "Indica" | "Sativa" | "Hybrid" = diff <= 10 ? "Hybrid" : (dbPrior.dbIndica > dbPrior.dbSativa ? "Indica" : "Sativa");
    
    consensusRatio8_4 = {
      indicaPercent: dbPrior.dbIndica,
      sativaPercent: dbPrior.dbSativa,
      dominanceLabel: dominanceLabel8_4,
    };
    
    console.log("DOMINANCE FINAL (database only):", JSON.stringify(consensusRatio8_4));
  }
  
  // Phase 8.2.3 — Legacy consensus ratio (keep for compatibility)
  let consensusRatio8_2: { indica: number; sativa: number; type: "Indica" | "Sativa" | "Hybrid" } | null = null;
  
  if (consensusRatio8_4) {
    // Convert 8.4 format to 8.2 format for compatibility
    consensusRatio8_2 = {
      indica: consensusRatio8_4.indicaPercent,
      sativa: consensusRatio8_4.sativaPercent,
      type: consensusRatio8_4.dominanceLabel,
    };
  }
  
  // Phase 8.0.1 — PER-IMAGE DOMINANCE SIGNALS
  // For EACH image analyzed, infer dominance signals from:
  // - Leaf width (broad vs narrow)
  // - Internode spacing
  // - Bud density & shape
  // - Trichome distribution
  // - Growth posture cues already extracted
  const perImageScores: Array<{ indica: number; sativa: number; imageIndex: number }> = [];
  
  if (imageResults && imageResults.length > 0) {
    console.log("Phase 8.0.1 — PER-IMAGE DOMINANCE SIGNALS: Analyzing", imageResults.length, "images");
    
    imageResults.forEach((result, idx) => {
      const perImageScore = calculatePerImageDominance(result, baseIndica || 50);
      if (perImageScore) {
        perImageScores.push({
          indica: perImageScore.indica,
          sativa: perImageScore.sativa,
          imageIndex: idx,
        });
      }
    });
    
    console.log("DOMINANCE PER IMAGE:", perImageScores.map(s => `Image ${s.imageIndex}: ${s.indica}% Indica / ${s.sativa}% Sativa`).join(", "));
  }
  
  // Phase 8.0.2 — CONSENSUS RATIO MERGE
  // Across all images:
  // 1. Average indica & sativa scores
  // 2. Apply agreement bonus if ≥2 images align
  // 3. Normalize to total = 100
  let hasContradiction = false;
  let confidenceTightened = false;
  
  // Phase 8.0.3 — CONFIDENCE ADJUSTMENT: Initialize confidence
  let dominanceConfidence: "Low" | "Medium" | "High" | "Very High" = "Medium";
  
  if (perImageScores.length >= 2) {
    console.log("Phase 8.0.2 — CONSENSUS RATIO MERGE: Merging", perImageScores.length, "image scores");
    
    // Phase 8.0.2 — 1. Average indica & sativa scores
    const avgIndica = perImageScores.reduce((sum, s) => sum + s.indica, 0) / perImageScores.length;
    const avgSativa = perImageScores.reduce((sum, s) => sum + s.sativa, 0) / perImageScores.length;
    
    // Phase 8.0.2 — 2. Apply agreement bonus if ≥2 images align
    // Check how many images agree within ±10% of average
    const agreeingImages = perImageScores.filter(s => 
      Math.abs(s.indica - avgIndica) <= 10
    ).length;
    
    const agreementRatio = agreeingImages / perImageScores.length;
    let agreementBonus = 0;
    
    if (agreementRatio >= 0.8) {
      // 80%+ of images agree → strong agreement bonus
      agreementBonus = 5;
      console.log("Phase 8.0.2 — AGREEMENT BONUS: 80%+ images align (+5% boost)");
    } else if (agreementRatio >= 0.6) {
      // 60%+ of images agree → moderate agreement bonus
      agreementBonus = 3;
      console.log("Phase 8.0.2 — AGREEMENT BONUS: 60%+ images align (+3% boost)");
    } else if (agreementRatio >= 0.4) {
      // 40%+ of images agree → slight agreement bonus
      agreementBonus = 1;
      console.log("Phase 8.0.2 — AGREEMENT BONUS: 40%+ images align (+1% boost)");
    }
    
    // Phase 8.0.2 — Weight by image quality (use candidate confidence as proxy)
    let weightedIndicaSum = 0;
    let weightedSativaSum = 0;
    let totalWeight = 0;
    
    perImageScores.forEach((score, idx) => {
      const imageResult = imageResults?.[score.imageIndex];
      const imageQuality = imageResult?.candidateStrains[0]?.confidence || 75; // Use top candidate confidence as quality proxy
      const weight = imageQuality / 100; // Normalize to 0-1
      
      weightedIndicaSum += score.indica * weight;
      weightedSativaSum += score.sativa * weight;
      totalWeight += weight;
    });
    
    const qualityWeightedIndica = totalWeight > 0 ? weightedIndicaSum / totalWeight : avgIndica;
    const qualityWeightedSativa = totalWeight > 0 ? weightedSativaSum / totalWeight : avgSativa;
    
    // Phase 8.0.2 — Apply agreement bonus to weighted average
    const adjustedIndica = qualityWeightedIndica + (agreementBonus * (qualityWeightedIndica > 50 ? 1 : -1));
    const adjustedSativa = qualityWeightedSativa + (agreementBonus * (qualityWeightedSativa > 50 ? 1 : -1));
    
    // Phase 8.0.2 — Calculate variance for contradiction detection
    const indicaValues = perImageScores.map(s => s.indica);
    const maxIndica = Math.max(...indicaValues);
    const minIndica = Math.min(...indicaValues);
    const variance = maxIndica - minIndica;
    
    if (variance > 25) {
      hasContradiction = true;
      console.log("Phase 8.0.2 — CONTRADICTION FLAGGED: Variance =", variance, "% (>25% threshold)");
      // Phase 8.0.2 — Penalize: use 70% calculated, 30% averaged (stronger penalty)
      finalIndicaPercent = Math.round(finalIndicaPercent * 0.7 + adjustedIndica * 0.3);
      finalSativaPercent = 100 - finalIndicaPercent;
    } else {
      // Phase 8.0.2 — No contradiction: blend calculated with adjusted average
      console.log("Phase 8.0.2 — No contradiction (variance:", variance, "%), blending");
      // Blend: 50% calculated, 50% adjusted average
      finalIndicaPercent = Math.round(finalIndicaPercent * 0.5 + adjustedIndica * 0.5);
      finalSativaPercent = 100 - finalIndicaPercent;
      confidenceTightened = true;
    }
    
    // Phase 8.0.2 — 3. Normalize to total = 100
    const total = finalIndicaPercent + finalSativaPercent;
    if (Math.abs(total - 100) > 0.1) {
      finalIndicaPercent = Math.round((finalIndicaPercent / total) * 100);
      finalSativaPercent = 100 - finalIndicaPercent;
    }
    
    // Phase 8.0.3 — CONFIDENCE ADJUSTMENT: Adjust dominance confidence based on image count, trait variance, contradictions
    if (imageCount >= 3 && agreementRatio >= 0.8 && variance <= 15) {
      dominanceConfidence = "Very High"; // 3+ aligned images
    } else if (imageCount >= 2 && agreementRatio >= 0.6 && variance <= 20) {
      dominanceConfidence = "High";
    } else if (imageCount >= 2 && variance <= 25) {
      dominanceConfidence = "Medium";
    } else if (hasContradiction || variance > 25) {
      dominanceConfidence = "Low"; // Single image, conflicting traits, or high variance
    } else {
      dominanceConfidence = "Low"; // Single image or conflicting traits
    }
    
    console.log("DOMINANCE CONSENSUS:", `${finalIndicaPercent}% Indica / ${finalSativaPercent}% Sativa (variance: ${variance}%, confidence: ${dominanceConfidence})`);
  } else if (perImageScores.length === 1) {
    // Single image: use its score directly
    finalIndicaPercent = perImageScores[0].indica;
    finalSativaPercent = perImageScores[0].sativa;
    dominanceConfidence = "Low"; // Phase 8.0.3 — Single image = Low confidence
    console.log("DOMINANCE CONSENSUS:", `${finalIndicaPercent}% Indica / ${finalSativaPercent}% Sativa (single image, confidence: Low)`);
  } else {
    // No per-image scores: use default confidence
    dominanceConfidence = "Low";
  }
  
  // Phase 8.0.2 — Build dominance result for logging
  const dominanceResult = {
    indicaPercent: finalIndicaPercent,
    sativaPercent: finalSativaPercent,
    hybridLabel: ratioLabel,
    confidence: dominanceConfidence,
  };
  
  console.log("DOMINANCE CONSENSUS:", JSON.stringify(dominanceResult));

  // Phase 5.4.3 — RATIO CALCULATION
  // Produce:
  // {
  //   type: "Indica" | "Sativa" | "Hybrid",
  //   ratio: {
  //     indica: number,
  //     sativa: number
  //   },
  //   confidenceNote: string
  // }
  // Rules:
  // - Must total 100%
  // - Never "pure" unless database confirms
  // - Hybrids always show ratio
  
  // Phase 5.4.3 — Ensure sum = 100
  const total = finalIndicaPercent + finalSativaPercent;
  if (Math.abs(total - 100) > 0.1) {
    // Normalize if not exactly 100
    finalIndicaPercent = Math.round((finalIndicaPercent / total) * 100);
    finalSativaPercent = 100 - finalIndicaPercent;
  }
  
  // Phase 5.4.3 — Determine type: "Indica" | "Sativa" | "Hybrid"
  // Never "pure" unless database confirms
  let ratioType: "Indica" | "Sativa" | "Hybrid";
  const isPureIndica = finalIndicaPercent >= 90 && databaseBaseline && databaseBaseline.source === "database_explicit";
  const isPureSativa = finalSativaPercent >= 90 && databaseBaseline && databaseBaseline.source === "database_explicit";
  
  if (isPureIndica) {
    ratioType = "Indica";
  } else if (isPureSativa) {
    ratioType = "Sativa";
  } else if (finalIndicaPercent >= 70) {
    ratioType = "Indica"; // Indica-dominant, but not pure
  } else if (finalSativaPercent >= 70) {
    ratioType = "Sativa"; // Sativa-dominant, but not pure
  } else {
    ratioType = "Hybrid"; // Hybrid (40-60% range or mixed)
  }
  
  // Phase 8.0.2 — LABELING RULES (enhanced from 6.0.3)
  // - ≥70% indica → "Indica-dominant"
  // - ≥70% sativa → "Sativa-dominant"
  // - Otherwise → "Balanced Hybrid"
  // Never default to "Hybrid" without percentages.
  // Hybrid implied when both > 40.
  let ratioLabel: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
  if (finalIndicaPercent >= 70) {
    ratioLabel = "Indica-dominant";
  } else if (finalSativaPercent >= 70) {
    ratioLabel = "Sativa-dominant";
  } else if (finalIndicaPercent > 40 && finalSativaPercent > 40) {
    // Phase 8.0.2 — Hybrid implied when both > 40
    ratioLabel = "Balanced Hybrid";
  } else {
    ratioLabel = "Balanced Hybrid"; // Fallback
  }
  
  // Phase 5.4.3 — Generate confidence note
  const confidenceNoteParts: string[] = [];
  if (databaseBaseline && databaseBaseline.source === "database_explicit") {
    confidenceNoteParts.push("Database-confirmed ratio");
  } else if (databaseBaseline && databaseBaseline.isInferred) {
    confidenceNoteParts.push("Inferred from lineage");
  } else {
    confidenceNoteParts.push("Estimated from visual traits");
  }
  if (morphologyAdjustment && Math.abs(morphologyAdjustment.adjustment) > 5) {
    confidenceNoteParts.push(`adjusted by visual signals (${morphologyAdjustment.adjustment > 0 ? '+' : ''}${morphologyAdjustment.adjustment}%)`);
  }
  if (imageCount > 1) {
    confidenceNoteParts.push(`based on ${imageCount} images`);
  }
  const confidenceNote = confidenceNoteParts.join(", ");
  
  // Phase 5.4.3 — Log final ratio
  console.log("BASELINE RATIO:", `${baseIndica || 50}% Indica / ${baseSativa || 50}% Sativa`);
  if (morphologyAdjustment) {
    const adjustmentDetails = morphologyAdjustment.adjustments.map(a => 
      `${a.signal}: ${a.adjustment > 0 ? '+' : ''}${a.adjustment}%`
    ).join(", ");
    console.log("IMAGE ADJUSTMENT:", adjustmentDetails, `(Total: ${morphologyAdjustment.adjustment > 0 ? '+' : ''}${morphologyAdjustment.adjustment}%)`);
  }
  console.log("RATIO RESULT:", `${ratioType} (${finalIndicaPercent}% Indica / ${finalSativaPercent}% Sativa) - ${confidenceNote}`);
  
  // Phase 5.0.9.4 — FINAL RATIO OUTPUT: Log final ratio (legacy)
  console.log("FINAL INDICA/SATIVA:", `${finalIndicaPercent}% Indica / ${finalSativaPercent}% Sativa (${classification})`);
  
  // Phase 5.0.3.3 — MANDATORY LOGS (legacy)
  const ratioSources: string[] = [];
  if (consensusRatio) {
    ratioSources.push(`Consensus (${consensusRatio.sources.length} candidates)`);
  }
  if (databaseBaseline) {
    ratioSources.push(`Database (${dbSource})`);
  }
  if (lineageInference) {
    ratioSources.push("Lineage inference");
  }
  if (morphologyAdjustment) {
    ratioSources.push("Morphology adjustment");
  }
  console.log("RATIO SOURCES:", ratioSources.join(", "));
  console.log("FINAL RATIO:", finalIndicaPercent, "% Indica /", finalSativaPercent, "% Sativa");
  
  // Phase 4.8 Step 4.8.4 — Determine source and confidence
  let source: StrainRatio["explanation"]["source"];
  if (consensusRatio) {
    source = "consensus_weighted";
  } else if (databaseBaseline && databaseBaseline.source === "database_explicit") {
    source = "database_explicit";
  } else if (lineageInference && morphologyAdjustment) {
    source = "morphology_adjusted";
  } else if (lineageInference) {
    source = "lineage_inferred";
  } else if (morphologyAdjustment) {
    source = "morphology_adjusted";
  } else {
    source = dbSource as StrainRatio["explanation"]["source"] || "database_dominance";
  }

  // Phase 4.8 Step 4.8.5 — CONFIDENCE-AWARE DISPLAY
  // Determine confidence level
  let confidenceLevel: "high" | "medium" | "low" = "medium";
  if (databaseBaseline.source === "database_explicit") {
    confidenceLevel = "high";
  } else if (lineageInference && databaseBaseline.source === "database_dominance") {
    confidenceLevel = "high";
  } else if (databaseBaseline.source === "database_dominance" && morphologyAdjustment) {
    confidenceLevel = "high";
  } else if (!lineageInference && !morphologyAdjustment) {
    confidenceLevel = "medium";
  } else {
    confidenceLevel = "medium";
  }

  // Phase 4.6 Step 4.6.2 — Multi-image consensus check (if available)
  let imageAlignment: string | undefined;
  if (imageResults && imageResults.length > 1) {
    const imageDominances: Array<{ dominance: string; confidence: number }> = [];
    
    imageResults.forEach(result => {
      const wikiDominance = result.wikiResult?.genetics?.dominance;
      if (wikiDominance && wikiDominance !== "Unknown") {
        const primaryConfidence = result.candidateStrains[0]?.confidence || 70;
        imageDominances.push({
          dominance: wikiDominance,
          confidence: primaryConfidence,
        });
      }
    });

    if (imageDominances.length > 0) {
      const agreeingDominances = imageDominances.filter(
        d => d.dominance === dominance
      );

      if (agreeingDominances.length >= imageDominances.length * 0.6) {
        const avgConfidence = agreeingDominances.reduce((sum, d) => sum + d.confidence, 0) / agreeingDominances.length;
        imageAlignment = `${agreeingDominances.length} of ${imageResults.length} images confirmed ${dominance} dominance (avg confidence: ${Math.round(avgConfidence)}%)`;
        source = "consensus_weighted";
        confidenceLevel = "high"; // Boost confidence if images agree
      }
    }
  }

  // Phase 5.0.9.4 — FINAL RATIO OUTPUT: Generate explanation array
  // Phase 4.8 Step 4.8.4 — Build confidence notes
  const confidenceNotes: string[] = [];
  const explanation: string[] = []; // Phase 5.0.9.4 — Explanation tied to data
  
  if (consensusRatio) {
    const note = `Ratio calculated from weighted average of ${consensusRatio.sources.length} candidates`;
    confidenceNotes.push(note);
    explanation.push(note); // Phase 5.0.7.3
    if (consensusRatio.variance > 10) {
      const varianceNote = `Variance between candidates: ${consensusRatio.variance}% (moderate agreement)`;
      confidenceNotes.push(varianceNote);
      explanation.push(varianceNote); // Phase 5.0.7.3
    } else if (consensusRatio.variance > 0) {
      const varianceNote = `Variance between candidates: ${consensusRatio.variance}% (high agreement)`;
      confidenceNotes.push(varianceNote);
      explanation.push(varianceNote); // Phase 5.0.7.3
    }
  }
  
  if (dbSource === "database_dominance" || dbSource === "database_explicit") {
    const note = `Ratio derived from database: ${dbEntry?.type || dbEntry?.dominantType || "Unknown"}-dominant`;
    confidenceNotes.push(note);
    explanation.push(note); // Phase 5.0.7.3
  } else if (dbSource === "lineage_inferred") {
    confidenceNotes.push(baseReasoning);
    explanation.push(baseReasoning); // Phase 5.0.7.3
  } else {
    confidenceNotes.push(baseReasoning);
    explanation.push(baseReasoning); // Phase 5.0.7.3
  }
  
  if (lineageInference && dbSource !== "lineage_inferred") {
    confidenceNotes.push(lineageInference.inference);
    explanation.push(lineageInference.inference); // Phase 5.0.7.3
  }
  
  if (morphologyAdjustment) {
    const note = `Visual traits adjusted ratio: ${morphologyAdjustment.reasoning} (±${Math.abs(morphologyAdjustment.adjustment)}% adjustment)`;
    confidenceNotes.push(note);
    explanation.push(note); // Phase 5.0.7.3
  }
  
  if (terpeneWeighting) {
    const note = `Terpene profile suggests ${terpeneWeighting.indicaPercent > terpeneWeighting.sativaPercent ? "indica" : "sativa"}-leaning ratio`;
    explanation.push(note); // Phase 5.0.7.3
  }
  
  if (!consensusRatio && !lineageInference && !morphologyAdjustment && !terpeneWeighting) {
    const note = "Ratio estimated from database classification only.";
    confidenceNotes.push(note);
    explanation.push(note); // Phase 5.0.7.3
  }
  
  // Phase 5.0.7.3 — Add classification explanation
  explanation.push(`Classification: ${classification} (${finalIndicaPercent}% Indica, ${finalSativaPercent}% Sativa)`);

  // Phase 5.0.3.4 — Store hybridLabel for ViewModel
  // Phase 5.0.7.3 — OUTPUT STRUCTURE: Add classification and explanation
  const result: StrainRatio = {
    indicaPercent: finalIndicaPercent,
    sativaPercent: finalSativaPercent,
    // Phase 5.0 Step 5.0.4 — Include range if variance exists (currently disabled - user reverted Phase 5.0 multi-image logic)
    indicaRange: undefined,
    sativaRange: undefined,
    dominance,
    displayText,
    explanation: {
      source,
      databaseStrain: strainName,
      confidenceNotes: confidenceNotes.join(" "),
      imageAlignment,
      lineageInference: lineageInference?.inference,
      morphologyAdjustment: morphologyAdjustment ? `${morphologyAdjustment.reasoning} (±${Math.abs(morphologyAdjustment.adjustment).toFixed(1)}%)` : undefined,
      confidenceLevel,
      varianceRange: consensusRatio && consensusRatio.variance > 0 
        ? `Variance between candidates: ${consensusRatio.variance}%`
        : undefined,
    },
  };
  
  // Phase 5.0.3.4 — Add hybridLabel to result (for ViewModel access)
  (result as any).hybridLabel = hybridLabel;
  
  // Phase 5.0.7.3 — Add classification and explanation to result
  (result as any).classification = classification;
  (result as any).explanationArray = explanation;
  
  // Phase 5.2.4 — Add final ratio output structure
  (result as any).ratioOutput = {
    indica: finalIndicaPercent,
    sativa: finalSativaPercent,
    label: ratioLabel,
  };
  
  // Phase 5.4.3 — Add ratio calculation structure
  (result as any).ratioCalculation = {
    type: ratioType,
    ratio: {
      indica: finalIndicaPercent,
      sativa: finalSativaPercent,
    },
    confidenceNote,
  };
  
  // Phase 5.8.4 — VIEWMODEL ADDITION: Add ratio with hybrid score
  (result as any).ratioWithHybrid = {
    indica: finalIndicaPercent,
    sativa: finalSativaPercent,
    hybrid: finalHybridPercent,
    ratioLabel, // Phase 5.8.4
  };
  
  // Phase 8.0.4 — VIEWMODEL EXTENSION: Add dominance with confidence
  (result as any).dominanceWithConfidence = {
    indica: finalIndicaPercent,
    sativa: finalSativaPercent,
    label: ratioLabel,
    confidence: dominanceConfidence, // Phase 8.0.3 — Confidence tier
  };
  
  // Phase 8.2.3 — Add consensus ratio (60% visual + 40% database) - legacy
  if (consensusRatio8_2) {
    (result as any).consensusRatio8_2 = consensusRatio8_2;
  }
  
  // Phase 8.4.3 — Add consensus ratio (60% database + 40% visual)
  if (consensusRatio8_4) {
    (result as any).consensusRatio8_4 = consensusRatio8_4;
  }
  
  // Phase 8.6.4 — Add final dominance with confidence
  if (finalDominanceV8_6) {
    (result as any).dominanceV8_6 = finalDominanceV8_6;
  }
  
  // Phase 5.2.3 — Add contradiction flag if spread >15%
  if (hasContradiction) {
    (result as any).hasContradiction = true;
    explanation.push("Contradictory ratios detected across images (spread >15%)");
  }
  
  // RETURN THE MUTATED VALUES
  (result as any).indica = finalIndicaScore;
  (result as any).sativa = finalSativaScore;
  (result as any).hybrid = finalHybridScore;
  (result as any).confidence = databaseConfidence;
  
  return result;
}

/**
 * Phase 4.6 Step 4.6.4 — Generate Explanation Text
 * Phase 4.8 Step 4.8.5 — Enhanced with confidence-aware display
 * 
 * Collapsed text:
 * "How this ratio was determined"
 * 
 * Expands to:
 * - Database lineage
 * - Image alignment
 * - Known phenotype behavior
 * - Lineage inference (Phase 4.8)
 * - Morphology adjustment (Phase 4.8)
 * - Confidence note if < High (Phase 4.8)
 */
export function generateRatioExplanation(
  ratio: StrainRatio,
  dbEntry?: CultivarReference,
  wikiReportGenetics?: { lineage?: string; dominanceExplanation?: string } | undefined
): {
  summary: string; // Short summary for collapsed header
  fullExplanation: string[]; // Bullets for expanded section
} {
  const bullets: string[] = [];

  // Phase 4.8 Step 4.8.5 — CONFIDENCE-AWARE DISPLAY
  // If confidence < High, show note
  if (ratio.explanation.confidenceLevel && ratio.explanation.confidenceLevel !== "high") {
    bullets.push(`Ratio estimated from genetics + visual traits${ratio.explanation.confidenceLevel === "low" ? " (limited confidence)" : ""}`);
  }

  // Phase 4.8 Step 4.8.1 — Database baseline
  if (ratio.explanation.source === "database_explicit") {
    bullets.push(`Explicit ratio from 35,000-strain database`);
  } else if (ratio.explanation.source === "database_dominance") {
    bullets.push(`Ratio derived from database classification: ${ratio.dominance}-dominant`);
  }

  // Phase 4.8 Step 4.8.2 — Lineage inference
  if (ratio.explanation.lineageInference) {
    bullets.push(ratio.explanation.lineageInference);
  }

  // Phase 4.8 Step 4.8.3 — Morphology adjustment
  if (ratio.explanation.morphologyAdjustment) {
    bullets.push(`Visual traits adjustment: ${ratio.explanation.morphologyAdjustment}`);
  }

  // Phase 4.6 Step 4.6.4 — Database lineage
  if (dbEntry?.genetics) {
    bullets.push(`Database lineage: ${dbEntry.genetics}`);
  }

  // Phase 4.6 Step 4.6.4 — Image alignment
  if (ratio.explanation.imageAlignment) {
    bullets.push(ratio.explanation.imageAlignment);
  }

  // Phase 4.6 Step 4.6.4 — Consensus weighted
  if (ratio.explanation.source === "consensus_weighted") {
    bullets.push(`Ratio confirmed by multi-image consensus weighted by confidence`);
  }

  // Phase 4.6 Step 4.6.4 — Dominance explanation from wiki report if available
  if (wikiReportGenetics?.dominanceExplanation) {
    bullets.push(wikiReportGenetics.dominanceExplanation);
  }

  // Phase 4.8 Step 4.8.4 — Weighted calculation summary
  if (ratio.explanation.lineageInference || ratio.explanation.morphologyAdjustment) {
    bullets.push(`Final ratio calculated using weighted combination: Database baseline (60%) ${ratio.explanation.lineageInference ? "+ Lineage inference (25%)" : ""} ${ratio.explanation.morphologyAdjustment ? "+ Visual traits (15%)" : ""}`);
  }

  return {
    summary: ratio.explanation.confidenceLevel === "high" 
      ? `Ratio determined from ${ratio.explanation.databaseStrain || "database"} classification`
      : `Ratio estimated from genetics + visual traits`,
    fullExplanation: bullets.length > 0 ? bullets : ["Ratio derived from strain database classification."],
  };
}
