// lib/scanner/nameFirstV57.ts
// Phase 5.7 — Name-First Matching & Disambiguation Engine

import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NormalizedTerpeneProfile } from "./terpeneExperienceEngine";
import type { StrainRatio } from "./ratioEngineV52";
import type { CultivarReference } from "./cultivarLibrary";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 5.7 Step 5.7.1 — Candidate Name Pool Entry
 */
export type NameCandidateV57 = {
  strainName: string;
  canonicalName: string;
  knownAliases: string[];
  breeder?: string;
  origin?: string;
  baselineIndicaPercent: number;
  baselineSativaPercent: number;
  // Phase 5.7.2 — Consensus Name Scoring
  frequencyScore: number; // 0-100 (how many images this name appears in)
  averageConfidence: number; // 0-100 (average confidence across images)
  visualTraitAlignment: number; // 0-100 (how well visual traits match)
  geneticLineageOverlap: number; // 0-100 (parent genetics overlap)
  weightedScore: number; // Final weighted score
  matchedTraits: string[];
  imageIndices: number[]; // Which images this name appeared in
};

/**
 * Phase 5.7 Step 5.7.5 — User-Facing Output
 */
export type NameFirstResultV57 = {
  primaryMatch: {
    name: string;
    confidence: number; // 0-100
    confidenceTier: "very_high" | "high" | "medium" | "low";
    alsoKnownAs?: string[];
  };
  alternateMatches?: Array<{
    name: string;
    confidence: number;
    whyNotPrimary: string;
  }>; // 2-3 max
  explanation: {
    why: string[]; // Why this name won
    visualStructure?: string[]; // Visual structure matched
    terpeneIndicators?: string[]; // Consistent terpene indicators
    geneticLineage?: string[]; // Genetic lineage alignment
  };
};

/**
 * Phase 5.7 Step 5.7.1 — CANDIDATE NAME POOL
 * 
 * From each image analysis:
 * - Extract top 5 strain name candidates
 * - Include known aliases & spelling variants
 * - Normalize names (case, spacing, legacy names)
 */
function extractCandidateNamePoolV57(
  imageResults: ImageResult[]
): Map<string, {
  strainName: string;
  canonicalName: string;
  aliases: string[];
  appearances: Array<{ imageIndex: number; confidence: number; rank: number }>;
}> {
  const candidateMap = new Map<string, {
    strainName: string;
    canonicalName: string;
    aliases: string[];
    appearances: Array<{ imageIndex: number; confidence: number; rank: number }>;
  }>();

  // Phase 5.7.1 — Extract top 5 candidates from each image
  imageResults.forEach((result, imageIndex) => {
    const top5Candidates = result.candidateStrains.slice(0, 5);
    
    top5Candidates.forEach((candidate, rank) => {
      const normalizedName = normalizeStrainName(candidate.name);
      
      // Phase 5.7.1 — Find canonical name and aliases from database
      const dbEntry = CULTIVAR_LIBRARY.find(s => 
        s.name.toLowerCase() === normalizedName.toLowerCase() ||
        (s.aliases && s.aliases.some(a => a.toLowerCase() === normalizedName.toLowerCase()))
      );
      
      const canonicalName = dbEntry?.name || normalizedName;
      const aliases = dbEntry?.aliases || [];
      
      // Phase 5.7.1 — Group by canonical name
      const existing = candidateMap.get(canonicalName.toLowerCase());
      
      if (existing) {
        // Add appearance
        existing.appearances.push({
          imageIndex,
          confidence: candidate.confidence,
          rank,
        });
        // Merge aliases
        existing.aliases = [...new Set([...existing.aliases, ...aliases, candidate.name])];
      } else {
        candidateMap.set(canonicalName.toLowerCase(), {
          strainName: candidate.name,
          canonicalName,
          aliases: [...aliases, candidate.name],
          appearances: [{
            imageIndex,
            confidence: candidate.confidence,
            rank,
          }],
        });
      }
    });
  });

  return candidateMap;
}

