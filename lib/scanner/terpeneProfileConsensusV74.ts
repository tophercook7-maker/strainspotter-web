// lib/scanner/terpeneProfileConsensusV74.ts
// Phase 7.4 — Terpene Profile Consensus Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 7.4 — Terpene Entry (with likelihood tier)
 */
export type TerpeneEntryV74 = {
  name: string;
  likelihood: "High" | "Medium" | "Medium-Low" | "Low" | "Possible";
  confidence: number; // 0-100 (internal, not shown to user)
  interpretation: string; // Short interpretation (e.g., "earthy, relaxing")
  reasoning: string[]; // Why this terpene was included
  isTrace?: boolean; // True if flagged as "possible trace terpene"
};

/**
 * Phase 7.4 — Profile Result
 */
export type TerpeneProfileConsensusV74 = {
  dominantTerpenes: TerpeneEntryV74[]; // Top 3-5 terpenes
  traceTerpenes?: TerpeneEntryV74[]; // Optional trace terpenes (collapsed)
  confidence: "very_high" | "high" | "medium" | "low";
  confidenceLabel: string;
  explanation: string[]; // Why this profile was chosen
  source: "database_primary" | "database_blended" | "database_visual" | "database_visual_consensus" | "inferred_visual" | "default";
};

/**
 * Phase 7.4 Step 7.4.1 — GENETIC TERPENE BASE
 * 
 * If strain identified or closely matched:
 * - Pull dominant terpenes from strain DB
 * - Use top 3–5 candidate strains
 * - Weight by:
 *   • Match confidence
 *   • Frequency across candidates
 */
function getGeneticTerpeneBaseV74(
  strainName: string,
  dbEntry?: CultivarReference,
  candidateStrains?: Array<{ name: string; confidence: number }>
): {
  terpenes: Map<string, { frequency: number; totalConfidence: number; sources: string[] }>;
  reasoning: string[];
  source: "database_primary" | "database_blended" | "default";
} {
  const terpeneMap = new Map<string, { frequency: number; totalConfidence: number; sources: string[] }>();
  const reasoning: string[] = [];
  
  // Phase 7.4.1 — If strain identified, pull from database
  if (dbEntry) {
    const dbTerpenes = dbEntry.terpeneProfile || dbEntry.commonTerpenes || [];
    
    dbTerpenes.forEach((terpene, index) => {
      const normalized = terpene.toLowerCase();
      const positionWeight = 1.0 - (index * 0.1); // First terpene gets full weight
      const confidence = 90 * positionWeight; // High confidence for database terpenes
      
      const existing = terpeneMap.get(normalized);
      if (existing) {
        existing.frequency++;
        existing.totalConfidence = Math.max(existing.totalConfidence, confidence);
        existing.sources.push("Strain database");
      } else {
        terpeneMap.set(normalized, {
          frequency: 1,
          totalConfidence: confidence,
          sources: ["Strain database"],
        });
      }
    });
    
    reasoning.push(`Terpene profile from strain database: ${dbTerpenes.slice(0, 5).join(", ")}`);
    
    return {
      terpenes: terpeneMap,
      reasoning,
      source: "database_primary",
    };
  }
  
  // Phase 7.4.1 — If strain is a close match, blend from top 3–5 candidate strains
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
        const candidateTerpenes = candidateDb.terpeneProfile || candidateDb.commonTerpenes || [];
        
        candidateTerpenes.forEach((terpene, terpeneIndex) => {
          const normalized = terpene.toLowerCase();
          const positionWeight = 1.0 - (terpeneIndex * 0.1);
          const weightedConfidence = candidate.confidence * positionWeight * weight;
          
          const existing = terpeneMap.get(normalized);
          if (existing) {
            existing.frequency++;
            existing.totalConfidence += weightedConfidence;
            existing.sources.push(`Candidate: ${candidate.name}`);
          } else {
            terpeneMap.set(normalized, {
              frequency: 1,
              totalConfidence: weightedConfidence,
              sources: [`Candidate: ${candidate.name}`],
            });
          }
        });
      }
    });
    
    reasoning.push(`Terpene profile blended from top ${topCandidates.length} candidate strains (weighted by match confidence and frequency)`);
    
    return {
      terpenes: terpeneMap,
      reasoning,
      source: "database_blended",
    };
  }
  
  // Phase 7.4.1 — Default: empty profile
  return {
    terpenes: terpeneMap,
    reasoning: ["No strain identified. Cannot determine terpene profile from genetics."],
    source: "default",
  };
}

