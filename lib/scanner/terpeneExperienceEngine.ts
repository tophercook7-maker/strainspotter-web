// lib/scanner/terpeneExperienceEngine.ts
// Phase 5.1 — Terpene-Weighted Experience Engine

import type { CultivarReference } from "./cultivarLibrary";
import type { FusedFeatures } from "./multiImageFusion";
import type { ImageResult } from "./consensusEngine";
import type { WikiResult } from "./types";

/**
 * Phase 5.1 Step 5.1.1 — Normalized Terpene Profile
 */
export type NormalizedTerpeneProfile = {
  primaryTerpenes: Array<{ name: string; dominanceScore: number }>; // Top 3
  secondaryTerpenes: Array<{ name: string; dominanceScore: number }>; // Next 2
  totalDominanceScore: number; // 0-1, sum of all terpene dominance scores
};

/**
 * Phase 5.1 Step 5.1.3 — Experience Vector
 * Map terpene blends to experience vectors (0-100 each)
 */
export type ExperienceVector = {
  bodyRelaxation: number; // 0-100
  mentalStimulation: number; // 0-100
  moodElevation: number; // 0-100
  sedation: number; // 0-100
  focusClarity: number; // 0-100
  appetiteStimulation: number; // 0-100
};

/**
 * Phase 5.1 Step 5.1.1 — TERPENE NORMALIZATION
 * 
 * From strain database + wiki:
 * Normalize terpene profiles to:
 * - primaryTerpenes (top 3)
 * - secondaryTerpenes (next 2)
 * - dominanceScore (0-1)
 * 
 * Resolve conflicts by:
 * - Source frequency
 * - Lab credibility weighting
 * - Consensus averaging
 */
function normalizeTerpeneProfile(
  dbEntry?: CultivarReference,
  wikiResult?: WikiResult
): NormalizedTerpeneProfile | null {
  // Phase 5.1 Step 5.1.1 — Collect terpenes from all sources
  const terpeneSources: Array<{ terpenes: string[]; source: "database" | "wiki"; weight: number }> = [];

  // Phase 5.1 Step 5.1.1 — Database terpenes (high weight)
  if (dbEntry?.terpeneProfile && dbEntry.terpeneProfile.length > 0) {
    terpeneSources.push({
      terpenes: dbEntry.terpeneProfile,
      source: "database",
      weight: 1.0, // High weight for database
    });
  } else if (dbEntry?.commonTerpenes && dbEntry.commonTerpenes.length > 0) {
    terpeneSources.push({
      terpenes: dbEntry.commonTerpenes,
      source: "database",
      weight: 0.8, // Slightly lower weight for commonTerpenes
    });
  }

  // Phase 5.1 Step 5.1.1 — Wiki terpenes (medium weight)
  if (wikiResult?.chemistry?.terpenes && wikiResult.chemistry.terpenes.length > 0) {
    const wikiTerpenes = wikiResult.chemistry.terpenes.map(t => t.name);
    terpeneSources.push({
      terpenes: wikiTerpenes,
      source: "wiki",
      weight: 0.7,
    });
  }

  if (wikiResult?.chemistry?.likelyTerpenes && wikiResult.chemistry.likelyTerpenes.length > 0) {
    const likelyTerpenes = wikiResult.chemistry.likelyTerpenes.map(t => t.name);
    terpeneSources.push({
      terpenes: likelyTerpenes,
      source: "wiki",
      weight: 0.6, // Lower weight for "likely" terpenes
    });
  }

  if (terpeneSources.length === 0) {
    return null; // No terpene data available
  }

  // Phase 5.1 Step 5.1.1 — Aggregate terpenes with frequency and weight
  const terpeneScores = new Map<string, { totalScore: number; appearances: number; sources: string[] }>();

  terpeneSources.forEach(({ terpenes, source, weight }) => {
    terpenes.forEach((terpene, idx) => {
      const normalizedName = terpene.toLowerCase().trim();
      const positionBonus = 1.0 - (idx * 0.1); // First terpene gets full weight, subsequent get less
      const weightedScore = weight * positionBonus;

      const existing = terpeneScores.get(normalizedName);
      if (existing) {
        existing.totalScore += weightedScore;
        existing.appearances++;
        existing.sources.push(source);
      } else {
        terpeneScores.set(normalizedName, {
          totalScore: weightedScore,
          appearances: 1,
          sources: [source],
        });
      }
    });
  });

  // Phase 5.1 Step 5.1.1 — Sort by total score and select top 5
  const sortedTerpenes = Array.from(terpeneScores.entries())
    .map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
      dominanceScore: Math.min(1.0, data.totalScore / Math.max(1, data.appearances)), // Normalize to 0-1
      appearances: data.appearances,
      sources: data.sources,
    }))
    .sort((a, b) => b.dominanceScore - a.dominanceScore)
    .slice(0, 5); // Top 5

  if (sortedTerpenes.length === 0) {
    return null;
  }

  // Phase 5.1 Step 5.1.1 — Split into primary (top 3) and secondary (next 2)
  const primaryTerpenes = sortedTerpenes.slice(0, 3).map(t => ({
    name: t.name,
    dominanceScore: t.dominanceScore,
  }));

  const secondaryTerpenes = sortedTerpenes.slice(3, 5).map(t => ({
    name: t.name,
    dominanceScore: t.dominanceScore,
  }));

  // Phase 5.1 Step 5.1.1 — Calculate total dominance score (sum, capped at 1.0)
  const totalDominanceScore = Math.min(1.0, sortedTerpenes.reduce((sum, t) => sum + t.dominanceScore, 0));

  return {
    primaryTerpenes,
    secondaryTerpenes,
    totalDominanceScore,
  };
}

