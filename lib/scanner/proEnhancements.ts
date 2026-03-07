// Phase 5.3.7 — PRO DIFFERENTIATION (NOT GATING)
// lib/scanner/proEnhancements.ts

/**
 * Phase 5.3.7 — PRO DIFFERENTIATION (NOT GATING)
 * 
 * Pro unlocks:
 * - Why-this-name-won breakdown (detailed)
 * - Clone/phenotype explanation
 * - Per-image analysis
 * - Confidence delta if more images added
 * 
 * Never downgrade free results.
 * Pro features are additions, not replacements.
 */

import type { FinalDecision } from "./finalDecisionEngine";
import type { ImageResult } from "./consensusEngine";
import type { CandidateMatch } from "./topKCandidateSelection";

export type ProEnhancements = {
  detailedWhyThisNameWon: string[]; // Detailed breakdown (more than free tier's 3 reasons)
  clonePhenotypeExplanation: string | null; // Clone/phenotype explanation
  perImageAnalysis: Array<{
    imageIndex: number;
    identifiedStrain: string;
    confidence: number;
    keyTraits: string[];
    whyThisStrain: string[];
  }>;
  confidenceDelta: {
    currentConfidence: number;
    estimatedConfidenceWithMoreImages: number;
    delta: number;
    explanation: string;
  } | null;
};

/**
 * Phase 5.3.7.1 — Generate Detailed Why-This-Name-Won Breakdown
 * 
 * Pro version: More detailed breakdown with scoring, channel analysis, etc.
 */
export function generateDetailedWhyThisNameWon(
  finalDecision: FinalDecision,
  primaryCandidate: CandidateMatch
): string[] {
  const breakdown: string[] = [];
  
  // Channel-by-channel breakdown
  const channelScores = primaryCandidate.channelScores;
  
  // Visual channel
  if (channelScores.visual >= 0.8) {
    breakdown.push(`Visual match: ${Math.round(channelScores.visual * 100)}% (excellent alignment with bud structure, trichomes, and coloration)`);
  } else if (channelScores.visual >= 0.6) {
    breakdown.push(`Visual match: ${Math.round(channelScores.visual * 100)}% (good alignment with observed traits)`);
  } else {
    breakdown.push(`Visual match: ${Math.round(channelScores.visual * 100)}% (moderate visual similarity)`);
  }
  
  // Genetics channel
  if (channelScores.genetics >= 0.8) {
    breakdown.push(`Genetic alignment: ${Math.round(channelScores.genetics * 100)}% (strong lineage match in database)`);
  } else if (channelScores.genetics >= 0.6) {
    breakdown.push(`Genetic alignment: ${Math.round(channelScores.genetics * 100)}% (family-level match confirmed)`);
  } else {
    breakdown.push(`Genetic alignment: ${Math.round(channelScores.genetics * 100)}% (partial genetic similarity)`);
  }
  
  // Terpene channel
  if (channelScores.terpenes >= 0.7) {
    breakdown.push(`Terpene profile: ${Math.round(channelScores.terpenes * 100)}% match (dominant terpenes align with expected profile)`);
  } else if (channelScores.terpenes >= 0.5) {
    breakdown.push(`Terpene profile: ${Math.round(channelScores.terpenes * 100)}% match (some terpene overlap detected)`);
  }
  
  // Effect channel
  if (channelScores.effects >= 0.7) {
    breakdown.push(`Effect profile: ${Math.round(channelScores.effects * 100)}% match (expected effects align with strain characteristics)`);
  } else if (channelScores.effects >= 0.5) {
    breakdown.push(`Effect profile: ${Math.round(channelScores.effects * 100)}% match (partial effect alignment)`);
  }
  
  // Fingerprint score
  breakdown.push(`Overall fingerprint score: ${Math.round(finalDecision.fingerprintScore * 100)}%`);
  
  // Cross-image agreement
  if (finalDecision.crossImageAgreement >= 0.8) {
    breakdown.push(`Cross-image agreement: ${Math.round(finalDecision.crossImageAgreement * 100)}% (strong consensus across all images)`);
  } else if (finalDecision.crossImageAgreement >= 0.6) {
    breakdown.push(`Cross-image agreement: ${Math.round(finalDecision.crossImageAgreement * 100)}% (good agreement across images)`);
  }
  
  // Contradiction score (lower is better)
  if (finalDecision.contradictionScore < 0.2) {
    breakdown.push(`Signal consistency: ${Math.round((1 - finalDecision.contradictionScore) * 100)}% (minimal contradictions detected)`);
  } else if (finalDecision.contradictionScore < 0.4) {
    breakdown.push(`Signal consistency: ${Math.round((1 - finalDecision.contradictionScore) * 100)}% (some signal variation noted)`);
  }
  
  return breakdown;
}

