// lib/scanner/imageAnalysis.ts
// Phase 3.0 Part B — Per-Image Analysis

import type { WikiResult } from "./types";
import type { CandidateStrain, ImageResult } from "./consensusEngine";
import { matchStrainNameFirst } from "./nameFirstMatcher";
import { fuseMultiImageFeatures } from "./multiImageFusion";
import type { FusedFeatures } from "./multiImageFusion";

/**
 * Phase 3.0 Part B — Analyze single image independently
 * Produce ImageResult with candidateStrains[] array
 */
export async function analyzeImage(
  image: File,
  imageIndex: number,
  totalImages: number
): Promise<ImageResult> {
  // Run wiki engine independently for this image
  const { runWikiEngine } = await import("./wikiEngine");
  const wikiResult = await runWikiEngine(image, totalImages);

  // Extract detected traits
  const detectedTraits = {
    budStructure: extractBudStructure(wikiResult.morphology.budStructure),
    trichomeDensity: extractTrichomeDensity(wikiResult.morphology.trichomes),
    pistilColor: extractPistilColor(wikiResult.morphology.coloration),
    leafShape: wikiResult.genetics.dominance === "Indica" || wikiResult.genetics.dominance === "Hybrid" 
      ? "broad" as const
      : "narrow" as const,
  };

  // Get candidate strains using name-first matcher
  // Create a single-image fused features for this image
  const singleImageFused: FusedFeatures = {
    trichomeDensity: detectedTraits.trichomeDensity || "medium",
    pistilColor: detectedTraits.pistilColor || "orange",
    leafShape: detectedTraits.leafShape || "broad",
    budStructure: detectedTraits.budStructure || "medium",
    colorProfile: wikiResult.morphology.coloration || "Deep green",
    variance: 0, // Single image = no variance
  };

  const nameFirstResult = matchStrainNameFirst(singleImageFused, 1);

  // Build candidate strains array (top 3 matches)
  const candidateStrains: CandidateStrain[] = [
    {
      name: nameFirstResult.primaryMatch.name,
      confidence: nameFirstResult.confidence,
      traitsMatched: nameFirstResult.primaryMatch.matchedTraits,
    },
    ...nameFirstResult.alsoSimilar.slice(0, 2).map(alt => ({
      name: alt.name,
      confidence: Math.max(60, nameFirstResult.confidence - 15), // Lower confidence for alternates
      traitsMatched: [],
    })),
  ];

  // Extract uncertainty signals
  const uncertaintySignals: string[] = [];
  if (wikiResult.reasoning?.conflictingSignals) {
    uncertaintySignals.push(...wikiResult.reasoning.conflictingSignals);
  }
  if (totalImages === 1) {
    uncertaintySignals.push("Single image analysis has limited perspective");
  }
  if (nameFirstResult.confidence < 75) {
    uncertaintySignals.push("Visual features show moderate variation");
  }

  return {
    imageIndex,
    candidateStrains,
    detectedTraits,
    uncertaintySignals,
    wikiResult,
  };
}

/**
 * Extract bud structure from description
 */
function extractBudStructure(description: string): "low" | "medium" | "high" | undefined {
  const desc = description.toLowerCase();
  if (desc.includes("dense") || desc.includes("compact") || desc.includes("chunky")) {
    return "high";
  } else if (desc.includes("airy") || desc.includes("elongated") || desc.includes("loose")) {
    return "low";
  } else if (desc.includes("moderate") || desc.includes("balanced")) {
    return "medium";
  }
  return undefined;
}

/**
 * Extract trichome density from description
 */
function extractTrichomeDensity(description: string): "low" | "medium" | "high" | undefined {
  const desc = description.toLowerCase();
  if (desc.includes("very") || desc.includes("extremely") || desc.includes("heavy") || desc.includes("abundant")) {
    return "high";
  } else if (desc.includes("light") || desc.includes("sparse")) {
    return "low";
  } else if (desc.includes("moderate") || desc.includes("visible")) {
    return "medium";
  }
  return undefined;
}

/**
 * Extract pistil color from description
 */
function extractPistilColor(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes("amber")) return "amber";
  if (desc.includes("orange")) return "orange";
  if (desc.includes("white")) return "white";
  if (desc.includes("pink")) return "pink";
  return "orange"; // Default
}