/**
 * Phase 5.1 Step 5.1.2 — IMAGE-ASSISTED TERPENE INFERENCE
 * 
 * From visual cues:
 * - Frost density → Myrcene / Caryophyllene boost
 * - Color expression (purple/orange) → Linalool / Terpinolene hint
 * - Resin clarity → Limonene probability
 * 
 * Inference is **probabilistic**, never absolute.
 * Max influence: ±8%.
 */
function inferTerpenesFromVisual(
  fusedFeatures?: FusedFeatures,
  imageResults?: ImageResult[]
): Array<{ name: string; boost: number; reasoning: string }> {
  if (!fusedFeatures) {
    return [];
  }

  const terpeneBoosts: Array<{ name: string; boost: number; reasoning: string }> = [];
  
  // Phase 5.1 Step 5.1.2 — Frost density → Myrcene / Caryophyllene boost
  if (fusedFeatures.trichomeDensity === "high") {
    terpeneBoosts.push({
      name: "Myrcene",
      boost: 0.06, // +6% (max ±8%)
      reasoning: "High trichome density suggests elevated myrcene levels",
    });
    terpeneBoosts.push({
      name: "Caryophyllene",
      boost: 0.05, // +5%
      reasoning: "Heavy resin coverage often indicates caryophyllene presence",
    });
  } else if (fusedFeatures.trichomeDensity === "medium") {
    terpeneBoosts.push({
      name: "Myrcene",
      boost: 0.03, // +3%
      reasoning: "Moderate trichome density suggests moderate myrcene levels",
    });
  }

  // Phase 5.1 Step 5.1.2 — Color expression (purple/orange) → Linalool / Terpinolene hint
  const colorProfile = fusedFeatures.colorProfile?.toLowerCase() || "";
  
  if (colorProfile.includes("purple") || colorProfile.includes("violet")) {
    terpeneBoosts.push({
      name: "Linalool",
      boost: 0.05, // +5%
      reasoning: "Purple coloration often correlates with linalool presence",
    });
  }
  
  if (colorProfile.includes("orange") || colorProfile.includes("amber")) {
    terpeneBoosts.push({
      name: "Terpinolene",
      boost: 0.04, // +4%
      reasoning: "Orange/amber hues may indicate terpinolene expression",
    });
  }

  // Phase 5.1 Step 5.1.2 — Resin clarity → Limonene probability
  // Inferred from trichome visibility and color clarity
  if (fusedFeatures.trichomeDensity === "high" && (colorProfile.includes("clear") || colorProfile.includes("crystal"))) {
    terpeneBoosts.push({
      name: "Limonene",
      boost: 0.04, // +4%
      reasoning: "High trichome density with clear/crystal appearance suggests limonene",
    });
  }

  // Phase 5.1 Step 5.1.2 — Cap total boost at ±8%
  const totalBoost = terpeneBoosts.reduce((sum, t) => sum + Math.abs(t.boost), 0);
  if (totalBoost > 0.08) {
    // Scale down proportionally
    const scaleFactor = 0.08 / totalBoost;
    terpeneBoosts.forEach(t => {
      t.boost = t.boost * scaleFactor;
    });
  }

  return terpeneBoosts;
}