/**
 * Phase 7.4 Step 7.4.2 — VISUAL TERPENE SIGNALS (SOFT)
 * 
 * Use visuals as *supporting signals only*:
 * 
 * Visual cue → possible terpene hint:
 * - Heavy frost / resin → Myrcene, Caryophyllene
 * - Bright green / citrus hues → Limonene
 * - Sharp leaf edges / piney look → Pinene
 * - Purple hues → Linalool (light weight only)
 * 
 * Rules:
 * - Visuals can boost or reduce likelihood
 * - Visuals NEVER introduce a terpene alone
 * - Max ±15% influence
 */
function applyVisualTerpeneSignalsV74(
  terpenes: Map<string, { frequency: number; totalConfidence: number; sources: string[] }>,
  fusedFeatures?: FusedFeatures
): {
  terpenes: Map<string, { frequency: number; totalConfidence: number; sources: string[]; visualBoost: number }>;
  reasoning: string[];
} {
  if (!fusedFeatures) {
    return {
      terpenes: new Map(Array.from(terpenes.entries()).map(([name, data]) => [name, { ...data, visualBoost: 0 }])),
      reasoning: [],
    };
  }

  const reasoning: string[] = [];
  const modulatedTerpenes = new Map<string, { frequency: number; totalConfidence: number; sources: string[]; visualBoost: number }>();
  
  // Phase 7.4.2 — Heavy frost / resin → Myrcene, Caryophyllene
  if (fusedFeatures.trichomeDensity === "high") {
    const myrcene = terpenes.get("myrcene");
    const caryophyllene = terpenes.get("caryophyllene");
    
    if (myrcene) {
      modulatedTerpenes.set("myrcene", {
        ...myrcene,
        visualBoost: 0.12, // +12% boost
      });
      reasoning.push("Heavy frost suggests elevated myrcene levels");
    }
    
    if (caryophyllene) {
      modulatedTerpenes.set("caryophyllene", {
        ...caryophyllene,
        visualBoost: 0.10, // +10% boost
      });
      reasoning.push("Heavy resin coverage often indicates caryophyllene presence");
    }
  }
  
  // Phase 7.4.2 — Bright green / citrus hues → Limonene
  const colorProfile = fusedFeatures.colorProfile?.toLowerCase() || "";
  if (colorProfile.includes("green") || colorProfile.includes("citrus") || colorProfile.includes("bright")) {
    const limonene = terpenes.get("limonene");
    if (limonene) {
      modulatedTerpenes.set("limonene", {
        ...limonene,
        visualBoost: 0.08, // +8% boost
      });
      reasoning.push("Bright green/citrus hues suggest limonene presence");
    }
  }
  
  // Phase 7.4.2 — Sharp leaf edges / piney look → Pinene
  if (fusedFeatures.leafShape === "narrow" || colorProfile.includes("pine") || colorProfile.includes("sharp")) {
    const pinene = terpenes.get("pinene");
    if (pinene) {
      modulatedTerpenes.set("pinene", {
        ...pinene,
        visualBoost: 0.10, // +10% boost
      });
      reasoning.push("Sharp leaf edges/piney appearance suggests pinene");
    }
  }
  
  // Phase 7.4.2 — Purple hues → Linalool (light weight only)
  if (colorProfile.includes("purple") || colorProfile.includes("violet")) {
    const linalool = terpenes.get("linalool");
    if (linalool) {
      modulatedTerpenes.set("linalool", {
        ...linalool,
        visualBoost: 0.05, // +5% boost (light weight)
      });
      reasoning.push("Purple coloration may indicate linalool (light weight)");
    }
  }
  
  // Phase 7.4.2 — Add all terpenes that weren't visually modulated (with 0 boost)
  terpenes.forEach((data, name) => {
    if (!modulatedTerpenes.has(name)) {
      modulatedTerpenes.set(name, {
        ...data,
        visualBoost: 0,
      });
    }
  });
  
  // Phase 7.4.2 — Cap visual boosts at ±15%
  modulatedTerpenes.forEach((data, name) => {
    if (data.visualBoost > 0.15) {
      data.visualBoost = 0.15;
    } else if (data.visualBoost < -0.15) {
      data.visualBoost = -0.15;
    }
  });
  
  return {
    terpenes: modulatedTerpenes,
    reasoning,
  };
}

