// lib/scanner/effectProfileUseCaseV76.ts
// Phase 7.6 — Effect Profile & Use-Case Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 7.6 — Effect Entry
 */
export type EffectEntryV76 = {
  name: string;
  category: "primary" | "secondary";
  intensity: "high" | "medium" | "low";
  reasoning: string[]; // Why this effect was included
};

/**
 * Phase 7.6 — Use Case Entry
 */
export type UseCaseEntryV76 = {
  title: string;
  description: string;
  reasoning: string[]; // Why this use case fits
};

/**
 * Phase 7.6 — Effect Profile Result
 */
export type EffectProfileUseCaseV76 = {
  primaryEffects: EffectEntryV76[]; // Top 3-5 most consistent effects
  secondaryEffects: EffectEntryV76[]; // Common but variable effects
  useCases: UseCaseEntryV76[]; // 3-5 real-world use cases
  varianceDisclosure: string[]; // Always include disclaimers
  explanation: string[]; // Why this profile was chosen
  confidence: "very_high" | "high" | "medium" | "low";
  confidenceLabel: string;
  source: "database_primary" | "database_blended" | "database_visual" | "database_visual_terpene" | "database_visual_terpene_consensus" | "inferred_visual" | "default";
};

/**
 * Phase 7.6 Step 7.6.1 — GENETIC EFFECT BASELINE
 * 
 * From matched strain candidates:
 * - Extract common reported effects
 * - Rank by frequency across sources
 * - Group into:
 *   • Primary Effects (most consistent)
 *   • Secondary Effects (common but variable)
 */
function getGeneticEffectBaselineV76(
  strainName: string,
  dbEntry?: CultivarReference,
  candidateStrains?: Array<{ name: string; confidence: number }>
): {
  effects: Map<string, { frequency: number; totalConfidence: number; sources: string[] }>;
  reasoning: string[];
  source: "database_primary" | "database_blended" | "default";
} {
  const effectMap = new Map<string, { frequency: number; totalConfidence: number; sources: string[] }>();
  const reasoning: string[] = [];
  
  // Phase 7.6.1 — If strain identified, pull from database
  if (dbEntry) {
    const dbEffects = dbEntry.effects || [];
    
    dbEffects.forEach((effect, index) => {
      const normalized = effect.toLowerCase();
      const positionWeight = 1.0 - (index * 0.1); // First effect gets full weight
      const confidence = 90 * positionWeight; // High confidence for database effects
      
      const existing = effectMap.get(normalized);
      if (existing) {
        existing.frequency++;
        existing.totalConfidence = Math.max(existing.totalConfidence, confidence);
        existing.sources.push("Strain database");
      } else {
        effectMap.set(normalized, {
          frequency: 1,
          totalConfidence: confidence,
          sources: ["Strain database"],
        });
      }
    });
    
    reasoning.push(`Effect profile from strain database: ${dbEffects.slice(0, 5).join(", ")}`);
    
    return {
      effects: effectMap,
      reasoning,
      source: "database_primary",
    };
  }
  
  // Phase 7.6.1 — If multiple candidate strains, blend effects
  if (candidateStrains && candidateStrains.length > 0) {
    const topCandidates = candidateStrains.slice(0, 5);
    const candidateWeights = topCandidates.map(c => c.confidence);
    const totalWeight = candidateWeights.reduce((sum, w) => sum + w, 0);
    
    topCandidates.forEach((candidate, index) => {
      const candidateDb = CULTIVAR_LIBRARY.find(s => 
        s.name.toLowerCase() === candidate.name.toLowerCase()
      );
      
      if (candidateDb) {
        const weight = candidateWeights[index] / totalWeight;
        const candidateEffects = candidateDb.effects || [];
        
        candidateEffects.forEach((effect, effectIndex) => {
          const normalized = effect.toLowerCase();
          const positionWeight = 1.0 - (effectIndex * 0.1);
          const weightedConfidence = candidate.confidence * positionWeight * weight;
          
          const existing = effectMap.get(normalized);
          if (existing) {
            existing.frequency++;
            existing.totalConfidence += weightedConfidence;
            existing.sources.push(`Candidate: ${candidate.name}`);
          } else {
            effectMap.set(normalized, {
              frequency: 1,
              totalConfidence: weightedConfidence,
              sources: [`Candidate: ${candidate.name}`],
            });
          }
        });
      }
    });
    
    reasoning.push(`Effect profile blended from top ${topCandidates.length} candidate strains (ranked by frequency)`);
    
    return {
      effects: effectMap,
      reasoning,
      source: "database_blended",
    };
  }
  
  // Phase 7.6.1 — Default: empty effects
  return {
    effects: effectMap,
    reasoning: ["No strain identified. Cannot determine effect profile from genetics."],
    source: "default",
  };
}