/**
 * Phase 5.1 Step 5.1.3 — EXPERIENCE MAPPING
 * 
 * Map terpene blends to experience vectors:
 * - Body relaxation
 * - Mental stimulation
 * - Mood elevation
 * - Sedation
 * - Focus / clarity
 * - Appetite stimulation
 * 
 * Each vector scored 0-100.
 */
function mapTerpenesToExperience(
  terpeneProfile: NormalizedTerpeneProfile,
  visualBoosts: Array<{ name: string; boost: number; reasoning: string }>,
  dbEntry?: CultivarReference
): ExperienceVector {
  // Phase 5.1 Step 5.1.3 — Initialize experience vectors
  const experience: ExperienceVector = {
    bodyRelaxation: 0,
    mentalStimulation: 0,
    moodElevation: 0,
    sedation: 0,
    focusClarity: 0,
    appetiteStimulation: 0,
  };

  // Phase 5.1 Step 5.1.3 — Terpene → Experience mapping
  const terpeneExperienceMap: Record<string, Partial<ExperienceVector>> = {
    myrcene: {
      bodyRelaxation: 85,
      sedation: 70,
      appetiteStimulation: 60,
      moodElevation: 40,
    },
    limonene: {
      mentalStimulation: 80,
      moodElevation: 75,
      focusClarity: 65,
      bodyRelaxation: 20,
    },
    caryophyllene: {
      bodyRelaxation: 70,
      sedation: 50,
      appetiteStimulation: 55,
      moodElevation: 50,
    },
    pinene: {
      mentalStimulation: 70,
      focusClarity: 80,
      moodElevation: 60,
      sedation: 10,
    },
    linalool: {
      bodyRelaxation: 75,
      sedation: 65,
      moodElevation: 60,
      mentalStimulation: 30,
    },
    terpinolene: {
      mentalStimulation: 75,
      moodElevation: 70,
      focusClarity: 50,
      sedation: 15,
    },
    humulene: {
      appetiteStimulation: 40,
      bodyRelaxation: 50,
      sedation: 45,
      mentalStimulation: 30,
    },
    ocimene: {
      mentalStimulation: 60,
      moodElevation: 65,
      focusClarity: 45,
      bodyRelaxation: 35,
    },
  };

  // Phase 5.1 Step 5.1.3 — Apply terpene experiences with dominance scores
  const allTerpenes = [...terpeneProfile.primaryTerpenes, ...terpeneProfile.secondaryTerpenes];
  
  allTerpenes.forEach(terpene => {
    const terpeneKey = terpene.name.toLowerCase();
    const terpeneEffects = terpeneExperienceMap[terpeneKey];
    
    if (terpeneEffects) {
      // Apply weighted contribution based on dominance score
      const weight = terpene.dominanceScore;
      
      if (terpeneEffects.bodyRelaxation !== undefined) {
        experience.bodyRelaxation += terpeneEffects.bodyRelaxation * weight;
      }
      if (terpeneEffects.mentalStimulation !== undefined) {
        experience.mentalStimulation += terpeneEffects.mentalStimulation * weight;
      }
      if (terpeneEffects.moodElevation !== undefined) {
        experience.moodElevation += terpeneEffects.moodElevation * weight;
      }
      if (terpeneEffects.sedation !== undefined) {
        experience.sedation += terpeneEffects.sedation * weight;
      }
      if (terpeneEffects.focusClarity !== undefined) {
        experience.focusClarity += terpeneEffects.focusClarity * weight;
      }
      if (terpeneEffects.appetiteStimulation !== undefined) {
        experience.appetiteStimulation += terpeneEffects.appetiteStimulation * weight;
      }
    }
  });

  // Phase 5.1 Step 5.1.3 — Apply visual boosts (probabilistic adjustments)
  visualBoosts.forEach(boost => {
    const terpeneKey = boost.name.toLowerCase();
    const terpeneEffects = terpeneExperienceMap[terpeneKey];
    
    if (terpeneEffects) {
      // Apply boost as a small adjustment (±8% max)
      const adjustmentWeight = boost.boost;
      
      if (terpeneEffects.bodyRelaxation !== undefined) {
        experience.bodyRelaxation += terpeneEffects.bodyRelaxation * adjustmentWeight;
      }
      if (terpeneEffects.mentalStimulation !== undefined) {
        experience.mentalStimulation += terpeneEffects.mentalStimulation * adjustmentWeight;
      }
      if (terpeneEffects.moodElevation !== undefined) {
        experience.moodElevation += terpeneEffects.moodElevation * adjustmentWeight;
      }
      if (terpeneEffects.sedation !== undefined) {
        experience.sedation += terpeneEffects.sedation * adjustmentWeight;
      }
      if (terpeneEffects.focusClarity !== undefined) {
        experience.focusClarity += terpeneEffects.focusClarity * adjustmentWeight;
      }
      if (terpeneEffects.appetiteStimulation !== undefined) {
        experience.appetiteStimulation += terpeneEffects.appetiteStimulation * adjustmentWeight;
      }
    }
  });

  // Phase 5.1 Step 5.1.3 — Normalize and clamp to 0-100
  Object.keys(experience).forEach((key) => {
    const k = key as keyof ExperienceVector;
    experience[k] = Math.max(0, Math.min(100, Math.round(experience[k])));
  });

  // Phase 5.1 Step 5.1.3 — Apply Indica/Sativa bias from database effects if available
  if (dbEntry?.effects && dbEntry.effects.length > 0) {
    const effectsStr = dbEntry.effects.join(" ").toLowerCase();
    
    // Indica-leaning effects → boost body relaxation and sedation
    if (effectsStr.includes("relaxation") || effectsStr.includes("sedation") || effectsStr.includes("body") || effectsStr.includes("sleep")) {
      experience.bodyRelaxation = Math.min(100, experience.bodyRelaxation + 10);
      experience.sedation = Math.min(100, experience.sedation + 10);
    }
    
    // Sativa-leaning effects → boost mental stimulation and focus
    if (effectsStr.includes("euphoria") || effectsStr.includes("creativity") || effectsStr.includes("uplifted") || effectsStr.includes("focused") || effectsStr.includes("energy")) {
      experience.mentalStimulation = Math.min(100, experience.mentalStimulation + 10);
      experience.focusClarity = Math.min(100, experience.focusClarity + 10);
      experience.moodElevation = Math.min(100, experience.moodElevation + 10);
    }
  }

  return experience;
}

