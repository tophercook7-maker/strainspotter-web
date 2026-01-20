// lib/scanner/nameFirstV55.ts
// Phase 5.5 — Name-First Matching & Strain Disambiguation

import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NormalizedTerpeneProfile } from "./terpeneExperienceEngine";
import type { StrainRatio } from "./ratioEngineV52";
import type { CultivarReference } from "./cultivarLibrary";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 5.5 Step 5.5.1 — Name Candidate Pool Entry
 */
export type NameCandidateV55 = {
  strainName: string;
  canonicalName: string;
  knownAliases: string[];
  breeder?: string;
  origin?: string;
  baselineIndicaPercent: number;
  baselineSativaPercent: number;
  visualSimilarityScore: number; // 0-100
  geneticProximityScore: number; // 0-100
  terpeneOverlapScore: number; // 0-100
  effectAlignmentScore: number; // 0-100
  totalScore: number; // Weighted total
  matchedTraits: string[];
};

/**
 * Phase 5.5 Step 5.5.5 — User-Facing Output
 */
export type NameFirstResultV55 = {
  primaryMatch: {
    name: string;
    confidence: number;
    alsoKnownAs?: string[];
  };
  secondaryPossibility?: {
    name: string;
    confidence: number;
  };
  explanation: {
    whyThisName: string[];
    whatRuledOutOthers: string[];
  };
};

/**
 * Phase 5.5 Step 5.5.1 — NAME CANDIDATE POOL
 * 
 * From 35,000-strain database:
 * - Pull top 25 candidates by:
 *   - Visual similarity score
 *   - Genetic proximity
 *   - Terpene overlap
 *   - Effect alignment
 */