/**
 * Phase 7.6 Step 7.6.2 — DOMINANCE-ALIGNED WEIGHTING
 * 
 * Adjust effect likelihoods based on ratio:
 * 
 * Indica-leaning boosts:
 * - Body relaxation
 * - Calm
 * - Sleepiness
 * - Pain relief
 * 
 * Sativa-leaning boosts:
 * - Energy
 * - Creativity
 * - Focus
 * - Mood lift
 * 
 * Hybrid:
 * - Balance both sides
 * - Reduce extremes
 * 
 * Rules:
 * - Effects cannot contradict dominance
 * - Hybrids may show dual primary effects
 */
function applyDominanceAlignedWeightingV76(
  effects: Map<string, { frequency: number; totalConfidence: number; sources: string[] }>,
  indicaPercent: number,
  sativaPercent: number
): {
  effects: Map<string, { frequency: number; totalConfidence: number; sources: string[]; dominanceBoost: number }>;
  reasoning: string[];
} {
  const weightedEffects = new Map<string, { frequency: number; totalConfidence: number; sources: string[]; dominanceBoost: number }>();
  const reasoning: string[] = [];
  
  // Phase 7.6.2 — Determine dominance class
  const isIndicaDominant = indicaPercent > 55;
  const isSativaDominant = sativaPercent > 55;
  const isBalanced = indicaPercent >= 45 && indicaPercent <= 55;
  
  // Phase 7.6.2 — Indica-leaning effects
  const indicaEffects = ["relaxed", "relaxation", "calm", "sleepy", "sleepiness", "sedating", "sedation", "body", "pain relief", "hungry", "hunger", "appetite"];
  
  // Phase 7.6.2 — Sativa-leaning effects
  const sativaEffects = ["energy", "energetic", "creative", "creativity", "focused", "focus", "uplifted", "uplifting", "mood lift", "euphoric", "euphoria", "happy", "happiness"];
  
  effects.forEach((data, effectName) => {
    const nameLower = effectName.toLowerCase();
    let dominanceBoost = 0;
    
    // Phase 7.6.2 — Check if effect aligns with dominance
    const isIndicaEffect = indicaEffects.some(indica => nameLower.includes(indica));
    const isSativaEffect = sativaEffects.some(sativa => nameLower.includes(sativa));
    
    if (isIndicaDominant && isIndicaEffect) {
      // Indica-dominant + indica effect → boost
      dominanceBoost = 15;
      reasoning.push(`${effectName} reinforced by indica-dominant ratio`);
    } else if (isSativaDominant && isSativaEffect) {
      // Sativa-dominant + sativa effect → boost
      dominanceBoost = 15;
      reasoning.push(`${effectName} reinforced by sativa-dominant ratio`);
    } else if (isBalanced) {
      // Balanced hybrid → both effects possible, no boost/penalty
      dominanceBoost = 0;
    } else if ((isIndicaDominant && isSativaEffect) || (isSativaDominant && isIndicaEffect)) {
      // Contradiction → penalty
      dominanceBoost = -10;
      reasoning.push(`${effectName} contradicts dominance ratio (reduced confidence)`);
    }
    
    weightedEffects.set(effectName, {
      ...data,
      dominanceBoost,
    });
  });
  
  return {
    effects: weightedEffects,
    reasoning,
  };
}