/**
 * Phase 7.4 Step 7.4.3 — MULTI-IMAGE STABILITY
 * 
 * Across images:
 * - Terpenes seen consistently → boosted
 * - Conflicting signals → widened confidence band
 * - One-off terpene → flagged as "possible"
 */
function applyMultiImageStabilityV74(
  terpenes: Map<string, { frequency: number; totalConfidence: number; sources: string[]; visualBoost: number }>,
  imageResults?: ImageResult[],
  imageCount: number = 1
): {
  terpenes: Map<string, { frequency: number; totalConfidence: number; sources: string[]; visualBoost: number; consensusScore: number; isOneOff: boolean }>;
  hasConflictingSignals: boolean;
  reasoning: string[];
} {
  if (!imageResults || imageResults.length <= 1) {
    return {
      terpenes: new Map(Array.from(terpenes.entries()).map(([name, data]) => [
        name,
        { ...data, consensusScore: data.totalConfidence, isOneOff: false },
      ])),
      hasConflictingSignals: false,
      reasoning: [],
    };
  }

  // Phase 7.4.3 — Collect terpene mentions from each image
  const terpeneMentions = new Map<string, number[]>();
  
  imageResults.forEach(result => {
    const wikiTerpenes = result.wikiResult?.terpenes || [];
    wikiTerpenes.forEach(terpene => {
      const normalized = terpene.toLowerCase();
      const existing = terpeneMentions.get(normalized);
      if (existing) {
        existing.push(result.candidateStrains[0]?.confidence || 70);
      } else {
        terpeneMentions.set(normalized, [result.candidateStrains[0]?.confidence || 70]);
      }
    });
  });

  // Phase 7.4.3 — Calculate consensus scores
  const stabilizedTerpenes = new Map<string, { frequency: number; totalConfidence: number; sources: string[]; visualBoost: number; consensusScore: number; isOneOff: boolean }>();
  let hasConflictingSignals = false;
  
  terpenes.forEach((data, name) => {
    const mentions = terpeneMentions.get(name);
    const mentionCount = mentions ? mentions.length : 0;
    
    // Phase 7.4.3 — Terpenes seen consistently → boosted
    let consensusBoost = 0;
    if (mentionCount >= 2) {
      // Seen in 2+ images → boost
      const avgConfidence = mentions ? mentions.reduce((sum, c) => sum + c, 0) / mentions.length : 0;
      consensusBoost = avgConfidence * 0.1; // +10% of average confidence
    } else if (mentionCount === 1) {
      // One-off terpene → flagged as "possible"
      consensusBoost = -5; // Small penalty
    }
    
    // Phase 7.4.3 — Blend genetic base (70%) with image consensus (30%)
    const baseScore = data.totalConfidence;
    const imageScore = mentionCount > 0 && mentions
      ? mentions.reduce((sum, c) => sum + c, 0) / mentions.length
      : 0;
    const consensusScore = (baseScore * 0.7) + (imageScore * 0.3) + consensusBoost;
    
    // Phase 7.4.3 — Detect conflicting signals
    if (mentionCount > 0 && mentionCount < imageCount * 0.5) {
      // Terpene mentioned in less than 50% of images → potential conflict
      hasConflictingSignals = true;
    }
    
    stabilizedTerpenes.set(name, {
      ...data,
      consensusScore: Math.max(0, Math.min(100, consensusScore)),
      isOneOff: mentionCount === 1,
    });
  });
  
  const reasoning: string[] = [];
  if (hasConflictingSignals) {
    reasoning.push(`Conflicting terpene signals detected across ${imageCount} images. Confidence band widened.`);
  } else if (imageCount >= 3) {
    reasoning.push(`Consistent terpene signals across ${imageCount} images. Profile stabilized.`);
  }
  
  return {
    terpenes: stabilizedTerpenes,
    hasConflictingSignals,
    reasoning,
  };
}

