// lib/scanner/consensusEngine.ts
// Phase 2.7 Part N — Multi-Image Consensus Matching

import type { WikiResult } from "./types";
import type { FusedFeatures } from "./multiImageFusion";
import type { StrainMatch } from "./nameFirstMatcher";
import { matchStrainNameFirst } from "./nameFirstMatcher";

export type ImageAngle = "top" | "side" | "macro";

export type MultiImageScanInput = {
  images: File[]; // Actual image files
  angles?: ImageAngle[]; // Optional angle hints
};

export type ImageScanResult = {
  imageIndex: number;
  strainCandidate: string;
  confidenceScore: number;
  keyTraits: string[];
  wikiResult: WikiResult;
};

export type ConsensusResult = {
  strainName: string; // Phase 2.7 Part N Step 5 — Name First Guarantee
  confidenceRange: { min: number; max: number; explanation: string };
  whyThisMatch: string;
  alternateMatches: Array<{
    name: string;
    whyNotPrimary: string;
  }>;
  lowConfidence: boolean; // Phase 2.7 Part N Step 6 — Fallback Rule
  agreementLevel: "high" | "medium" | "low"; // How many images agreed
};

/**
 * Phase 2.7 Part N Step 2 — Per-Image Analysis
 * Run wiki engine independently for each image
 */
export async function analyzePerImage(
  images: File[],
  imageCount: number
): Promise<ImageScanResult[]> {
  const results: ImageScanResult[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    // Run wiki engine for this image
    const wikiResult = await import("./wikiEngine").then(m => 
      m.runWikiEngine(image, imageCount)
    );

    // Extract strain candidate and confidence
    const strainCandidate = wikiResult.identity.strainName || "Unknown";
    const confidenceScore = wikiResult.identity.confidence || 60;

    // Extract key traits
    const keyTraits: string[] = [];
    if (wikiResult.morphology.budStructure) {
      keyTraits.push(wikiResult.morphology.budStructure);
    }
    if (wikiResult.morphology.trichomes) {
      keyTraits.push(wikiResult.morphology.trichomes);
    }
    if (wikiResult.genetics.dominance) {
      keyTraits.push(wikiResult.genetics.dominance);
    }

    results.push({
      imageIndex: i,
      strainCandidate,
      confidenceScore,
      keyTraits,
      wikiResult,
    });
  }

  return results;
}

/**
 * Phase 2.7 Part N Step 3 — Consensus Engine
 * Build consensus result from multiple image scan results
 */
