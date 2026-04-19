// lib/scanner/multiImageFusion.ts
// Phase 2.2 Part C — Multi-Image Fusion (Real)
// Fuse features across ALL images using consensus model

import type { WikiResult } from "./types";

export type ExtractedFeatures = {
  trichomeDensity: "low" | "medium" | "high";
  pistilColor: string;
  leafShape: "narrow" | "broad";
  budStructure: "low" | "medium" | "high";
  colorProfile: string;
  imageIndex: number;
};

export type FusedFeatures = {
  trichomeDensity: "low" | "medium" | "high";
  pistilColor: string;
  leafShape: "narrow" | "broad";
  budStructure: "low" | "medium" | "high";
  colorProfile: string;
  variance: number; // 0-100, lower = more agreement
};

/**
 * Extract features from a single wiki result
 */
function extractFeaturesFromWiki(wiki: WikiResult, imageIndex: number): ExtractedFeatures {
  // Bud density
  const budStructure = wiki.morphology.budStructure.toLowerCase();
  let budDensity: "low" | "medium" | "high" = "medium";
  if (budStructure.includes("dense") || budStructure.includes("compact") || budStructure.includes("chunky")) {
    budDensity = "high";
  } else if (budStructure.includes("airy") || budStructure.includes("elongated") || budStructure.includes("foxtailed")) {
    budDensity = "low";
  }

  // Trichome density
  const trichomes = wiki.morphology.trichomes.toLowerCase();
  let trichomeDensity: "low" | "medium" | "high" = "medium";
  if (trichomes.includes("very") || trichomes.includes("extremely") || trichomes.includes("heavy")) {
    trichomeDensity = "high";
  } else if (trichomes.includes("light") || trichomes.includes("sparse")) {
    trichomeDensity = "low";
  }

  // Leaf shape (infer from genetics)
  const dominance = wiki.genetics.dominance.toLowerCase();
  const leafShape = dominance.includes("indica") ? "broad" : dominance.includes("sativa") ? "narrow" : "broad";

  // Pistil color
  const coloration = wiki.morphology.coloration.toLowerCase();
  let pistilColor = "orange"; // default
  if (coloration.includes("amber")) pistilColor = "amber";
  else if (coloration.includes("white")) pistilColor = "white";
  else if (coloration.includes("pink")) pistilColor = "pink";

  // Color profile
  const colorProfile = wiki.morphology.coloration || "Deep forest green with amber pistils";

  return {
    trichomeDensity,
    pistilColor,
    leafShape,
    budStructure: budDensity,
    colorProfile,
    imageIndex,
  };
}

/**
 * Get dominant value (most common)
 */
function dominant<T>(values: T[]): T {
  const counts = new Map<T, number>();
  values.forEach(v => {
    counts.set(v, (counts.get(v) || 0) + 1);
  });
  
  let maxCount = 0;
  let dominantValue = values[0];
  counts.forEach((count, value) => {
    if (count > maxCount) {
      maxCount = count;
      dominantValue = value;
    }
  });
  
  return dominantValue;
}

/**
 * Calculate variance (disagreement) between images
 */
function calculateVariance(features: ExtractedFeatures[]): number {
  if (features.length <= 1) return 0;

  let disagreements = 0;
  let totalComparisons = 0;

  // Compare each feature across images
  const featureTypes: Array<keyof ExtractedFeatures> = ["trichomeDensity", "pistilColor", "leafShape", "budStructure"];
  
  featureTypes.forEach(feature => {
    const values = features.map(f => f[feature]);
    const uniqueValues = new Set(values);
    if (uniqueValues.size > 1) {
      disagreements += uniqueValues.size - 1;
    }
    totalComparisons += featureTypes.length;
  });

  return Math.round((disagreements / totalComparisons) * 100);
}

/**
 * Fuse features across all images using consensus model
 */
export function fuseMultiImageFeatures(wikiResults: WikiResult[]): FusedFeatures {
  // Extract features from each image
  const allFeatures = wikiResults.map((wiki, idx) => extractFeaturesFromWiki(wiki, idx));

  // Fuse using consensus
  const fused: FusedFeatures = {
    trichomeDensity: dominant(allFeatures.map(f => f.trichomeDensity)),
    pistilColor: dominant(allFeatures.map(f => f.pistilColor)),
    leafShape: dominant(allFeatures.map(f => f.leafShape)),
    budStructure: dominant(allFeatures.map(f => f.budStructure)),
    colorProfile: allFeatures.map(f => f.colorProfile).join("; "), // Blend all color profiles
    variance: calculateVariance(allFeatures),
  };

  return fused;
}