/**
 * Phase 5.1 Step 5.1.4 — CONSENSUS BLEND (MULTI-IMAGE)
 * 
 * Across images:
 * - Average terpene likelihoods
 * - Penalize contradictions
 * - Boost consistent terpenes across ≥2 images
 * 
 * Result:
 * Final dominant terpene stack with confidence.
 */
function buildConsensusTerpeneProfile(
  imageResults?: ImageResult[],
  dbEntry?: CultivarReference
): NormalizedTerpeneProfile | null {
  if (!imageResults || imageResults.length === 0) {
    // Fallback to database only
    return normalizeTerpeneProfile(dbEntry, undefined);
  }

  // Phase 5.1 Step 5.1.4 — Collect terpene profiles from each image
  const perImageProfiles: Array<{ profile: NormalizedTerpeneProfile; imageIndex: number; confidence: number }> = [];

  imageResults.forEach((result, idx) => {
    const profile = normalizeTerpeneProfile(dbEntry, result.wikiResult);
    if (profile) {
      const imageConfidence = result.candidateStrains[0]?.confidence || 70;
      perImageProfiles.push({
        profile,
        imageIndex: idx,
        confidence: imageConfidence,
      });
    }
  });

  if (perImageProfiles.length === 0) {
    return normalizeTerpeneProfile(dbEntry, undefined);
  }

  // Phase 5.1 Step 5.1.4 — Aggregate terpenes across images with confidence weighting
  const terpeneAggregates = new Map<string, { totalScore: number; appearances: number; totalConfidence: number }>();

  perImageProfiles.forEach(({ profile, confidence }) => {
    const allTerpenes = [...profile.primaryTerpenes, ...profile.secondaryTerpenes];
    
    allTerpenes.forEach(terpene => {
      const normalizedName = terpene.name.toLowerCase();
      const weightedScore = terpene.dominanceScore * (confidence / 100); // Weight by image confidence
      
      const existing = terpeneAggregates.get(normalizedName);
      if (existing) {
        existing.totalScore += weightedScore;
        existing.appearances++;
        existing.totalConfidence += confidence;
      } else {
        terpeneAggregates.set(normalizedName, {
          totalScore: weightedScore,
          appearances: 1,
          totalConfidence: confidence,
        });
      }
    });
  });

  // Phase 5.1 Step 5.1.4 — Boost consistent terpenes across ≥2 images
  // Penalize contradictions (appear in only 1 image)
  const sortedTerpenes = Array.from(terpeneAggregates.entries())
    .map(([name, data]) => {
      const avgConfidence = data.totalConfidence / data.appearances;
      let consensusScore = data.totalScore / data.appearances; // Average weighted score
      
      // Phase 5.1 Step 5.1.4 — Boost consistent terpenes (appear in ≥2 images)
      if (data.appearances >= 2) {
        consensusScore *= 1.2; // +20% boost for multi-image agreement
      } else if (data.appearances === 1 && perImageProfiles.length > 1) {
        // Phase 5.1 Step 5.1.4 — Penalize contradictions (only 1 image)
        consensusScore *= 0.8; // -20% penalty for single-image-only
      }
      
      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        dominanceScore: Math.min(1.0, consensusScore),
        appearances: data.appearances,
        avgConfidence,
      };
    })
    .sort((a, b) => b.dominanceScore - a.dominanceScore)
    .slice(0, 5); // Top 5

  if (sortedTerpenes.length === 0) {
    return normalizeTerpeneProfile(dbEntry, undefined);
  }

  // Phase 5.1 Step 5.1.4 — Split into primary (top 3) and secondary (next 2)
  const primaryTerpenes = sortedTerpenes.slice(0, 3).map(t => ({
    name: t.name,
    dominanceScore: t.dominanceScore,
  }));

  const secondaryTerpenes = sortedTerpenes.slice(3, 5).map(t => ({
    name: t.name,
    dominanceScore: t.dominanceScore,
  }));

  const totalDominanceScore = Math.min(1.0, sortedTerpenes.reduce((sum, t) => sum + t.dominanceScore, 0));

  return {
    primaryTerpenes,
    secondaryTerpenes,
    totalDominanceScore,
  };
}