/**
 * Phase 7.6 Step 7.6.3 — TERPENE EFFECT MODIFIERS
 * 
 * Apply terpene-driven nuance:
 * 
 * Myrcene → deeper body relaxation  
 * Limonene → mood lift / stress relief  
 * Pinene → alertness / focus  
 * Linalool → calm / anxiety relief  
 * Caryophyllene → grounding / body comfort  
 * 
 * Rules:
 * - Terpenes modify intensity, not category
 * - Conflicts add variance notes
 */
function applyTerpeneEffectModifiersV76(
  effects: Map<string, { frequency: number; totalConfidence: number; sources: string[]; dominanceBoost: number }>,
  terpeneProfile?: Array<{ name: string; likelihood: string }>
): {
  effects: Map<string, { frequency: number; totalConfidence: number; sources: string[]; dominanceBoost: number; terpeneBoost: number }>;
  reasoning: string[];
  hasConflicts: boolean;
} {
  if (!terpeneProfile || terpeneProfile.length === 0) {
    return {
      effects: new Map(Array.from(effects.entries()).map(([name, data]) => [name, { ...data, terpeneBoost: 0 }])),
      reasoning: [],
      hasConflicts: false,
    };
  }

  const modifiedEffects = new Map<string, { frequency: number; totalConfidence: number; sources: string[]; dominanceBoost: number; terpeneBoost: number }>();
  const reasoning: string[] = [];
  let hasConflicts = false;
  
  // Phase 7.6.3 — Terpene → effect mappings
  const terpeneEffectMap: Record<string, Array<{ effect: string; boost: number }>> = {
    myrcene: [
      { effect: "relaxed", boost: 10 },
      { effect: "relaxation", boost: 10 },
      { effect: "body", boost: 8 },
      { effect: "sleepy", boost: 5 },
    ],
    limonene: [
      { effect: "euphoric", boost: 10 },
      { effect: "euphoria", boost: 10 },
      { effect: "mood lift", boost: 8 },
      { effect: "happy", boost: 8 },
      { effect: "stress relief", boost: 5 },
    ],
    pinene: [
      { effect: "focused", boost: 10 },
      { effect: "focus", boost: 10 },
      { effect: "alertness", boost: 8 },
      { effect: "energetic", boost: 5 },
    ],
    linalool: [
      { effect: "calm", boost: 10 },
      { effect: "anxiety relief", boost: 8 },
      { effect: "relaxed", boost: 5 },
    ],
    caryophyllene: [
      { effect: "grounding", boost: 10 },
      { effect: "body comfort", boost: 8 },
      { effect: "pain relief", boost: 5 },
    ],
  };
  
  // Phase 7.6.3 — Apply terpene boosts
  terpeneProfile.forEach(terpene => {
    const terpeneName = terpene.name.toLowerCase();
    const likelihood = terpene.likelihood.toLowerCase();
    const likelihoodMultiplier = likelihood === "high" ? 1.0 : likelihood === "medium" ? 0.7 : 0.4;
    
    const effectMappings = terpeneEffectMap[terpeneName];
    if (effectMappings) {
      effectMappings.forEach(({ effect, boost }) => {
        // Find matching effects
        effects.forEach((data, effectName) => {
          const nameLower = effectName.toLowerCase();
          if (nameLower.includes(effect)) {
            const existing = modifiedEffects.get(effectName);
            const terpeneBoost = boost * likelihoodMultiplier;
            
            if (existing) {
              existing.terpeneBoost = Math.max(existing.terpeneBoost, terpeneBoost);
            } else {
              modifiedEffects.set(effectName, {
                ...data,
                terpeneBoost,
              });
            }
            
            reasoning.push(`${terpene.name} enhances ${effectName} intensity`);
          }
        });
      });
    }
  });
  
  // Phase 7.6.3 — Add all effects that weren't terpene-modified
  effects.forEach((data, name) => {
    if (!modifiedEffects.has(name)) {
      modifiedEffects.set(name, {
        ...data,
        terpeneBoost: 0,
      });
    }
  });
  
  return {
    effects: modifiedEffects,
    reasoning,
    hasConflicts,
  };
}

