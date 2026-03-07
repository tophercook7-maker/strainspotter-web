// lib/scanner/imageWeighting.ts
// Phase 3.7 Part C — Image Weighting Logic

import type { ImageResult } from "./consensusEngine";

/**
 * Phase 3.7 Part C — Image Weight Assignment
 * Image 1 → 50%, Image 2 → 30%, Image 3 → 20%
 */
export type ImageWeight = {
  imageIndex: number;
  baseWeight: number; // 0.5, 0.3, or 0.2
  qualityMultiplier: number; // 0.0 to 1.0 based on quality
  finalWeight: number; // baseWeight * qualityMultiplier (normalized)
  qualityIssues: string[]; // Reasons for weight reduction
};

/**
 * Phase 3.7 Part C — Assign base weights to images
 */
export function assignImageWeights(imageCount: number): Map<number, ImageWeight> {
  const weights = new Map<number, ImageWeight>();
  const baseWeights = [0.5, 0.3, 0.2]; // Image 1 → 50%, Image 2 → 30%, Image 3 → 20%

  for (let i = 0; i < imageCount && i < 3; i++) {
    weights.set(i, {
      imageIndex: i,
      baseWeight: baseWeights[i],
      qualityMultiplier: 1.0, // Will be adjusted by quality detection
      finalWeight: baseWeights[i],
      qualityIssues: [],
    });
  }

  return weights;
}

/**
 * Phase 3.7 Part C — Detect image quality issues
 * Auto-reduce weight if quality is poor (blur, lighting, angle)
 */
export function detectImageQuality(
  imageResult: ImageResult,
  imageIndex: number
): {
  qualityMultiplier: number;
  issues: string[];
} {
  const issues: string[] = [];
  let multiplier = 1.0;

  // Check uncertainty signals for quality indicators
  const uncertaintySignals = imageResult.uncertaintySignals || [];
  
  // Detect blur indicators (low confidence, conflicting signals)
  const hasBlur = uncertaintySignals.some(s => 
    s.toLowerCase().includes("blur") || 
    s.toLowerCase().includes("unclear") ||
    s.toLowerCase().includes("fuzzy")
  );
  
  // Detect lighting issues (mentioned in uncertainty or low trait confidence)
  const hasLightingIssues = uncertaintySignals.some(s =>
    s.toLowerCase().includes("lighting") ||
    s.toLowerCase().includes("dark") ||
    s.toLowerCase().includes("overexposed")
  );

  // Detect angle issues (mentioned in uncertainty)
  const hasAngleIssues = uncertaintySignals.some(s =>
    s.toLowerCase().includes("angle") ||
    s.toLowerCase().includes("perspective") ||
    s.toLowerCase().includes("view")
  );

  // Low candidate confidence suggests poor quality
  const avgCandidateConfidence = imageResult.candidateStrains.length > 0
    ? imageResult.candidateStrains.reduce((sum, c) => sum + c.confidence, 0) / imageResult.candidateStrains.length
    : 60;
  
  const lowConfidence = avgCandidateConfidence < 65;

  // Apply penalties
  if (hasBlur) {
    multiplier *= 0.7;
    issues.push("blur detected");
  }
  if (hasLightingIssues) {
    multiplier *= 0.8;
    issues.push("lighting issues");
  }
  if (hasAngleIssues) {
    multiplier *= 0.9;
    issues.push("suboptimal angle");
  }
  if (lowConfidence && multiplier > 0.75) {
    multiplier *= 0.85;
    issues.push("low confidence signals");
  }

  // Ensure multiplier doesn't go below 0.5 (never completely discount an image)
  multiplier = Math.max(0.5, multiplier);

  return {
    qualityMultiplier: multiplier,
    issues,
  };
}

/**
 * Phase 3.7 Part C — Apply quality adjustments and normalize weights
 */
export function applyQualityWeights(
  weights: Map<number, ImageWeight>,
  imageResults: ImageResult[]
): Map<number, ImageWeight> {
  // Detect quality for each image
  for (const [index, weight] of weights.entries()) {
    const imageResult = imageResults[index];
    if (imageResult) {
      const quality = detectImageQuality(imageResult, index);
      weight.qualityMultiplier = quality.qualityMultiplier;
      weight.qualityIssues = quality.issues;
    }
  }

  // Calculate final weights (baseWeight * qualityMultiplier)
  const finalWeights = new Map<number, number>();
  let totalFinalWeight = 0;

  for (const [index, weight] of weights.entries()) {
    const final = weight.baseWeight * weight.qualityMultiplier;
    finalWeights.set(index, final);
    totalFinalWeight += final;
  }

  // Normalize weights so they sum to 1.0
  if (totalFinalWeight > 0) {
    for (const [index, weight] of weights.entries()) {
      const normalized = (finalWeights.get(index) || 0) / totalFinalWeight;
      weight.finalWeight = normalized;
    }
  }

  return weights;
}