/**
 * Phase 5.3.7.2 — Generate Clone/Phenotype Explanation
 * 
 * Explains clone variants, phenotypes, and naming variations.
 */
export function generateClonePhenotypeExplanation(
  primaryCandidate: CandidateMatch,
  alternates: CandidateMatch[]
): string | null {
  // Check if clone detection was triggered
  if (primaryCandidate.isClone || primaryCandidate.groupId) {
    const groupMembers = primaryCandidate.groupMembers || [];
    
    if (groupMembers.length > 1) {
      return `This identification represents a known clone group. The name "${primaryCandidate.strainName}" is the primary identifier, but this cultivar is also known as: ${groupMembers.slice(0, 3).join(", ")}. These are likely the same genetic cultivar with different naming conventions or regional variations.`;
    }
    
    if (primaryCandidate.isClone) {
      return `This strain has multiple named variants (clones/phenotypes). The selected name "${primaryCandidate.strainName}" is the most common identifier, but other names may refer to the same genetic lineage.`;
    }
  }
  
  // Check for similar alternates (potential clones)
  const similarAlternates = alternates.filter(alt => 
    alt.fingerprintSimilarity && alt.fingerprintSimilarity >= 0.85
  );
  
  if (similarAlternates.length > 0) {
    const alternateNames = similarAlternates.slice(0, 3).map(a => a.strainName).join(", ");
    return `Very similar matches found: ${alternateNames}. These may represent different phenotypes or naming variations of the same genetic lineage.`;
  }
  
  return null;
}

/**
 * Phase 5.3.7.3 — Generate Per-Image Analysis
 * 
 * Detailed analysis for each individual image.
 */
export function generatePerImageAnalysis(
  imageResults: ImageResult[],
  primaryStrainName: string
): Array<{
  imageIndex: number;
  identifiedStrain: string;
  confidence: number;
  keyTraits: string[];
  whyThisStrain: string[];
}> {
  return imageResults.map((result, idx) => {
    // Find primary strain in this image's candidates
    const imageCandidate = result.candidateStrains?.find(c => c.name === primaryStrainName);
    
    const keyTraits: string[] = [];
    if (result.detectedTraits.budStructure) {
      keyTraits.push(`Bud structure: ${result.detectedTraits.budStructure}`);
    }
    if (result.detectedTraits.trichomeDensity) {
      keyTraits.push(`Trichome density: ${result.detectedTraits.trichomeDensity}`);
    }
    if (result.detectedTraits.pistilColor) {
      keyTraits.push(`Pistil color: ${result.detectedTraits.pistilColor}`);
    }
    if (result.detectedTraits.leafShape) {
      keyTraits.push(`Leaf shape: ${result.detectedTraits.leafShape}`);
    }
    
    const whyThisStrain: string[] = [];
    if (imageCandidate) {
      whyThisStrain.push(`Matched in this image with ${Math.round((imageCandidate.confidence || 0.7) * 100)}% confidence`);
    } else {
      whyThisStrain.push(`Identified through consensus with other images`);
    }
    
    if (result.inferredAngle) {
      whyThisStrain.push(`Angle: ${result.inferredAngle}`);
    }
    
    return {
      imageIndex: idx + 1,
      identifiedStrain: primaryStrainName,
      confidence: imageCandidate ? Math.round((imageCandidate.confidence || 0.7) * 100) : 70,
      keyTraits,
      whyThisStrain,
    };
  });
}