export function buildConsensusResult(
  imageResults: ImageScanResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number
): ConsensusResult {
  if (imageResults.length === 0) {
    throw new Error("No image results provided for consensus");
  }

  // Count strain name matches across images
  const strainCounts = new Map<string, { count: number; totalConfidence: number; traits: Set<string> }>();
  
  imageResults.forEach(result => {
    const name = result.strainCandidate;
    if (name && name !== "Unknown") {
      const existing = strainCounts.get(name) || { count: 0, totalConfidence: 0, traits: new Set<string>() };
      existing.count++;
      existing.totalConfidence += result.confidenceScore;
      result.keyTraits.forEach(trait => existing.traits.add(trait));
      strainCounts.set(name, existing);
    }
  });

  // Phase 2.7 Part N Step 3 — Weight by confidence and count
  // If ≥2 images agree → boost confidence
  // If all differ → choose highest overlap of traits
  
  let primaryStrain = "";
  let maxScore = 0;

  // Score each strain by agreement
  strainCounts.forEach((data, strainName) => {
    const avgConfidence = data.totalConfidence / data.count;
    const agreementBonus = data.count >= 2 ? (data.count - 1) * 10 : 0; // +10% per additional agreeing image
    const score = avgConfidence + agreementBonus;

    if (score > maxScore) {
      maxScore = score;
      primaryStrain = strainName;
    }
  });

  // Determine agreement level based on final primary strain
  let agreementLevel: "high" | "medium" | "low" = "low";
  if (primaryStrain) {
    const primaryData = strainCounts.get(primaryStrain);
    if (primaryData) {
      const agreementRatio = primaryData.count / imageResults.length;
      if (agreementRatio >= 0.8) {
        agreementLevel = "high";
      } else if (primaryData.count >= 2) {
        agreementLevel = "medium";
      } else {
        agreementLevel = "low";
      }
    }
  }

  // If no consensus, use name-first matcher as fallback
  if (!primaryStrain || primaryStrain === "Unknown") {
    const nameFirstResult = matchStrainNameFirst(fusedFeatures, imageCount);
    primaryStrain = nameFirstResult.primaryMatch.name;
  }

  // Phase 2.7 Part N Step 4 — Confidence Normalization
  // Range format, cap max at 96%, NEVER show 100%
  const baseConfidence = Math.min(96, Math.max(60, Math.round(maxScore)));
  const rangeWidth = agreementLevel === "high" ? 4 : agreementLevel === "medium" ? 6 : 8;
  const confidenceMin = Math.max(60, baseConfidence - Math.floor(rangeWidth / 2));
  const confidenceMax = Math.min(96, baseConfidence + Math.ceil(rangeWidth / 2));

  // Phase 2.7 Part N Step 6 — Fallback Rule
  const lowConfidence = confidenceMax < 70;

  // Generate why this match explanation
  const agreeingImages = imageResults.filter(r => r.strainCandidate === primaryStrain).length;
  let whyThisMatch = "";
  if (agreeingImages >= 2) {
    whyThisMatch = `${agreeingImages} out of ${imageResults.length} images identified this as ${primaryStrain}. `;
    whyThisMatch += `Visual traits including ${Array.from(strainCounts.get(primaryStrain)?.traits || []).slice(0, 3).join(", ")} showed consistent agreement.`;
  } else {
    whyThisMatch = `Based on fused visual features across ${imageResults.length} images, ${primaryStrain} best matches the observed morphology. `;
    whyThisMatch += `While images showed some variation, the dominant traits consistently pointed to this cultivar.`;
  }

  // Get alternate matches (other strains that appeared)
  const alternateMatches: Array<{ name: string; whyNotPrimary: string }> = [];
  const sortedStrains = Array.from(strainCounts.entries())
    .sort((a, b) => {
      const scoreA = (a[1].totalConfidence / a[1].count) + (a[1].count >= 2 ? (a[1].count - 1) * 10 : 0);
      const scoreB = (b[1].totalConfidence / b[1].count) + (b[1].count >= 2 ? (b[1].count - 1) * 10 : 0);
      return scoreB - scoreA;
    })
    .filter(([name]) => name !== primaryStrain)
    .slice(0, 3);

  sortedStrains.forEach(([name, data]) => {
    const count = data.count;
    const whyNot = count === 1 
      ? "Only appeared in one image"
      : `Appeared in ${count} images but with lower confidence`;
    alternateMatches.push({ name, whyNotPrimary: whyNot });
  });

  // If we don't have enough alternates, use name-first matcher
  if (alternateMatches.length < 2) {
    const nameFirstResult = matchStrainNameFirst(fusedFeatures, imageCount);
    nameFirstResult.alsoSimilar.slice(0, 2 - alternateMatches.length).forEach(alt => {
      if (!alternateMatches.find(a => a.name === alt.name)) {
        alternateMatches.push(alt);
      }
    });
  }

  return {
    strainName: primaryStrain, // Phase 2.7 Part N Step 5 — Always present
    confidenceRange: {
      min: confidenceMin,
      max: confidenceMax,
      explanation: agreementLevel === "high" 
        ? "High agreement across multiple images"
        : agreementLevel === "medium"
        ? "Moderate agreement with some variation"
        : "Lower agreement due to image variation",
    },
    whyThisMatch,
    alternateMatches: alternateMatches.slice(0, 3), // Max 3 alternates
    lowConfidence, // Phase 2.7 Part N Step 6
    agreementLevel,
  };
}