/**
 * Phase 7.6 Step 7.6.4 — MULTI-IMAGE CONSENSUS CHECK
 * 
 * Across images:
 * - Dense buds → reinforce body-heavy effects
 * - Airy / foxtailed → reinforce cerebral effects
 * - Mixed structure → widen effect range
 * 
 * More images:
 * - Tighten top 3 effects
 * - Push uncertain effects to secondary list
 */
function applyMultiImageConsensusCheckV76(
  effects: Map<string, { frequency: number; totalConfidence: number; sources: string[]; dominanceBoost: number; terpeneBoost: number }>,
  fusedFeatures?: FusedFeatures,
  imageCount: number = 1
): {
  effects: Map<string, { frequency: number; totalConfidence: number; sources: string[]; dominanceBoost: number; terpeneBoost: number; consensusScore: number }>;
  reasoning: string[];
} {
  const consensusEffects = new Map<string, { frequency: number; totalConfidence: number; sources: string[]; dominanceBoost: number; terpeneBoost: number; consensusScore: number }>();
  const reasoning: string[] = [];
  
  // Phase 7.6.4 — Visual structure signals
  let bodyHeavyBoost = 0;
  let cerebralBoost = 0;
  
  if (fusedFeatures) {
    if (fusedFeatures.budStructure === "high") {
      // Dense buds → reinforce body-heavy effects
      bodyHeavyBoost = 8;
      reasoning.push("Dense bud structure reinforces body-heavy effects");
    } else if (fusedFeatures.budStructure === "low") {
      // Airy / foxtailed → reinforce cerebral effects
      cerebralBoost = 8;
      reasoning.push("Airy structure reinforces cerebral effects");
    }
  }
  
  // Phase 7.6.4 — Calculate consensus scores
  effects.forEach((data, effectName) => {
    const nameLower = effectName.toLowerCase();
    
    // Phase 7.6.4 — Apply visual boosts
    let visualBoost = 0;
    const bodyEffects = ["relaxed", "relaxation", "body", "sleepy", "calm", "sedating"];
    const cerebralEffects = ["focused", "focus", "energetic", "creative", "uplifted", "euphoric"];
    
    if (bodyEffects.some(e => nameLower.includes(e))) {
      visualBoost = bodyHeavyBoost;
    } else if (cerebralEffects.some(e => nameLower.includes(e))) {
      visualBoost = cerebralBoost;
    }
    
    // Phase 7.6.4 — Calculate final consensus score
    const consensusScore = data.totalConfidence + data.dominanceBoost + data.terpeneBoost + visualBoost;
    
    consensusEffects.set(effectName, {
      ...data,
      consensusScore: Math.max(0, Math.min(100, consensusScore)),
    });
  });
  
  // Phase 7.6.4 — More images tighten top 3 effects
  if (imageCount >= 3) {
    reasoning.push(`Multiple images (${imageCount}) tightened top 3 effects`);
  } else if (imageCount === 2) {
    reasoning.push(`Two images improved effect clarity`);
  }
  
  return {
    effects: consensusEffects,
    reasoning,
  };
}

/**
 * Phase 7.6 Step 7.6.5 — USE-CASE MAPPING
 * 
 * Map effects → real-world use cases:
 * 
 * Examples:
 * - Evening relaxation
 * - Creative sessions
 * - Social use
 * - Stress relief
 * - Focused daytime use
 * - Wind-down before sleep
 * 
 * Rules:
 * - Use cases must be explainable
 * - No medical claims
 * - 3–5 use cases max
 */