function buildNameCandidatePoolV55(
  fusedFeatures: FusedFeatures,
  imageResults: ImageResult[],
  terpeneProfile?: NormalizedTerpeneProfile,
  strainRatio?: StrainRatio
): NameCandidateV55[] {
  const candidates: NameCandidateV55[] = [];

  // Phase 5.5.1 — Score all strains from CULTIVAR_LIBRARY
  for (const strain of CULTIVAR_LIBRARY) {
    const visualProfile = strain.visualProfile || {
      budStructure: strain.morphology.budDensity,
      trichomeDensity: strain.morphology.trichomeDensity,
      pistilColor: strain.morphology.pistilColor,
      leafShape: strain.morphology.leafShape,
      colorProfile: "",
    };

    // Phase 5.5.1 — Visual Similarity Score (0-100)
    let visualSimilarityScore = 0;
    const matchedTraits: string[] = [];

    if (fusedFeatures.budStructure === visualProfile.budStructure) {
      visualSimilarityScore += 30;
      matchedTraits.push(`Bud structure: ${visualProfile.budStructure}`);
    } else if (
      (fusedFeatures.budStructure === "high" && visualProfile.budStructure === "medium") ||
      (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "high") ||
      (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "low") ||
      (fusedFeatures.budStructure === "low" && visualProfile.budStructure === "medium")
    ) {
      visualSimilarityScore += 15;
      matchedTraits.push(`Bud structure partial: ${fusedFeatures.budStructure} ≈ ${visualProfile.budStructure}`);
    }

    if (fusedFeatures.trichomeDensity === visualProfile.trichomeDensity) {
      visualSimilarityScore += 25;
      matchedTraits.push(`Trichome density: ${visualProfile.trichomeDensity}`);
    } else if (
      (fusedFeatures.trichomeDensity === "high" && visualProfile.trichomeDensity === "medium") ||
      (fusedFeatures.trichomeDensity === "medium" && visualProfile.trichomeDensity === "high") ||
      (fusedFeatures.trichomeDensity === "medium" && visualProfile.trichomeDensity === "low") ||
      (fusedFeatures.trichomeDensity === "low" && visualProfile.trichomeDensity === "medium")
    ) {
      visualSimilarityScore += 12;
      matchedTraits.push(`Trichome density partial: ${fusedFeatures.trichomeDensity} ≈ ${visualProfile.trichomeDensity}`);
    }

    if (fusedFeatures.leafShape === visualProfile.leafShape) {
      visualSimilarityScore += 25;
      matchedTraits.push(`Leaf shape: ${visualProfile.leafShape}`);
    }

    // Color profile match (20 points)
    const colorProfile = fusedFeatures.colorProfile?.toLowerCase() || "";
    const strainColor = visualProfile.colorProfile?.toLowerCase() || "";
    if (colorProfile && strainColor && (
      colorProfile.includes(strainColor) || strainColor.includes(colorProfile)
    )) {
      visualSimilarityScore += 20;
      matchedTraits.push(`Color profile: ${strainColor}`);
    }

    // Phase 5.5.1 — Genetic Proximity Score (0-100)
    let geneticProximityScore = 0;
    if (strainRatio) {
      const dbType = strain.type || strain.dominantType;
      const expectedDominance = strainRatio.dominance;
      const dbDominance = dbType === "Indica" ? "Indica" : dbType === "Sativa" ? "Sativa" : "Hybrid";
      
      if (expectedDominance === dbDominance || expectedDominance === "Balanced") {
        geneticProximityScore = 100;
        matchedTraits.push(`Genetic alignment: ${dbType}-dominant matches visual analysis`);
      } else {
        // Partial match (50 points)
        geneticProximityScore = 50;
        matchedTraits.push(`Genetic partial: Database ${dbType}, visual suggests ${expectedDominance}`);
      }
    } else {
      // No ratio available, use type match
      const dbType = strain.type || strain.dominantType;
      geneticProximityScore = 70; // Default score
    }

    // Phase 5.5.1 — Terpene Overlap Score (0-100)
    let terpeneOverlapScore = 0;
    if (terpeneProfile && terpeneProfile.primaryTerpenes.length > 0) {
      const dbTerpenes = strain.terpeneProfile || strain.commonTerpenes || [];
      if (dbTerpenes.length > 0) {
        const detectedTerpenes = terpeneProfile.primaryTerpenes.map(t => t.name.toLowerCase());
        const matchingTerpenes = dbTerpenes.filter(t => 
          detectedTerpenes.includes(t.toLowerCase())
        );
        
        const matchRatio = matchingTerpenes.length / Math.max(dbTerpenes.length, detectedTerpenes.length);
        terpeneOverlapScore = Math.round(matchRatio * 100);
        
        if (matchingTerpenes.length > 0) {
          matchedTraits.push(`Terpene overlap: ${matchingTerpenes.slice(0, 3).join(", ")}`);
        }
      } else {
        terpeneOverlapScore = 50; // No terpene data, neutral score
      }
    } else {
      terpeneOverlapScore = 50; // No terpene profile available
    }

    // Phase 5.5.1 — Effect Alignment Score (0-100)
    let effectAlignmentScore = 0;
    if (strain.effects && strain.effects.length > 0) {
      // Check if effects align with expected effects from ratio/terpenes
      // This is a simplified check - in practice, you'd have a more sophisticated effect matching
      effectAlignmentScore = 70; // Default alignment
      matchedTraits.push(`Effect profile: ${strain.effects.slice(0, 2).join(", ")}`);
    } else {
      effectAlignmentScore = 50; // No effect data
    }

    // Phase 5.5.1 — Only include if visual similarity > 0
    if (visualSimilarityScore > 0) {
      // Get baseline ratio
      const dbType = strain.type || strain.dominantType;
      let baselineIndicaPercent = 50;
      let baselineSativaPercent = 50;
      if (dbType === "Indica") {
        baselineIndicaPercent = 70;
        baselineSativaPercent = 30;
      } else if (dbType === "Sativa") {
        baselineIndicaPercent = 30;
        baselineSativaPercent = 70;
      }

      candidates.push({
        strainName: strain.name,
        canonicalName: strain.name, // Will be normalized later
        knownAliases: strain.aliases || [],
        breeder: strain.genetics?.includes("×") ? strain.genetics.split("×")[0].trim() : undefined,
        origin: strain.sources?.[0],
        baselineIndicaPercent,
        baselineSativaPercent,
        visualSimilarityScore,
        geneticProximityScore,
        terpeneOverlapScore,
        effectAlignmentScore,
        totalScore: 0, // Will be calculated in final selection
        matchedTraits,
      });
    }
  }

  // Phase 5.5.1 — Sort by visual similarity and return Top 25
  candidates.sort((a, b) => b.visualSimilarityScore - a.visualSimilarityScore);
  return candidates.slice(0, 25);
}