/**
 * Phase 7.4 Step 7.4.4 — OUTPUT FORMAT
 * 
 * Display as:
 * 
 * DOMINANT TERPENES:
 * 1. Myrcene — High
 * 2. Caryophyllene — Medium
 * 3. Limonene — Medium-Low
 * 
 * Optional:
 * - "Possible trace terpenes" (collapsed)
 */
function formatOutputV74(
  terpenes: Map<string, { frequency: number; totalConfidence: number; sources: string[]; visualBoost: number; consensusScore: number; isOneOff: boolean }>
): {
  dominantTerpenes: TerpeneEntryV74[];
  traceTerpenes?: TerpeneEntryV74[];
} {
  // Phase 7.4.4 — Sort terpenes by consensus score
  const sortedTerpenes = Array.from(terpenes.entries())
    .sort((a, b) => b[1].consensusScore - a[1].consensusScore);
  
  // Phase 7.4.4 — Map consensus score to likelihood tier
  const mapToLikelihood = (score: number, isOneOff: boolean): "High" | "Medium" | "Medium-Low" | "Low" | "Possible" => {
    if (isOneOff) {
      return "Possible";
    }
    if (score >= 70) {
      return "High";
    } else if (score >= 50) {
      return "Medium";
    } else if (score >= 30) {
      return "Medium-Low";
    } else if (score >= 15) {
      return "Low";
    } else {
      return "Possible";
    }
  };
  
  // Phase 7.4.4 — Separate dominant and trace terpenes
  const dominantTerpenes: TerpeneEntryV74[] = [];
  const traceTerpenes: TerpeneEntryV74[] = [];
  
  sortedTerpenes.forEach(([name, data]) => {
    const likelihood = mapToLikelihood(data.consensusScore, data.isOneOff);
    const interpretation = getTerpeneInterpretation(name);
    
    const entry: TerpeneEntryV74 = {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      likelihood,
      confidence: Math.round(data.consensusScore),
      interpretation,
      reasoning: data.sources,
    };
    
    if (likelihood === "Possible" || data.consensusScore < 20) {
      entry.isTrace = true;
      traceTerpenes.push(entry);
    } else {
      dominantTerpenes.push(entry);
    }
  });
  
  // Phase 7.4.4 — Limit dominant terpenes to top 5
  const topDominant = dominantTerpenes.slice(0, 5);
  
  return {
    dominantTerpenes: topDominant,
    traceTerpenes: traceTerpenes.length > 0 ? traceTerpenes : undefined,
  };
}

/**
 * Phase 7.4 Step 7.4.5 — USER MEANING LAYER
 * 
 * Attach short interpretations:
 * - Myrcene → earthy, relaxing
 * - Limonene → citrus, uplifting
 * - Caryophyllene → spicy, grounding
 * 
 * No lab-grade claims.
 * No percentages shown (tiers only).
 */