/**
 * Phase 5.7 Step 5.7.1 — Normalize strain name
 * 
 * Normalize names (case, spacing, legacy names)
 */
function normalizeStrainName(name: string): string {
  // Remove extra spaces, normalize case
  let normalized = name.trim().replace(/\s+/g, " ");
  
  // Common legacy name mappings
  const legacyMappings: Record<string, string> = {
    "og kush": "OG Kush",
    "ogk": "OG Kush",
    "ocean grown kush": "OG Kush",
    "gsc": "Girl Scout Cookies",
    "girl scout cookies": "Girl Scout Cookies",
    "blue dream": "Blue Dream",
    "bd": "Blue Dream",
    "white widow": "White Widow",
    "ww": "White Widow",
  };
  
  const lowerName = normalized.toLowerCase();
  if (legacyMappings[lowerName]) {
    normalized = legacyMappings[lowerName];
  }
  
  return normalized;
}

/**
 * Phase 5.7 Step 5.7.2 — CONSENSUS NAME SCORING
 * 
 * Score each candidate by:
 * - Frequency across images
 * - Average confidence
 * - Visual trait alignment
 * - Genetic lineage overlap
 * 
 * Boost:
 * - Names appearing in ≥2 images
 * - Names matching phenotype + terpene profile
 * 
 * Penalize:
 * - One-off names
 * - Conflicting morphology
 */