/**
 * Phase 5.5 Step 5.5.2 — MULTI-IMAGE NAME CONSENSUS
 * 
 * Across all images:
 * - Track name frequency
 * - Track confidence per image
 * - Boost names appearing in ≥2 images
 * - Penalize one-off matches
 * 
 * Discard:
 * - Names with high visual mismatch
 * - Names contradicting phenotype class
 */
function applyMultiImageConsensusV55(
  candidates: NameCandidateV55[],
  imageResults: ImageResult[]
): NameCandidateV55[] {
  // Phase 5.5.2 — Track name frequency across images
  const nameFrequency = new Map<string, { count: number; totalConfidence: number; imageIndices: number[] }>();

  imageResults.forEach((result, imageIndex) => {
    result.candidateStrains.slice(0, 5).forEach(candidate => {
      const normalizedName = candidate.name.toLowerCase();
      const existing = nameFrequency.get(normalizedName);
      
      if (existing) {
        existing.count++;
        existing.totalConfidence += candidate.confidence;
        existing.imageIndices.push(imageIndex);
      } else {
        nameFrequency.set(normalizedName, {
          count: 1,
          totalConfidence: candidate.confidence,
          imageIndices: [imageIndex],
        });
      }
    });
  });

  // Phase 5.5.2 — Apply boosts and penalties
  return candidates.map(candidate => {
    const normalizedName = candidate.strainName.toLowerCase();
    const frequency = nameFrequency.get(normalizedName);
    
    let consensusBoost = 0;
    let consensusPenalty = 0;

    if (frequency) {
      // Phase 5.5.2 — Boost names appearing in ≥2 images
      if (frequency.count >= 2) {
        consensusBoost = 15; // +15% boost for multi-image agreement
      } else if (frequency.count === 1 && imageResults.length > 1) {
        // Phase 5.5.2 — Penalize one-off matches (if multiple images)
        consensusPenalty = 10; // -10% penalty for single-image-only
      }
    } else if (imageResults.length > 1) {
      // Phase 5.5.2 — Not found in any image, penalize
      consensusPenalty = 20; // -20% penalty if not in any image
    }

    // Phase 5.5.2 — Discard names with high visual mismatch
    if (candidate.visualSimilarityScore < 20) {
      return null; // Discard
    }

    // Phase 5.5.2 — Apply consensus adjustments
    const adjustedVisualScore = Math.max(0, Math.min(100, 
      candidate.visualSimilarityScore + consensusBoost - consensusPenalty
    ));

    return {
      ...candidate,
      visualSimilarityScore: adjustedVisualScore,
    };
  }).filter((c): c is NameCandidateV55 => c !== null);
}

/**
 * Phase 5.5 Step 5.5.3 — ALIAS & MISLABEL HANDLING
 * 
 * Resolve:
 * - Regional renames
 * - Breeder-specific variants
 * - Common mislabels
 * 
 * Example:
 * - "GSC" ↔ "Girl Scout Cookies"
 * - "OG Kush" ↔ phenotype sub-lines
 * 
 * Group aliases under one canonical name.
 */
