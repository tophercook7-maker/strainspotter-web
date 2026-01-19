// lib/scanner/nameFirstMatcher.ts
// Phase 2.2 Part D — Name-First Matching
// Match strain name BEFORE effects using fused features

import type { FusedFeatures } from "./multiImageFusion";
import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";

export type StrainMatch = {
  name: string;
  score: number; // 0-100
  confidence: number; // 60-99
  whyThisMatch: string;
  matchedTraits: string[];
  whyNotPrimary?: string;
};

export type NameFirstResult = {
  primaryMatch: StrainMatch;
  alsoSimilar: Array<{
    name: string;
    whyNotPrimary: string;
  }>;
  confidence: number; // Legacy single value
  confidenceRange: { min: number; max: number; explanation: string }; // Phase 2.5 Part L Step 2
  imageCountBonus: number;
  variancePenalty: number;
};

/**
 * Compare fused features to strain visual profile
 */
function compareToStrain(fused: FusedFeatures, strain: CultivarReference): {
  score: number;
  matchedTraits: string[];
} {
  let score = 0;
  const matchedTraits: string[] = [];

  // Use visualProfile if available, fall back to morphology
  const visualProfile = strain.visualProfile || {
    trichomeDensity: strain.morphology.trichomeDensity,
    pistilColor: strain.morphology.pistilColor,
    budStructure: strain.morphology.budDensity,
    leafShape: strain.morphology.leafShape,
    colorProfile: "",
  };

  // Bud density match (25 points)
  if (fused.budStructure === visualProfile.budStructure) {
    score += 25;
    matchedTraits.push("Bud density matches");
  }

  // Trichome density match (25 points)
  if (fused.trichomeDensity === visualProfile.trichomeDensity) {
    score += 25;
    matchedTraits.push("Trichome density matches");
  }

  // Leaf shape match (20 points)
  if (fused.leafShape === visualProfile.leafShape) {
    score += 20;
    matchedTraits.push("Leaf shape matches");
  }

  // Pistil color match (15 points)
  if (visualProfile.pistilColor.some(c => c.toLowerCase() === fused.pistilColor.toLowerCase())) {
    score += 15;
    matchedTraits.push("Pistil color matches");
  }

  // Genetics type match (15 points)
  // This is inferred from leaf shape and other traits
  const strainType = strain.type || strain.dominantType;
  if (fused.leafShape === "broad" && (strainType === "Indica" || strainType === "Hybrid")) {
    score += 15;
    matchedTraits.push("Genetics type aligns");
  } else if (fused.leafShape === "narrow" && (strainType === "Sativa" || strainType === "Hybrid")) {
    score += 15;
    matchedTraits.push("Genetics type aligns");
  }

  return {
    score: Math.min(100, score),
    matchedTraits,
  };
}

/**
 * Calculate confidence with image count bonus and variance penalty
 * Phase 2.3 Part I — Confidence Governor
 * Phase 2.5 Part L Step 2 — Confidence as Range
 */
function calculateConfidence(
  topScore: number,
  imageCount: number,
  variance: number
): {
  confidence: number; // Legacy single value
  confidenceRange: { min: number; max: number; explanation: string };
  imageCountBonus: number;
  variancePenalty: number;
} {
  const imageCountBonus = imageCount * 3;
  const variancePenalty = variance * 0.1; // Scale variance to penalty

  const baseConfidence = (topScore / 100) * 100;
  let adjustedConfidence = baseConfidence + imageCountBonus - variancePenalty;

  // Phase 2.3 Part I — Confidence Governor Rules
  // 95-99% ONLY if: 3+ images, low variance, strong match
  if (imageCount >= 3 && variance < 20 && topScore >= 80) {
    adjustedConfidence = Math.min(99, adjustedConfidence);
  } else if (imageCount >= 3 && variance < 30 && topScore >= 70) {
    adjustedConfidence = Math.min(94, adjustedConfidence);
  }
  
  // Cap at 85% if: single image, conflicting traits, or poor conditions
  if (imageCount === 1) {
    adjustedConfidence = Math.min(85, adjustedConfidence);
  }
  
  if (variance > 40) {
    adjustedConfidence = Math.min(85, adjustedConfidence);
  }

  // Phase 2.7 Part N Step 4 — Confidence Normalization: Cap max at 96%, NEVER show 100%
  const confidence = Math.max(60, Math.min(96, Math.round(adjustedConfidence)));

  // Phase 2.5 Part L Step 2 — Confidence as Range
  // Phase 2.7 Part N Step 4 — Cap max at 96%, NEVER show 100%
  const rangeWidth = Math.max(5, Math.min(15, Math.round(variance / 2) + (imageCount === 1 ? 10 : 0)));
  const rangeMin = Math.max(60, Math.min(96, confidence - Math.floor(rangeWidth / 2)));
  const rangeMax = Math.min(96, Math.max(60, confidence + Math.ceil(rangeWidth / 2)));

  // Generate explanation for range
  let rangeExplanation = "Confidence range accounts for ";
  const factors: string[] = [];
  if (imageCount === 1) {
    factors.push("single image limitations");
  }
  if (variance > 20) {
    factors.push("phenotype variation across images");
  }
  if (variance > 30) {
    factors.push("lighting differences");
  }
  if (imageCount < 3) {
    factors.push("limited viewing angles");
  }
  if (factors.length === 0) {
    factors.push("natural variation in visual characteristics");
  }
  rangeExplanation += factors.join(", ") + ".";

  return {
    confidence, // Legacy
    confidenceRange: {
      min: rangeMin,
      max: rangeMax,
      explanation: rangeExplanation,
    },
    imageCountBonus,
    variancePenalty: Math.round(variancePenalty),
  };
}