function scoreConsensusNamesV57(
  candidateMap: ReturnType<typeof extractCandidateNamePoolV57>,
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  terpeneProfile?: NormalizedTerpeneProfile,
  strainRatio?: StrainRatio
): NameCandidateV57[] {
  const candidates: NameCandidateV57[] = [];
  const imageCount = imageResults.length;

  candidateMap.forEach((entry, canonicalNameLower) => {
    // Phase 5.7.2 — Find database entry
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name.toLowerCase() === canonicalNameLower
    );
    
    if (!dbEntry) {
      return; // Skip if not in database
    }

    // Phase 5.7.2 — Frequency Score (0-100)
    // Names appearing in ≥2 images get boost
    const frequencyScore = entry.appearances.length >= 2
      ? Math.min(100, 50 + (entry.appearances.length * 20)) // 50 base + 20 per image (max 100)
      : entry.appearances.length === 1 && imageCount > 1
      ? 30 // Penalty for one-off
      : 50; // Single image default

    // Phase 5.7.2 — Average Confidence (0-100)
    const totalConfidence = entry.appearances.reduce((sum, a) => sum + a.confidence, 0);
    const averageConfidence = totalConfidence / entry.appearances.length;

    // Phase 5.7.2 — Visual Trait Alignment (0-100)
    const visualProfile = dbEntry.visualProfile || {
      budStructure: dbEntry.morphology.budDensity,
      trichomeDensity: dbEntry.morphology.trichomeDensity,
      pistilColor: dbEntry.morphology.pistilColor,
      leafShape: dbEntry.morphology.leafShape,
      colorProfile: "",
    };
    
    let visualTraitAlignment = 0;
    const matchedTraits: string[] = [];

    // Bud structure match
    if (fusedFeatures.budStructure === visualProfile.budStructure) {
      visualTraitAlignment += 30;
      matchedTraits.push(`Bud structure: ${visualProfile.budStructure}`);
    } else if (
      (fusedFeatures.budStructure === "high" && visualProfile.budStructure === "medium") ||
      (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "high") ||
      (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "low") ||
      (fusedFeatures.budStructure === "low" && visualProfile.budStructure === "medium")
    ) {
      visualTraitAlignment += 15;
      matchedTraits.push(`Bud structure partial: ${fusedFeatures.budStructure} ≈ ${visualProfile.budStructure}`);
    }

    // Trichome density match
    if (fusedFeatures.trichomeDensity === visualProfile.trichomeDensity) {
      visualTraitAlignment += 25;
      matchedTraits.push(`Trichome density: ${visualProfile.trichomeDensity}`);
    } else if (
      (fusedFeatures.trichomeDensity === "high" && visualProfile.trichomeDensity === "medium") ||
      (fusedFeatures.trichomeDensity === "medium" && visualProfile.trichomeDensity === "high") ||
      (fusedFeatures.trichomeDensity === "medium" && visualProfile.trichomeDensity === "low") ||
      (fusedFeatures.trichomeDensity === "low" && visualProfile.trichomeDensity === "medium")
    ) {
      visualTraitAlignment += 12;
      matchedTraits.push(`Trichome density partial: ${fusedFeatures.trichomeDensity} ≈ ${visualProfile.trichomeDensity}`);
    }

    // Leaf shape match
    if (fusedFeatures.leafShape === visualProfile.leafShape) {
      visualTraitAlignment += 20;
      matchedTraits.push(`Leaf shape: ${visualProfile.leafShape}`);
    } else if (
      (fusedFeatures.leafShape === "broad" && visualProfile.leafShape === "medium") ||
      (fusedFeatures.leafShape === "narrow" && visualProfile.leafShape === "medium")
    ) {
      visualTraitAlignment += 10;
      matchedTraits.push(`Leaf shape partial: ${fusedFeatures.leafShape} ≈ ${visualProfile.leafShape}`);
    }

    // Color profile match (if available)
    if (visualProfile.colorProfile && fusedFeatures.colorProfile) {
      const dbColors = visualProfile.colorProfile.toLowerCase();
      const fusedColors = fusedFeatures.colorProfile.toLowerCase();
      if (dbColors.includes(fusedColors) || fusedColors.includes(dbColors)) {
        visualTraitAlignment += 15;
        matchedTraits.push(`Color profile: ${visualProfile.colorProfile}`);
      }
    }

    // Phase 5.7.2 — Genetic Lineage Overlap (0-100)
    let geneticLineageOverlap = 0;
    
    if (strainRatio && dbEntry.type) {
      const dbType = dbEntry.type || dbEntry.dominantType;
      const ratioType = strainRatio.dominance;
      
      // Check if types align
      if (dbType === ratioType || 
          (dbType === "Hybrid" && (ratioType === "Indica" || ratioType === "Sativa" || ratioType === "Hybrid" || ratioType === "Balanced")) ||
          (ratioType === "Hybrid" && (dbType === "Indica" || dbType === "Sativa"))) {
        geneticLineageOverlap += 40;
      }
      
      // Check genetics string for parent overlap
      if (dbEntry.genetics) {
        const geneticsLower = dbEntry.genetics.toLowerCase();
        // Simple heuristic: if genetics mentions common parent strains, boost
        const commonParents = ["kush", "haze", "skunk", "afghan", "thai", "indica", "sativa"];
        const parentMatches = commonParents.filter(parent => geneticsLower.includes(parent));
        if (parentMatches.length > 0) {
          geneticLineageOverlap += Math.min(30, parentMatches.length * 10);
        }
      }
    } else {
      // Default if no ratio available
      geneticLineageOverlap = 50;
    }

    // Phase 5.7.2 — Boost names appearing in ≥2 images
    let frequencyBoost = 0;
    if (entry.appearances.length >= 2) {
      frequencyBoost = 10; // +10% boost for multi-image agreement
    }

    // Phase 5.7.2 — Boost names matching phenotype + terpene profile
    let phenotypeTerpeneBoost = 0;
    if (terpeneProfile && dbEntry.terpeneProfile) {
      const dbTerpenes = dbEntry.terpeneProfile.map(t => t.toLowerCase());
      const primaryTerpenes = terpeneProfile.primaryTerpenes.map(t => t.name.toLowerCase());
      const overlap = primaryTerpenes.filter(t => dbTerpenes.includes(t)).length;
      if (overlap >= 2) {
        phenotypeTerpeneBoost = 15; // +15% boost for strong terpene overlap
      } else if (overlap >= 1) {
        phenotypeTerpeneBoost = 8; // +8% boost for partial terpene overlap
      }
    }

    // Phase 5.7.2 — Penalize one-off names (if multiple images)
    let oneOffPenalty = 0;
    if (entry.appearances.length === 1 && imageCount > 1) {
      oneOffPenalty = 15; // -15% penalty for single-image-only
    }

    // Phase 5.7.2 — Penalize conflicting morphology
    let morphologyPenalty = 0;
    if (visualTraitAlignment < 30) {
      morphologyPenalty = 10; // -10% penalty for low visual alignment
    }

    // Phase 5.7.2 — Weighted Score Formula
    // Frequency: 30%, Average Confidence: 25%, Visual: 25%, Genetic: 20%
    const weightedScore = Math.max(0, Math.min(100,
      (frequencyScore * 0.30) +
      (averageConfidence * 0.25) +
      (visualTraitAlignment * 0.25) +
      (geneticLineageOverlap * 0.20) +
      frequencyBoost +
      phenotypeTerpeneBoost -
      oneOffPenalty -
      morphologyPenalty
    ));

    // Phase 5.7.2 — Baseline ratio from database
    const dbType = dbEntry.type || dbEntry.dominantType;
    let baselineIndicaPercent = 50;
    let baselineSativaPercent = 50;
    
    if (dbType === "Indica") {
      baselineIndicaPercent = 70;
      baselineSativaPercent = 30;
    } else if (dbType === "Sativa") {
      baselineIndicaPercent = 30;
      baselineSativaPercent = 70;
    } else if (dbType === "Hybrid") {
      baselineIndicaPercent = 50;
      baselineSativaPercent = 50;
    }

    candidates.push({
      strainName: entry.strainName,
      canonicalName: entry.canonicalName,
      knownAliases: entry.aliases,
      breeder: dbEntry.sources?.[0], // Use first source as breeder hint
      baselineIndicaPercent,
      baselineSativaPercent,
      frequencyScore,
      averageConfidence,
      visualTraitAlignment,
      geneticLineageOverlap,
      weightedScore,
      matchedTraits,
      imageIndices: entry.appearances.map(a => a.imageIndex),
    });
  });

  // Phase 5.7.2 — Sort by weighted score
  candidates.sort((a, b) => b.weightedScore - a.weightedScore);
  
  return candidates;
}