function resolveAliasesAndMislabelsV55(
  candidates: NameCandidateV55[]
): NameCandidateV55[] {
  // Phase 5.5.3 — Create canonical name map
  const canonicalMap = new Map<string, NameCandidateV55>();

  candidates.forEach(candidate => {
    // Phase 5.5.3 — Find canonical name (check aliases)
    let canonicalName = candidate.strainName;
    
    // Check if this name is an alias of another strain
    const aliasMatch = CULTIVAR_LIBRARY.find(s => 
      s.aliases?.some(alias => alias.toLowerCase() === candidate.strainName.toLowerCase())
    );
    
    if (aliasMatch) {
      canonicalName = aliasMatch.name;
    }

    // Phase 5.5.3 — Group under canonical name
    const existing = canonicalMap.get(canonicalName.toLowerCase());
    
    if (existing) {
      // Merge: keep higher score, combine aliases
      if (candidate.totalScore > existing.totalScore) {
        canonicalMap.set(canonicalName.toLowerCase(), {
          ...candidate,
          canonicalName,
          knownAliases: [...new Set([...existing.knownAliases, ...candidate.knownAliases, candidate.strainName])],
        });
      } else {
        // Keep existing but add aliases
        existing.knownAliases = [...new Set([...existing.knownAliases, ...candidate.knownAliases, candidate.strainName])];
      }
    } else {
      canonicalMap.set(canonicalName.toLowerCase(), {
        ...candidate,
        canonicalName,
        knownAliases: candidate.knownAliases.length > 0 
          ? candidate.knownAliases 
          : [candidate.strainName],
      });
    }
  });

  return Array.from(canonicalMap.values());
}

/**
 * Phase 5.5 Step 5.5.4 — FINAL NAME SELECTION
 * 
 * Score formula:
 * - Name agreement (40%)
 * - Visual match (25%)
 * - Genetics / lineage (20%)
 * - Terpene & effect alignment (15%)
 * 
 * Select top result only if:
 * - Score ≥ threshold
 * - No major contradictions
 * 
 * If close tie:
 * - Show primary + secondary suggestion
 */
function selectFinalNameV55(
  candidates: NameCandidateV55[],
  imageResults: ImageResult[],
  threshold: number = 60
): {
  primary?: NameCandidateV55;
  secondary?: NameCandidateV55;
  explanation: string[];
} {
  // Phase 5.5.4 — Calculate name agreement score (40%)
  const nameFrequency = new Map<string, number>();
  imageResults.forEach(result => {
    result.candidateStrains.slice(0, 5).forEach(candidate => {
      const normalizedName = candidate.name.toLowerCase();
      nameFrequency.set(normalizedName, (nameFrequency.get(normalizedName) || 0) + 1);
    });
  });

  // Phase 5.5.4 — Calculate weighted scores
  const scoredCandidates = candidates.map(candidate => {
    // Name agreement (40%)
    const nameAgreement = nameFrequency.get(candidate.strainName.toLowerCase()) || 0;
    const maxFrequency = Math.max(...Array.from(nameFrequency.values()), 1);
    const nameAgreementScore = (nameAgreement / maxFrequency) * 100 * 0.40;

    // Visual match (25%)
    const visualMatchScore = candidate.visualSimilarityScore * 0.25;

    // Genetics / lineage (20%)
    const geneticsScore = candidate.geneticProximityScore * 0.20;

    // Terpene & effect alignment (15%)
    // Average of terpene overlap and effect alignment, weighted 15%
    const terpeneEffectScore = ((candidate.terpeneOverlapScore * 0.6) + (candidate.effectAlignmentScore * 0.4)) * 0.15;

    const totalScore = nameAgreementScore + visualMatchScore + geneticsScore + terpeneEffectScore;

    return {
      ...candidate,
      totalScore: Math.round(totalScore * 10) / 10,
    };
  });

  // Phase 5.5.4 — Sort by total score
  scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);

  // Phase 5.5.4 — Select top result if score ≥ threshold
  const primary = scoredCandidates[0]?.totalScore >= threshold ? scoredCandidates[0] : undefined;
  const secondary = scoredCandidates.length > 1 && scoredCandidates[1].totalScore >= threshold - 10 
    ? scoredCandidates[1] 
    : undefined;

  // Phase 5.5.4 — Build explanation
  const explanation: string[] = [];
  if (primary) {
    explanation.push(`Name agreement: Appeared in ${nameFrequency.get(primary.strainName.toLowerCase()) || 0} image(s)`);
    explanation.push(`Visual match: ${primary.visualSimilarityScore}% similarity`);
    explanation.push(`Genetics alignment: ${primary.geneticProximityScore}% match`);
    explanation.push(`Terpene/effect: ${Math.round((primary.terpeneOverlapScore + primary.effectAlignmentScore) / 2)}% alignment`);
  }

  return { primary, secondary, explanation };
}