function mapUseCasesV76(
  primaryEffects: EffectEntryV76[],
  secondaryEffects: EffectEntryV76[],
  indicaPercent: number
): UseCaseEntryV76[] {
  const useCases: UseCaseEntryV76[] = [];
  const allEffects = [...primaryEffects, ...secondaryEffects];
  const effectNames = allEffects.map(e => e.name.toLowerCase());
  
  // Phase 7.6.5 — Evening relaxation
  if (effectNames.some(e => e.includes("relax") || e.includes("calm") || e.includes("body"))) {
    useCases.push({
      title: "Evening relaxation",
      description: "Suitable for unwinding after a long day",
      reasoning: ["Body relaxation and calm effects support evening use"],
    });
  }
  
  // Phase 7.6.5 — Creative sessions
  if (effectNames.some(e => e.includes("creative") || e.includes("focused") || e.includes("uplifted"))) {
    useCases.push({
      title: "Creative sessions",
      description: "May enhance creative thinking and focus",
      reasoning: ["Creative and focused effects support artistic activities"],
    });
  }
  
  // Phase 7.6.5 — Social use
  if (effectNames.some(e => e.includes("euphoric") || e.includes("happy") || e.includes("uplifted"))) {
    useCases.push({
      title: "Social use",
      description: "May enhance mood and social interactions",
      reasoning: ["Euphoric and uplifting effects support social settings"],
    });
  }
  
  // Phase 7.6.5 — Stress relief
  if (effectNames.some(e => e.includes("calm") || e.includes("relax") || e.includes("stress"))) {
    useCases.push({
      title: "Stress relief",
      description: "May help with relaxation and stress management",
      reasoning: ["Calm and relaxation effects support stress relief"],
    });
  }
  
  // Phase 7.6.5 — Focused daytime use
  if (effectNames.some(e => e.includes("focused") || e.includes("energetic") || e.includes("alert"))) {
    useCases.push({
      title: "Focused daytime use",
      description: "Suitable for daytime activities requiring focus",
      reasoning: ["Focus and energy effects support daytime use"],
    });
  }
  
  // Phase 7.6.5 — Wind-down before sleep
  if (indicaPercent > 60 && effectNames.some(e => e.includes("sleepy") || e.includes("sedating") || e.includes("relax"))) {
    useCases.push({
      title: "Wind-down before sleep",
      description: "May support relaxation before bedtime",
      reasoning: ["Indica-dominant profile with sedating effects supports evening use"],
    });
  }
  
  // Phase 7.6.5 — Limit to 3-5 use cases
  return useCases.slice(0, 5);
}

/**
 * Phase 7.6 Step 7.6.6 — OUTPUT FORMAT
 * 
 * EFFECTS:
 * Primary:
 * • Relaxed
 * • Euphoric
 * • Calm
 * 
 * Secondary:
 * • Focused
 * • Hungry
 * 
 * BEST FOR:
 * • Evening relaxation
 * • Stress relief
 * • Light social use
 */
function formatOutputV76(
  effects: Map<string, { frequency: number; totalConfidence: number; sources: string[]; dominanceBoost: number; terpeneBoost: number; consensusScore: number }>,
  imageCount: number = 1
): {
  primaryEffects: EffectEntryV76[];
  secondaryEffects: EffectEntryV76[];
} {
  // Phase 7.6.6 — Sort effects by consensus score
  const sortedEffects = Array.from(effects.entries())
    .sort((a, b) => b[1].consensusScore - a[1].consensusScore);
  
  // Phase 7.6.6 — Map consensus score to intensity
  const mapToIntensity = (score: number): "high" | "medium" | "low" => {
    if (score >= 70) {
      return "high";
    } else if (score >= 50) {
      return "medium";
    } else {
      return "low";
    }
  };
  
  // Phase 7.6.6 — Separate primary and secondary effects
  const primaryEffects: EffectEntryV76[] = [];
  const secondaryEffects: EffectEntryV76[] = [];
  
  // Phase 7.6.6 — More images tighten top 3 effects
  const primaryCount = imageCount >= 3 ? 3 : imageCount === 2 ? 4 : 5;
  
  sortedEffects.forEach(([name, data], index) => {
    const intensity = mapToIntensity(data.consensusScore);
    const effect: EffectEntryV76 = {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      category: index < primaryCount ? "primary" : "secondary",
      intensity,
      reasoning: data.sources,
    };
    
    if (index < primaryCount) {
      primaryEffects.push(effect);
    } else if (data.consensusScore >= 30) {
      secondaryEffects.push(effect);
    }
  });
  
  return {
    primaryEffects,
    secondaryEffects,
  };
}