/**
 * Phase 5.7 Step 5.7.3 — DISAMBIGUATION LOGIC
 * 
 * If top names are close:
 * - Compare parent genetics
 * - Compare dominant terpenes
 * - Compare growth structure descriptors
 * 
 * If still close:
 * - Present primary + alternate matches
 * - Lower confidence tier slightly
 */
function applyDisambiguationLogicV57(
  candidates: NameCandidateV57[],
  terpeneProfile?: NormalizedTerpeneProfile,
  fusedFeatures?: FusedFeatures
): {
  primary: NameCandidateV57;
  alternates: NameCandidateV57[];
  confidenceAdjustment: number;
  disambiguationReasoning: string[];
} {
  if (candidates.length === 0) {
    // Failsafe
    throw new Error("Phase 5.7.3 — No candidates available for disambiguation");
  }

  const primary = candidates[0];
  const second = candidates[1];
  const third = candidates[2];

  const scoreGap = primary.weightedScore - (second?.weightedScore || 0);
  let confidenceAdjustment = 0;
  const disambiguationReasoning: string[] = [];

  // Phase 5.7.3 — If top names are close (<10% apart), apply disambiguation
  if (second && scoreGap < 10) {
    disambiguationReasoning.push(`Top 2 candidates are close (${scoreGap.toFixed(1)}% gap). Applying disambiguation.`);

    // Phase 5.7.3 — Compare parent genetics
    const primaryDb = CULTIVAR_LIBRARY.find(s => s.name.toLowerCase() === primary.canonicalName.toLowerCase());
    const secondDb = CULTIVAR_LIBRARY.find(s => s.name.toLowerCase() === second.canonicalName.toLowerCase());
    
    if (primaryDb && secondDb) {
      const primaryGenetics = (primaryDb.genetics || "").toLowerCase();
      const secondGenetics = (secondDb.genetics || "").toLowerCase();
      
      // Check if primary has more specific genetics
      if (primaryGenetics.length > secondGenetics.length && primaryGenetics.includes(secondGenetics)) {
        disambiguationReasoning.push(`${primary.canonicalName} has more specific genetics: ${primaryDb.genetics}`);
      } else if (secondGenetics.length > primaryGenetics.length && secondGenetics.includes(primaryGenetics)) {
        // Second has better genetics, but we keep primary (already selected)
        disambiguationReasoning.push(`${second.canonicalName} has more specific genetics, but ${primary.canonicalName} has higher overall score`);
      }
    }

    // Phase 5.7.3 — Compare dominant terpenes
    if (terpeneProfile && primaryDb && secondDb) {
      const primaryTerpenes = (primaryDb.terpeneProfile || []).map(t => t.toLowerCase());
      const secondTerpenes = (secondDb.terpeneProfile || []).map(t => t.toLowerCase());
      const profileTerpenes = terpeneProfile.primaryTerpenes.map(t => t.name.toLowerCase());
      
      const primaryOverlap = profileTerpenes.filter(t => primaryTerpenes.includes(t)).length;
      const secondOverlap = profileTerpenes.filter(t => secondTerpenes.includes(t)).length;
      
      if (primaryOverlap > secondOverlap) {
        disambiguationReasoning.push(`${primary.canonicalName} has better terpene overlap (${primaryOverlap} vs ${secondOverlap})`);
      } else if (secondOverlap > primaryOverlap) {
        disambiguationReasoning.push(`${second.canonicalName} has better terpene overlap, but ${primary.canonicalName} has higher overall score`);
      }
    }

    // Phase 5.7.3 — Compare growth structure descriptors
    if (fusedFeatures && primaryDb && secondDb) {
      const primaryVisual = primaryDb.visualProfile || {
        budStructure: primaryDb.morphology.budDensity,
        trichomeDensity: primaryDb.morphology.trichomeDensity,
        leafShape: primaryDb.morphology.leafShape,
        pistilColor: primaryDb.morphology.pistilColor,
        colorProfile: "",
      };
      const secondVisual = secondDb.visualProfile || {
        budStructure: secondDb.morphology.budDensity,
        trichomeDensity: secondDb.morphology.trichomeDensity,
        leafShape: secondDb.morphology.leafShape,
        pistilColor: secondDb.morphology.pistilColor,
        colorProfile: "",
      };
      
      const primaryMatches = [
        primaryVisual.budStructure === fusedFeatures.budStructure,
        primaryVisual.trichomeDensity === fusedFeatures.trichomeDensity,
        primaryVisual.leafShape === fusedFeatures.leafShape,
      ].filter(Boolean).length;
      
      const secondMatches = [
        secondVisual.budStructure === fusedFeatures.budStructure,
        secondVisual.trichomeDensity === fusedFeatures.trichomeDensity,
        secondVisual.leafShape === fusedFeatures.leafShape,
      ].filter(Boolean).length;
      
      if (primaryMatches > secondMatches) {
        disambiguationReasoning.push(`${primary.canonicalName} has better visual structure match (${primaryMatches} vs ${secondMatches} traits)`);
      }
    }

    // Phase 5.7.3 — If still close, lower confidence tier slightly
    if (scoreGap < 5) {
      confidenceAdjustment = -5; // Reduce confidence by 5%
      disambiguationReasoning.push(`Very close match (${scoreGap.toFixed(1)}% gap). Confidence reduced slightly.`);
    }
  }

  // Phase 5.7.3 — Build alternates (2-3 max)
  const alternates: NameCandidateV57[] = [];
  if (second && scoreGap < 15) {
    alternates.push(second);
  }
  if (third && (primary.weightedScore - third.weightedScore) < 20) {
    alternates.push(third);
  }

  return {
    primary,
    alternates,
    confidenceAdjustment,
    disambiguationReasoning,
  };
}