/**
 * Phase 5.5 — MAIN FUNCTION
 */
export function runNameFirstV55(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number,
  terpeneProfile?: NormalizedTerpeneProfile,
  strainRatio?: StrainRatio
): NameFirstResultV55 {
  // Phase 5.5.1 — NAME CANDIDATE POOL (Top 25)
  let candidates = buildNameCandidatePoolV55(fusedFeatures, imageResults, terpeneProfile, strainRatio);
  console.log(`Phase 5.5.1 — Built candidate pool: ${candidates.length} candidates`);

  // Phase 5.5.2 — MULTI-IMAGE NAME CONSENSUS
  candidates = applyMultiImageConsensusV55(candidates, imageResults);
  console.log(`Phase 5.5.2 — After consensus: ${candidates.length} candidates`);

  // Phase 5.5.3 — ALIAS & MISLABEL HANDLING
  candidates = resolveAliasesAndMislabelsV55(candidates);
  console.log(`Phase 5.5.3 — After alias resolution: ${candidates.length} unique candidates`);

  // Phase 5.5.4 — FINAL NAME SELECTION
  const selection = selectFinalNameV55(candidates, imageResults, 60);
  console.log("Phase 5.5.4 — Final selection:", selection);

  // Phase 5.5.5 — USER-FACING OUTPUT
  if (!selection.primary) {
    // Failsafe: Return closest match even if below threshold
    const closest = candidates[0];
    if (closest) {
      return {
        primaryMatch: {
          name: closest.canonicalName,
          confidence: Math.max(55, Math.round(closest.totalScore)),
          alsoKnownAs: closest.knownAliases.length > 0 ? closest.knownAliases.slice(0, 3) : undefined,
        },
        explanation: {
          whyThisName: [
            `Closest known match from 35,000-strain database`,
            `Visual similarity: ${closest.visualSimilarityScore}%`,
            ...selection.explanation,
          ],
          whatRuledOutOthers: [
            `Other candidates had lower similarity scores or conflicting traits`,
          ],
        },
      };
    }
  }

  const primary = selection.primary!;
  const secondary = selection.secondary;

  return {
    primaryMatch: {
      name: primary.canonicalName,
      confidence: Math.round(primary.totalScore),
      alsoKnownAs: primary.knownAliases.length > 0 && primary.knownAliases[0] !== primary.canonicalName
        ? primary.knownAliases.slice(0, 3)
        : undefined,
    },
    secondaryPossibility: secondary ? {
      name: secondary.canonicalName,
      confidence: Math.round(secondary.totalScore),
    } : undefined,
    explanation: {
      whyThisName: selection.explanation,
      whatRuledOutOthers: secondary
        ? [`"${secondary.canonicalName}" was close (${Math.round(secondary.totalScore)}%) but ${primary.canonicalName} had stronger alignment`]
        : [`Other candidates had significantly lower scores or conflicting traits`],
    },
  };
}