function getTerpeneInterpretation(terpeneName: string): string {
  const normalized = terpeneName.toLowerCase();
  
  const interpretations: Record<string, string> = {
    myrcene: "earthy, relaxing",
    limonene: "citrus, uplifting",
    caryophyllene: "spicy, grounding",
    pinene: "piney, energizing",
    linalool: "floral, calming",
    terpinolene: "herbal, fresh",
    humulene: "hoppy, earthy",
    ocimene: "sweet, herbal",
    bisabolol: "floral, soothing",
    nerolidol: "woody, floral",
  };
  
  return interpretations[normalized] || "aromatic";
}

/**
 * Phase 7.4 — MAIN FUNCTION
 */
export function generateTerpeneProfileConsensusV74(
  strainName: string,
  dbEntry?: CultivarReference,
  imageResults?: ImageResult[],
  imageCount: number = 1,
  fusedFeatures?: FusedFeatures,
  candidateStrains?: Array<{ name: string; confidence: number }>
): TerpeneProfileConsensusV74 {
  // Phase 7.4.1 — GENETIC TERPENE BASE
  const geneticBase = getGeneticTerpeneBaseV74(strainName, dbEntry, candidateStrains);
  
  if (geneticBase.terpenes.size === 0) {
    // Failsafe: Return empty profile
    return {
      dominantTerpenes: [],
      confidence: "low",
      confidenceLabel: "Low: no genetic data available",
      explanation: ["No strain identified. Cannot determine terpene profile."],
      source: "default",
    };
  }

  // Phase 7.4.2 — VISUAL TERPENE SIGNALS (SOFT)
  const visualSignals = applyVisualTerpeneSignalsV74(geneticBase.terpenes, fusedFeatures);

  // Phase 7.4.3 — MULTI-IMAGE STABILITY
  const stability = applyMultiImageStabilityV74(visualSignals.terpenes, imageResults, imageCount);

  // Phase 7.4.4 — OUTPUT FORMAT
  const output = formatOutputV74(stability.terpenes);

  // Phase 7.4.5 — Determine confidence
  let confidence: "very_high" | "high" | "medium" | "low";
  let confidenceLabel: string;
  
  if (stability.hasConflictingSignals) {
    confidence = "low";
    confidenceLabel = "Low: conflicting signals detected";
  } else if (geneticBase.source === "database_primary" && imageCount >= 3) {
    confidence = "very_high";
    confidenceLabel = "Very High: known strain + ≥3 images";
  } else if (geneticBase.source === "database_primary" && imageCount >= 1) {
    confidence = "high";
    confidenceLabel = "High: known strain + 1–2 images";
  } else if (geneticBase.source === "database_blended") {
    confidence = "medium";
    confidenceLabel = "Medium: blended from candidate strains";
  } else {
    confidence = "low";
    confidenceLabel = "Low: estimated from visual cues";
  }

  // Phase 7.4.5 — Build explanation
  const explanation: string[] = [
    ...geneticBase.reasoning,
    ...visualSignals.reasoning,
    ...stability.reasoning,
  ];

  // Phase 7.4.5 — Determine source
  let source: TerpeneProfileConsensusV74["source"];
  if (stability.hasConflictingSignals && visualSignals.reasoning.length > 0 && geneticBase.source !== "default") {
    source = "database_visual_consensus";
  } else if (visualSignals.reasoning.length > 0 && geneticBase.source !== "default") {
    source = "database_visual";
  } else if (geneticBase.source === "database_blended") {
    source = "database_blended";
  } else if (geneticBase.source === "database_primary") {
    source = "database_primary";
  } else {
    source = "inferred_visual";
  }

  return {
    dominantTerpenes: output.dominantTerpenes,
    traceTerpenes: output.traceTerpenes,
    confidence,
    confidenceLabel,
    explanation,
    source,
  };
}