/**
 * Phase 5.7 Step 5.7.4 — FINAL NAME SELECTION
 * 
 * Select:
 * - Primary Match (highest weighted score)
 * - Alternate Matches (2–3 max)
 * 
 * Attach:
 * - Confidence %
 * - Confidence tier
 * - Reasoning summary
 */
function selectFinalNameV57(
  disambiguationResult: ReturnType<typeof applyDisambiguationLogicV57>,
  imageCount: number
): NameFirstResultV57 {
  const { primary, alternates, confidenceAdjustment, disambiguationReasoning } = disambiguationResult;

  // Phase 5.7.4 — Calculate confidence from weighted score
  let confidence = primary.weightedScore;
  
  // Phase 5.7.4 — Apply confidence adjustment from disambiguation
  confidence += confidenceAdjustment;
  
  // Phase 5.7.4 — Cap confidence by image count
  if (imageCount === 1) {
    confidence = Math.min(82, confidence);
  } else if (imageCount === 2) {
    confidence = Math.min(90, confidence);
  } else if (imageCount >= 3) {
    confidence = Math.min(99, confidence);
  }
  
  // Phase 5.7.4 — Ensure confidence never exceeds tier cap
  confidence = Math.max(0, Math.min(99, confidence)); // Never 100%

  // Phase 5.7.4 — Determine confidence tier
  let confidenceTier: "very_high" | "high" | "medium" | "low";
  if (confidence >= 93) {
    confidenceTier = "very_high";
  } else if (confidence >= 85) {
    confidenceTier = "high";
  } else if (confidence >= 70) {
    confidenceTier = "medium";
  } else {
    confidenceTier = "low";
  }

  // Phase 5.7.4 — Get aliases
  const dbEntry = CULTIVAR_LIBRARY.find(s => s.name.toLowerCase() === primary.canonicalName.toLowerCase());
  const alsoKnownAs = dbEntry?.aliases && dbEntry.aliases.length > 0
    ? dbEntry.aliases.slice(0, 3) // Top 3 aliases
    : undefined;

  // Phase 5.7.4 — Build explanation
  const why: string[] = [];
  if (primary.imageIndices.length >= 2) {
    why.push(`Visual structure matched across ${primary.imageIndices.length} images`);
  }
  if (primary.visualTraitAlignment >= 60) {
    why.push(`Strong visual trait alignment (${primary.visualTraitAlignment.toFixed(0)}%)`);
  }
  if (primary.frequencyScore >= 70) {
    why.push(`High frequency across images (${primary.frequencyScore.toFixed(0)}%)`);
  }
  if (primary.geneticLineageOverlap >= 60) {
    why.push(`Genetic lineage alignment (${primary.geneticLineageOverlap.toFixed(0)}%)`);
  }
  if (primary.matchedTraits.length > 0) {
    why.push(`Matched traits: ${primary.matchedTraits.slice(0, 3).join(", ")}`);
  }

  const visualStructure: string[] = [];
  if (primary.matchedTraits.length > 0) {
    visualStructure.push(...primary.matchedTraits.slice(0, 3));
  }

  const terpeneIndicators: string[] = [];
  if (dbEntry?.terpeneProfile && dbEntry.terpeneProfile.length > 0) {
    terpeneIndicators.push(`Dominant terpenes: ${dbEntry.terpeneProfile.slice(0, 3).join(", ")}`);
  }

  const geneticLineage: string[] = [];
  if (dbEntry?.genetics) {
    geneticLineage.push(`Lineage: ${dbEntry.genetics}`);
  }
  if (dbEntry?.type) {
    geneticLineage.push(`Type: ${dbEntry.type}`);
  }

  // Phase 5.7.4 — Build alternate matches
  const alternateMatches = alternates.map(alt => {
    const altDb = CULTIVAR_LIBRARY.find(s => s.name.toLowerCase() === alt.canonicalName.toLowerCase());
    let whyNotPrimary = `Lower weighted score (${alt.weightedScore.toFixed(0)}% vs ${primary.weightedScore.toFixed(0)}%)`;
    
    if (alt.frequencyScore < primary.frequencyScore) {
      whyNotPrimary += `. Appeared in fewer images (${alt.imageIndices.length} vs ${primary.imageIndices.length})`;
    }
    if (alt.visualTraitAlignment < primary.visualTraitAlignment) {
      whyNotPrimary += `. Lower visual alignment (${alt.visualTraitAlignment.toFixed(0)}% vs ${primary.visualTraitAlignment.toFixed(0)}%)`;
    }
    
    return {
      name: alt.canonicalName,
      confidence: Math.max(0, Math.min(99, alt.weightedScore + confidenceAdjustment)),
      whyNotPrimary,
    };
  });

  return {
    primaryMatch: {
      name: primary.canonicalName,
      confidence: Math.round(confidence),
      confidenceTier,
      alsoKnownAs,
    },
    alternateMatches: alternateMatches.length > 0 ? alternateMatches : undefined,
    explanation: {
      why: why.length > 0 ? why : [`Weighted score: ${primary.weightedScore.toFixed(0)}%`],
      visualStructure: visualStructure.length > 0 ? visualStructure : undefined,
      terpeneIndicators: terpeneIndicators.length > 0 ? terpeneIndicators : undefined,
      geneticLineage: geneticLineage.length > 0 ? geneticLineage : undefined,
    },
  };
}