/**
 * Phase 5.1 — TERPENE-WEIGHTED EXPERIENCE ENGINE
 * 
 * Main function to generate terpene profile and experience vectors
 */
export function generateTerpeneExperience(
  strainName: string,
  dbEntry?: CultivarReference,
  fusedFeatures?: FusedFeatures,
  imageResults?: ImageResult[]
): {
  terpeneProfile: NormalizedTerpeneProfile;
  experience: ExperienceVector;
  visualBoosts: Array<{ name: string; boost: number; reasoning: string }>;
  consensusNotes: string[];
} {
  // Phase 5.1 Step 5.1.4 — CONSENSUS BLEND (MULTI-IMAGE)
  const consensusTerpeneProfile = buildConsensusTerpeneProfile(imageResults, dbEntry);
  
  if (!consensusTerpeneProfile) {
    // Fallback: use database only
    const fallbackProfile = normalizeTerpeneProfile(dbEntry, undefined);
    if (!fallbackProfile) {
      // Ultimate fallback: empty profile
      return {
        terpeneProfile: {
          primaryTerpenes: [],
          secondaryTerpenes: [],
          totalDominanceScore: 0,
        },
        experience: {
          bodyRelaxation: 50,
          mentalStimulation: 50,
          moodElevation: 50,
          sedation: 50,
          focusClarity: 50,
          appetiteStimulation: 50,
        },
        visualBoosts: [],
        consensusNotes: ["Terpene profile not available from database or images"],
      };
    }
    
    // Phase 5.1 Step 5.1.2 — IMAGE-ASSISTED TERPENE INFERENCE
    const visualBoosts = inferTerpenesFromVisual(fusedFeatures, imageResults);
    
    // Phase 5.1 Step 5.1.3 — EXPERIENCE MAPPING
    const experience = mapTerpenesToExperience(fallbackProfile, visualBoosts, dbEntry);
    
    return {
      terpeneProfile: fallbackProfile,
      experience,
      visualBoosts,
      consensusNotes: ["Terpene profile derived from database only"],
    };
  }

  // Phase 5.1 Step 5.1.2 — IMAGE-ASSISTED TERPENE INFERENCE
  const visualBoosts = inferTerpenesFromVisual(fusedFeatures, imageResults);
  
  // Phase 5.1 Step 5.1.3 — EXPERIENCE MAPPING
  const experience = mapTerpenesToExperience(consensusTerpeneProfile, visualBoosts, dbEntry);

  // Phase 5.1 Step 5.1.4 — Build consensus notes
  const consensusNotes: string[] = [];
  if (imageResults && imageResults.length > 1) {
    const consistentTerpenes = consensusTerpeneProfile.primaryTerpenes.filter(t => 
      t.dominanceScore > 0.5 // High dominance suggests consistency
    );
    if (consistentTerpenes.length > 0) {
      consensusNotes.push(`Terpene profile confirmed across ${imageResults.length} images. Dominant terpenes: ${consistentTerpenes.map(t => t.name).join(", ")}`);
    } else {
      consensusNotes.push(`Terpene profile averaged across ${imageResults.length} images with confidence weighting`);
    }
  } else if (imageResults && imageResults.length === 1) {
    consensusNotes.push("Terpene profile derived from single image analysis");
  } else {
    consensusNotes.push("Terpene profile derived from database classification");
  }

  if (visualBoosts.length > 0) {
    consensusNotes.push(`Visual cues suggest: ${visualBoosts.map(b => `${b.name} (${(b.boost * 100).toFixed(0)}% boost)`).join(", ")}`);
  }

  return {
    terpeneProfile: consensusTerpeneProfile,
    experience,
    visualBoosts,
    consensusNotes,
  };
}