/**
 * Phase 7.6 Step 7.6.7 — VARIANCE DISCLOSURE
 * 
 * Always include:
 * - "Effects vary by individual tolerance and phenotype"
 * - "Based on observed traits and reference data"
 */
function generateVarianceDisclosureV76(): string[] {
  return [
    "Effects vary by individual tolerance and phenotype",
    "Based on observed traits and reference data",
  ];
}

/**
 * Phase 7.6 — MAIN FUNCTION
 */
export function generateEffectProfileUseCaseV76(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: Array<{ name: string; likelihood: string }>,
  candidateStrains?: Array<{ name: string; confidence: number }>,
  indicaPercent?: number,
  sativaPercent?: number
): EffectProfileUseCaseV76 {
  // Phase 7.6.1 — GENETIC EFFECT BASELINE
  const geneticBaseline = getGeneticEffectBaselineV76(strainName, dbEntry, candidateStrains);
  
  if (geneticBaseline.effects.size === 0) {
    // Failsafe: Return default profile
    return {
      primaryEffects: [],
      secondaryEffects: [],
      useCases: [],
      varianceDisclosure: generateVarianceDisclosureV76(),
      explanation: ["No strain identified. Cannot determine effect profile."],
      confidence: "low",
      confidenceLabel: "Low: no genetic data available",
      source: "default",
    };
  }

  // Phase 7.6.2 — DOMINANCE-ALIGNED WEIGHTING
  const dominanceWeighting = applyDominanceAlignedWeightingV76(
    geneticBaseline.effects,
    indicaPercent || 50,
    sativaPercent || 50
  );

  // Phase 7.6.3 — TERPENE EFFECT MODIFIERS
  const terpeneModifiers = applyTerpeneEffectModifiersV76(
    dominanceWeighting.effects,
    terpeneProfile
  );

  // Phase 7.6.4 — MULTI-IMAGE CONSENSUS CHECK
  const consensusCheck = applyMultiImageConsensusCheckV76(
    terpeneModifiers.effects,
    fusedFeatures,
    imageCount
  );

  // Phase 7.6.6 — OUTPUT FORMAT
  const output = formatOutputV76(consensusCheck.effects, imageCount);

  // Phase 7.6.5 — USE-CASE MAPPING
  const useCases = mapUseCasesV76(output.primaryEffects, output.secondaryEffects, indicaPercent || 50);

  // Phase 7.6.7 — VARIANCE DISCLOSURE
  const varianceDisclosure = generateVarianceDisclosureV76();

  // Phase 7.6.7 — Build explanation
  const explanation: string[] = [
    ...geneticBaseline.reasoning,
    ...dominanceWeighting.reasoning,
    ...terpeneModifiers.reasoning,
    ...consensusCheck.reasoning,
  ];

  // Phase 7.6.7 — Determine confidence
  let confidence: "very_high" | "high" | "medium" | "low";
  let confidenceLabel: string;
  
  if (terpeneModifiers.hasConflicts) {
    confidence = "low";
    confidenceLabel = "Low: conflicting signals detected";
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

  // Phase 7.6.7 — Determine source
  let source: EffectProfileUseCaseV76["source"];
  if (terpeneModifiers.hasConflicts && consensusCheck.reasoning.length > 0 && geneticBaseline.source !== "default") {
    source = "database_visual_terpene_consensus";
  } else if (terpeneModifiers.reasoning.length > 0 && consensusCheck.reasoning.length > 0 && geneticBaseline.source !== "default") {
    source = "database_visual_terpene";
  } else if (consensusCheck.reasoning.length > 0 && geneticBaseline.source !== "default") {
    source = "database_visual";
  } else if (geneticBaseline.source === "database_blended") {
    source = "database_blended";
  } else if (geneticBaseline.source === "database_primary") {
    source = "database_primary";
  } else {
    source = "inferred_visual";
  }

  return {
    primaryEffects: output.primaryEffects,
    secondaryEffects: output.secondaryEffects,
    useCases,
    varianceDisclosure,
    explanation,
    confidence,
    confidenceLabel,
    source,
  };
}