/**
 * Phase 5.7 — MAIN FUNCTION: Name-First Matching & Disambiguation
 */
export function runNameFirstV57(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number,
  terpeneProfile?: NormalizedTerpeneProfile,
  strainRatio?: StrainRatio
): NameFirstResultV57 {
  // Phase 5.7.1 — CANDIDATE NAME POOL
  const candidateMap = extractCandidateNamePoolV57(imageResults);
  console.log("Phase 5.7.1 — CANDIDATE NAME POOL:", Array.from(candidateMap.keys()).slice(0, 10));

  // Phase 5.7.2 — CONSENSUS NAME SCORING
  const scoredCandidates = scoreConsensusNamesV57(
    candidateMap,
    imageResults,
    fusedFeatures,
    terpeneProfile,
    strainRatio
  );
  console.log("Phase 5.7.2 — SCORED CANDIDATES (top 5):", scoredCandidates.slice(0, 5).map(c => ({
    name: c.canonicalName,
    score: c.weightedScore.toFixed(1),
    frequency: c.frequencyScore.toFixed(1),
    visual: c.visualTraitAlignment.toFixed(1),
  })));

  // Phase 5.7.3 — DISAMBIGUATION LOGIC
  const disambiguationResult = applyDisambiguationLogicV57(
    scoredCandidates,
    terpeneProfile,
    fusedFeatures
  );
  console.log("Phase 5.7.3 — DISAMBIGUATION RESULT:", {
    primary: disambiguationResult.primary.canonicalName,
    alternates: disambiguationResult.alternates.map(a => a.canonicalName),
    confidenceAdjustment: disambiguationResult.confidenceAdjustment,
  });

  // Phase 5.7.4 — FINAL NAME SELECTION
  const finalResult = selectFinalNameV57(disambiguationResult, imageCount);
  console.log("Phase 5.7.4 — FINAL RESULT:", finalResult);

  // Phase 5.7.5 — USER OUTPUT (already formatted in finalResult)
  return finalResult;
}
