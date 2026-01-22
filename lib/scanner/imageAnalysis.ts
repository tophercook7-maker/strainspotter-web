// lib/scanner/imageAnalysis.ts
// Phase 3.0 Part B — Per-Image Analysis
// Phase 3.1 Part A — Image Type Classification
// Phase 3.1 Part C — Apply Trait Weights

import type { WikiResult } from "./types";
import type { CandidateStrain, ImageResult } from "./consensusEngine";
import { matchStrainNameFirst } from "./nameFirstMatcher";
import { fuseMultiImageFeatures } from "./multiImageFusion";
import type { FusedFeatures } from "./multiImageFusion";
import { classifyImageType } from "./imageTypeClassifier";
import type { ImageObservation } from "./consensusEngine";
import { getTraitWeight, mapTraitToWeightable, type WeightableTrait } from "./traitWeights";

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

  // Phase 3.1 Part A — Classify image type
  const imageObservation = classifyImageType(wikiResult);
  console.log(`Image ${imageIndex} classified as: ${imageObservation.imageType} (${imageObservation.confidence}% confidence)`);

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

  // Phase 3.1 Part C — Apply trait weights before matching
  const traitWeights = {
    budStructure: getTraitWeight(imageObservation.imageType, "structure"),
    trichomeDensity: getTraitWeight(imageObservation.imageType, "trichomes"),
    pistilColor: getTraitWeight(imageObservation.imageType, "pistils"),
    leafShape: getTraitWeight(imageObservation.imageType, "leafShape"),
  };
  console.log(`Image ${imageIndex} trait weights:`, traitWeights);

  const nameFirstResult = matchStrainNameFirst(singleImageFused, 1);

  // Phase 3.1 Part C — Apply weights to candidate confidence
  // Multiply confidence by relevant trait weights based on matched traits
  const baseConfidence = nameFirstResult.confidence;
  const matchedTraitNames = nameFirstResult.primaryMatch.matchedTraits;
  
  // Calculate weighted average based on matched traits
  let totalWeight = 0;
  let weightedSum = 0;

  // Map matched traits to weights
  if (matchedTraitNames.some(t => t.toLowerCase().includes("bud") || t.toLowerCase().includes("density") || t.toLowerCase().includes("structure"))) {
    const weight = traitWeights.budStructure;
    weightedSum += baseConfidence * weight;
    totalWeight += weight;
  }
  if (matchedTraitNames.some(t => t.toLowerCase().includes("trichome"))) {
    const weight = traitWeights.trichomeDensity;
    weightedSum += baseConfidence * weight;
    totalWeight += weight;
  }
  if (matchedTraitNames.some(t => t.toLowerCase().includes("pistil") || t.toLowerCase().includes("color"))) {
    const weight = traitWeights.pistilColor;
    weightedSum += baseConfidence * weight;
    totalWeight += weight;
  }
  if (matchedTraitNames.some(t => t.toLowerCase().includes("leaf") || t.toLowerCase().includes("genetics"))) {
    const weight = traitWeights.leafShape;
    weightedSum += baseConfidence * weight;
    totalWeight += weight;
  }

  // If we have weighted traits, use weighted average
  let weightedConfidence = baseConfidence;
  if (totalWeight > 0) {
    weightedConfidence = Math.round(weightedSum / totalWeight);
  } else {
    // Default: apply average weight
    const avgWeight = (traitWeights.budStructure + traitWeights.trichomeDensity + traitWeights.pistilColor + traitWeights.leafShape) / 4;
    weightedConfidence = Math.round(baseConfidence * avgWeight);
  }

  // Clamp to 60-99% range
  weightedConfidence = Math.max(60, Math.min(99, weightedConfidence));

  // Phase 3.1 Part C — Ignore LOW weighted traits if conflicting
  // Filter out traits that are marked as low/very_low and conflict with high-weighted traits
  const filteredTraits = nameFirstResult.primaryMatch.matchedTraits.filter(trait => {
    const traitLower = trait.toLowerCase();
    
    // If it's a structure trait and structure weight is low, only keep if no high-weighted traits match
    if ((traitLower.includes("bud") || traitLower.includes("structure")) && traitWeights.budStructure < 0.8) {
      const hasHighWeightMatch = matchedTraitNames.some(t => {
        const tLower = t.toLowerCase();
        return (
          (tLower.includes("trichome") && traitWeights.trichomeDensity >= 1.0) ||
          (tLower.includes("pistil") && traitWeights.pistilColor >= 1.0) ||
          (tLower.includes("leaf") && traitWeights.leafShape >= 1.0)
        );
      });
      return !hasHighWeightMatch; // Keep if no high-weighted matches exist
    }
    
    // Similar logic for other low-weighted traits
    return true; // Default: keep the trait
  });

  // Build candidate strains array (top 3 matches) with weighted confidence
  const candidateStrains: CandidateStrain[] = [
    {
      name: nameFirstResult.primaryMatch.name,
      confidence: weightedConfidence, // Phase 3.1 Part C — Use weighted confidence
      traitsMatched: filteredTraits.length > 0 ? filteredTraits : nameFirstResult.primaryMatch.matchedTraits, // Phase 3.1 Part C — Use filtered traits
    },
    ...nameFirstResult.alsoSimilar.slice(0, 2).map(alt => ({
      name: alt.name,
      confidence: Math.max(60, weightedConfidence - 15), // Lower confidence for alternates, also weighted
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

  // Phase 4.0.1 — Generate visual embedding from features for diversity checking
  // Phase 4.0.4 — Store embedding for duplicate detection
  const visualEmbedding: number[] = [
    weightedConfidence / 100, // Normalize confidence to 0-1
    traitWeights.budStructure,
    traitWeights.trichomeDensity,
    traitWeights.pistilColor,
    traitWeights.leafShape,
    imageObservation.confidence / 100, // Normalize observation confidence
    detectedTraits.budStructure === "high" ? 1 : detectedTraits.budStructure === "low" ? 0 : 0.5,
    detectedTraits.trichomeDensity === "high" ? 1 : detectedTraits.trichomeDensity === "low" ? 0 : 0.5,
    wikiResult.identity.confidence / 100, // Normalize wiki confidence
  ];
  const imageHash = generateImageHash(visualEmbedding);

  return {
    imageIndex,
    candidateStrains,
    detectedTraits,
    uncertaintySignals,
    wikiResult,
    imageObservation, // Phase 3.1 Part A — Include image type observation
    imageHash, // Phase 4.0.1 — Hash for diversity checking
    embedding: visualEmbedding, // Phase 4.0.4 — Visual embedding for duplicate detection
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

/**
 * Phase 4.0.1 — Generate stable hash from image features for diversity checking
 */
export function generateImageHash(features: number[]): string {
  return features.map(v => Math.round(v * 10)).join("");
}