/**
 * Phase 5.3.7.4 — Calculate Confidence Delta
 * 
 * Estimates how confidence would change with more images.
 */
export function calculateConfidenceDelta(
  currentConfidence: number,
  imageCount: number,
  imageDiversityScore: number,
  crossImageAgreement: number
): {
  currentConfidence: number;
  estimatedConfidenceWithMoreImages: number;
  delta: number;
  explanation: string;
} | null {
  // Only show if less than 5 images (room for improvement)
  if (imageCount >= 5) {
    return null;
  }
  
  // Estimate confidence with 1-2 more diverse images
  const additionalImages = Math.min(2, 5 - imageCount);
  let estimatedConfidence = currentConfidence;
  
  // Boost for additional images (based on current diversity and agreement)
  if (imageDiversityScore >= 0.7 && crossImageAgreement >= 0.8) {
    // High diversity + high agreement = good boost potential
    estimatedConfidence = Math.min(99, currentConfidence + (additionalImages * 5));
  } else if (imageDiversityScore >= 0.5 && crossImageAgreement >= 0.7) {
    // Moderate diversity + good agreement = moderate boost
    estimatedConfidence = Math.min(99, currentConfidence + (additionalImages * 3));
  } else {
    // Low diversity or low agreement = smaller boost
    estimatedConfidence = Math.min(99, currentConfidence + (additionalImages * 2));
  }
  
  const delta = estimatedConfidence - currentConfidence;
  
  if (delta <= 0) {
    return null; // No improvement expected
  }
  
  let explanation: string;
  if (additionalImages === 1) {
    explanation = `Adding 1 more diverse angle could increase confidence by approximately ${delta}%`;
  } else {
    explanation = `Adding ${additionalImages} more diverse angles could increase confidence by approximately ${delta}%`;
  }
  
  return {
    currentConfidence,
    estimatedConfidenceWithMoreImages: estimatedConfidence,
    delta,
    explanation,
  };
}

/**
 * Phase 5.3.7 — Generate Pro Enhancements
 * 
 * Creates all pro-only enhancements without affecting free tier results.
 */
export function generateProEnhancements(args: {
  finalDecision: FinalDecision;
  primaryCandidate: CandidateMatch;
  imageResults: ImageResult[];
  imageCount: number;
  imageDiversityScore?: number;
  isProTier: boolean;
}): ProEnhancements | null {
  const {
    finalDecision,
    primaryCandidate,
    imageResults,
    imageCount,
    imageDiversityScore = 0.7,
    isProTier,
  } = args;
  
  // Only generate if pro tier
  if (!isProTier) {
    return null;
  }
  
  return {
    detailedWhyThisNameWon: generateDetailedWhyThisNameWon(finalDecision, primaryCandidate),
    clonePhenotypeExplanation: generateClonePhenotypeExplanation(
      primaryCandidate,
      finalDecision.alternates.map(alt => ({
        strainName: alt.name,
        overallScore: alt.score || 0.7,
        channelScores: {
          visual: 0.7,
          genetics: 0.7,
          terpenes: 0.6,
          effects: 0.6,
        },
        fingerprintSimilarity: 0.8,
        isClone: false,
        groupId: undefined,
        groupMembers: [],
      } as CandidateMatch))
    ),
    perImageAnalysis: generatePerImageAnalysis(imageResults, finalDecision.primaryStrainName),
    confidenceDelta: calculateConfidenceDelta(
      finalDecision.confidence,
      imageCount,
      imageDiversityScore,
      finalDecision.crossImageAgreement
    ),
  };
}