/**
 * Generate "why this strain" explanation
 */
function generateWhyThisStrain(
  primary: StrainMatch,
  alternates: StrainMatch[],
  fused: FusedFeatures
): string {
  const traitList = primary.matchedTraits.join(", ");
  const imageCount = fused.variance === 0 ? "all" : "multiple";
  
  let explanation = `${primary.name} was identified as the primary match based on ${traitList}. `;
  
  if (fused.variance < 20) {
    explanation += `Visual features showed strong agreement across ${imageCount} images, with consistent morphological traits. `;
  } else {
    explanation += `While some variation was observed across images, the dominant features consistently pointed to ${primary.name}. `;
  }

  if (alternates.length > 0) {
    const topAlternate = alternates[0];
    const scoreDiff = primary.score - topAlternate.score;
    if (scoreDiff > 15) {
      explanation += `${topAlternate.name} ranked second but scored ${scoreDiff} points lower, primarily due to ${topAlternate.whyNotPrimary || "fewer matching traits"}.`;
    } else {
      explanation += `${topAlternate.name} was a close second, differing mainly in ${topAlternate.whyNotPrimary || "subtle morphological differences"}.`;
    }
  }

  return explanation;
}

/**
 * Match strain name FIRST using fused features
 * Phase 2.2 Part D — Name-First Matching
 */
export function matchStrainNameFirst(
  fused: FusedFeatures,
  imageCount: number
): NameFirstResult {
  // Score all strains
  const scored: StrainMatch[] = [];

  for (const strain of CULTIVAR_LIBRARY) {
    const { score, matchedTraits } = compareToStrain(fused, strain);

    if (score > 0) {
      scored.push({
        name: strain.name,
        score,
        confidence: 0, // Will be calculated later
        whyThisMatch: matchedTraits.join(", "),
        matchedTraits,
      });
    }
  }

  // Sort by score DESC
  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    // Fallback
    return {
      primaryMatch: {
        name: "Phenotype-Closest Hybrid",
        score: 0,
        confidence: 60,
        whyThisMatch: "No strong cultivar match found",
        matchedTraits: [],
      },
      alsoSimilar: [],
      confidence: 60, // Legacy
      confidenceRange: {
        min: 55,
        max: 65,
        explanation: "Confidence range accounts for limited visual match data and natural variation in visual characteristics.",
      },
      imageCountBonus: imageCount * 3,
      variancePenalty: 0,
    };
  }

  // Calculate confidence for primary match
  const primary = scored[0];
  const { confidence, confidenceRange, imageCountBonus, variancePenalty } = calculateConfidence(
    primary.score,
    imageCount,
    fused.variance
  );

  primary.confidence = confidence;

  // Generate why not primary for alternates
  const alternates = scored.slice(1, 4).map((alt, idx) => {
    const primaryTraits = primary.matchedTraits;
    const altTraits = alt.matchedTraits;
    const missingTraits = primaryTraits.filter(t => !altTraits.includes(t));
    
    let whyNot = "Fewer matching traits";
    if (missingTraits.length > 0) {
      whyNot = `Missing: ${missingTraits[0]}`;
    } else if (alt.score < primary.score - 10) {
      whyNot = "Lower overall feature alignment";
    }

    return {
      ...alt,
      whyNotPrimary: whyNot,
    };
  });

  // Generate explanation
  const whyThisMatch = generateWhyThisStrain(primary, alternates, fused);

  return {
    primaryMatch: {
      ...primary,
      whyThisMatch,
    },
    alsoSimilar: alternates.map(a => ({
      name: a.name,
      whyNotPrimary: a.whyNotPrimary || "Lower score",
    })),
    confidence, // Legacy
    confidenceRange, // Phase 2.5 Part L Step 2
    imageCountBonus,
    variancePenalty,
  };
}
