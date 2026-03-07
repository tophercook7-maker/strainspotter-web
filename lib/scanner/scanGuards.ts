// lib/scanner/scanGuards.ts
import { assessImageDistinctness } from "./imageDistinctness";
import { areImagesDistinctEnough } from "./imageDistinctiveness";
import { detectDuplicates } from "./duplicateImageDetection";
import { inferImageRole } from "./imageRoleInference";
import { assessImageDiversity } from "./imageDiversity";
import { tagDuplicateImages } from "./imageDistinctiveness";
import { inferImageAngle } from "./imageAngleHeuristics";
import { inferAngleHint } from "./angleHinting";
import type { ImageSeed } from "./scanFallbacks";
import type { ImageResult } from "./consensusEngine";

/**
 * Checks if images have enough variance.
 */
export function checkImageDistinctness(imageSeeds: ImageSeed[]): { distinct: boolean; warning?: string } {
  const distinctness = assessImageDistinctness(imageSeeds);
  if (!distinctness.distinct) {
    return { distinct: false, warning: "HIGH_IMAGE_SIMILARITY" };
  }
  return { distinct: true };
}

/**
 * Checks image distinctiveness using embeddings.
 */
export function checkEmbeddingDistinctness(imageResults: ImageResult[]): boolean {
  const imageFingerprints = imageResults
    .map(r => r.embedding)
    .filter((embedding): embedding is number[] => embedding !== undefined && Array.isArray(embedding));
  
  if (imageFingerprints.length >= 2) {
    return areImagesDistinctEnough(imageFingerprints);
  }
  return true;
}

/**
 * Applies role-based weighting to image results.
 */
export function applyRoleWeighting(imageResults: ImageResult[]): ImageResult[] {
  return imageResults.map(result => {
    const trichomeDensityNum = result.detectedTraits.trichomeDensity === "high" ? 0.9
      : result.detectedTraits.trichomeDensity === "medium" ? 0.6
      : result.detectedTraits.trichomeDensity === "low" ? 0.3
      : 0;
    
    const leafVisibility = result.detectedTraits.leafShape === "broad" ? 0.7
      : result.detectedTraits.leafShape === "narrow" ? 0.4
      : 0.5;
    
    const budCoverage = result.detectedTraits.budStructure === "high" ? 0.8
      : result.detectedTraits.budStructure === "medium" ? 0.6
      : result.detectedTraits.budStructure === "low" ? 0.4
      : 0.5;
    
    const zoomLevel = result.meta?.focusScore ? Math.min(1, result.meta.focusScore / 100) : 0.5;
    
    const role = inferImageRole({
      trichomeDensity: trichomeDensityNum,
      leafVisibility: leafVisibility,
      budCoverage: budCoverage,
      zoomLevel: zoomLevel,
    });
    
    let weight = 1;
    if (role === "macro") weight = 1.2;
    if (role === "structure") weight = 1.1;
    if (role === "unknown") weight = 0.9;
    
    return {
      ...result,
      role,
      weight,
    } as any;
  });
}

/**
 * Applies diversity weights based on image hashes.
 */
export function applyDiversityWeights(imageResults: ImageResult[]): ImageResult[] {
  const imageHashes = imageResults.map(r => (r as any).imageHash || "").filter(h => h.length > 0);
  if (imageHashes.length >= 2) {
    const diversity = assessImageDiversity(imageHashes);
    return imageResults.map((result, idx) => {
      const penalty = diversity.penalties[idx] ?? 1;
      const roleWeight = (result as any).weight ?? 1;
      const combinedWeight = roleWeight * penalty;
      return {
        ...result,
        candidateStrains: result.candidateStrains.map(strain => ({
          ...strain,
          confidence: Math.round(strain.confidence * combinedWeight),
        })),
        diversityPenalty: penalty,
        weight: combinedWeight,
      } as any;
    });
  }
  return imageResults;
}

/**
 * Applies duplicate soft-penalty.
 */
export function applyDuplicateSoftPenalty(imageResults: ImageResult[]): ImageResult[] {
  if (imageResults.length < 2) return imageResults;

  const weightedImageResults = imageResults.map(r => ({
    ...r,
    visualSignature: r.embedding || [],
  }));
  
  const weightedImages = tagDuplicateImages(weightedImageResults);
  
  return imageResults.map((result, idx) => {
    const adjustedWeight = weightedImages[idx]?.weight ?? (result as any).weight ?? 1;
    return {
      ...result,
      weight: adjustedWeight,
      candidateStrains: result.candidateStrains.map(strain => ({
        ...strain,
        confidence: Math.round(strain.confidence * adjustedWeight),
      })),
    } as any;
  });
}

/**
 * Tags each image with inferred angle.
 */
export function tagInferredAngles(imageResults: ImageResult[]): ImageResult[] {
  return imageResults.map(r => {
    if (r.meta) {
      const angle = inferImageAngle({
        width: r.meta.width,
        height: r.meta.height,
        focusScore: r.meta.focusScore,
        edgeDensity: r.meta.edgeDensity,
      });
      return {
        ...r,
        inferredAngle: angle,
      };
    }
    return r;
  });
}

/**
 * Derives angle hints for diversity scoring.
 */
export function deriveAngleHints(imageResults: ImageResult[]): Array<{ id: number; angle: "top" | "side" | "macro" | "unknown" }> {
  return imageResults.map((img) => {
    const visualTags: string[] = [];
    if (img.inferredAngle === "macro-bud" || img.inferredAngle === "top-canopy" || img.inferredAngle === "side-profile") {
      visualTags.push(img.inferredAngle === "macro-bud" ? "macro" : img.inferredAngle === "top-canopy" ? "top" : "side");
    }
    if (img.detectedTraits.trichomeDensity === "high") {
      visualTags.push("trichome");
    }
    if (img.imageObservation?.imageType) {
      visualTags.push(img.imageObservation.imageType);
    }
    
    return {
      id: img.imageIndex,
      angle: inferAngleHint(visualTags) as "top" | "side" | "macro" | "unknown",
    };
  });
}

/**
 * Applies duplicate penalty using embeddings.
 */
export function applyEmbeddingDuplicatePenalty(imageResults: ImageResult[]): ImageResult[] {
  const embeddings = imageResults
    .map(r => r.embedding)
    .filter((e): e is number[] => Array.isArray(e) && e.length > 0);
  
  if (embeddings.length >= 2) {
    const duplicateIndexes = detectDuplicates(embeddings);
    return imageResults.map((r, idx) => {
      const duplicatePenalty = duplicateIndexes.has(idx) ? 0.75 : 1.0;
      const existingPenalty = r.diversityPenalty ?? 1.0;
      return {
        ...r,
        diversityPenalty: Math.min(existingPenalty, duplicatePenalty),
      };
    });
  }
  return imageResults;
}
