// STEP 5.5.1 — IMAGE QUALITY SCORING (SILENT)
// lib/scanner/imageQualityScoring.ts

/**
 * STEP 5.5.1 — Image Quality Scores
 * 
 * Silent scoring system that analyzes each image for:
 * - Sharpness (focus, edge clarity)
 * - Lighting (brightness, contrast, exposure)
 * - Angle usefulness (how valuable this angle is for identification)
 * - Redundancy (similarity to other images)
 * 
 * Scores are stored internally, NOT shown to users.
 * Used for feedback loop and confidence calibration.
 */

export type ImageQualityScores = {
  sharpness: number; // 0-1: How sharp/focused the image is
  lighting: number; // 0-1: How well-lit the image is
  angleUsefulness: number; // 0-1: How valuable this angle is for identification
  redundancy: number; // 0-1: How similar to other images (higher = more redundant)
};

export type ImageQualityMetadata = {
  width: number;
  height: number;
  focusScore: number; // Existing from Phase 4.0.3
  edgeDensity: number; // Existing from Phase 4.0.3
  base64Size?: number; // Size of base64 data (proxy for detail)
};

/**
 * STEP 5.5.1 — Calculate Sharpness Score
 * 
 * Uses focusScore and edgeDensity from existing metadata.
 * Higher values = sharper image.
 */
export function calculateSharpnessScore(meta?: ImageQualityMetadata): number {
  if (!meta) return 0.5; // Default to medium if no metadata
  
  // Normalize focusScore (0-100) to 0-1
  const normalizedFocus = Math.min(1, meta.focusScore / 100);
  
  // Normalize edgeDensity (typically 0-1, but may vary)
  const normalizedEdges = Math.min(1, Math.max(0, meta.edgeDensity));
  
  // Weighted combination: focus is more important than edge density
  const sharpness = (normalizedFocus * 0.7) + (normalizedEdges * 0.3);
  
  return Math.max(0, Math.min(1, sharpness));
}

/**
 * STEP 5.5.1 — Calculate Lighting Score
 * 
 * Estimates lighting quality from image characteristics.
 * Since we can't directly analyze pixel brightness from base64,
 * we use heuristics based on image size and metadata.
 */
export function calculateLightingScore(
  meta?: ImageQualityMetadata,
  base64Size?: number
): number {
  if (!meta && !base64Size) return 0.6; // Default to fair lighting
  
  // Heuristic: Larger images often have better exposure/lighting
  // (users tend to take better photos when lighting is good)
  let score = 0.6; // Base score
  
  // If we have base64 size, use it as a proxy
  if (base64Size) {
    // Very small images (< 100KB base64) might be compressed/overexposed
    // Very large images (> 2MB base64) might be high quality
    if (base64Size < 100000) {
      score = 0.4; // Possibly overexposed or heavily compressed
    } else if (base64Size > 2000000) {
      score = 0.8; // Likely high quality with good lighting
    } else {
      score = 0.6; // Normal range
    }
  }
  
  // If we have image dimensions, factor them in
  if (meta && meta.width && meta.height) {
    const megapixels = (meta.width * meta.height) / 1000000;
    // Higher resolution often correlates with better lighting (users take care)
    if (megapixels > 8) {
      score = Math.min(1, score + 0.1);
    } else if (megapixels < 2) {
      score = Math.max(0.3, score - 0.1);
    }
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * STEP 5.5.1 — Calculate Angle Usefulness Score
 * 
 * Determines how valuable this specific angle is for identification.
 * Different angles provide different levels of information.
 */
export function calculateAngleUsefulnessScore(
  inferredAngle?: "macro-bud" | "side-profile" | "top-canopy" | "unknown",
  imageIndex: number = 0
): number {
  // First image is always useful (establishes baseline)
  if (imageIndex === 0) return 0.9;
  
  // Macro-bud (close-up) is highly useful for trichome/structure analysis
  if (inferredAngle === "macro-bud") return 0.95;
  
  // Side-profile is very useful for bud shape and structure
  if (inferredAngle === "side-profile") return 0.9;
  
  // Top-canopy is useful for overall structure
  if (inferredAngle === "top-canopy") return 0.85;
  
  // Unknown angle is less useful but still contributes
  if (inferredAngle === "unknown") return 0.6;
  
  // Default: assume moderate usefulness
  return 0.7;
}

/**
 * STEP 5.5.1 — Calculate Redundancy Score
 * 
 * Measures how similar this image is to others in the set.
 * Higher score = more redundant (less unique value).
 */
export function calculateRedundancyScore(
  imageIndex: number,
  allImageResults: Array<{
    imageIndex: number;
    embedding?: number[];
    diversityPenalty?: number;
    inferredAngle?: string;
  }>,
  currentImageAngle?: string
): number {
  if (allImageResults.length <= 1) return 0; // No redundancy with single image
  
  let redundancy = 0;
  const currentImage = allImageResults[imageIndex];
  
  // Check angle redundancy
  if (currentImageAngle) {
    const sameAngleCount = allImageResults.filter(
      (img, idx) => idx !== imageIndex && img.inferredAngle === currentImageAngle
    ).length;
    
    // If multiple images have same angle, this one is redundant
    if (sameAngleCount > 0) {
      redundancy += 0.4 * Math.min(1, sameAngleCount / 2); // Cap at 0.4 for angle redundancy
    }
  }
  
  // Check visual similarity (using diversity penalty if available)
  if (currentImage.diversityPenalty !== undefined) {
    // Higher diversity penalty = more similar = more redundant
    // diversityPenalty is typically 0-1, where 1 = identical
    redundancy += currentImage.diversityPenalty * 0.4;
  }
  
  // Check embedding similarity (if available)
  if (currentImage.embedding && allImageResults.length > 1) {
    let maxSimilarity = 0;
    for (let i = 0; i < allImageResults.length; i++) {
      if (i === imageIndex || !allImageResults[i].embedding) continue;
      
      // Simple cosine similarity approximation
      const similarity = calculateEmbeddingSimilarity(
        currentImage.embedding,
        allImageResults[i].embedding
      );
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    // High similarity = high redundancy
    redundancy += maxSimilarity * 0.2;
  }
  
  return Math.max(0, Math.min(1, redundancy));
}

/**
 * STEP 5.5.1 — Calculate Embedding Similarity
 * 
 * Simple cosine similarity between two embedding vectors.
 */
function calculateEmbeddingSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length || embedding1.length === 0) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }
  
  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

/**
 * STEP 5.5.1 — Calculate All Quality Scores for an Image
 * 
 * Main function that computes all quality scores for a single image.
 */
export function calculateImageQualityScores(
  imageIndex: number,
  imageResult: {
    meta?: ImageQualityMetadata;
    inferredAngle?: "macro-bud" | "side-profile" | "top-canopy" | "unknown";
    embedding?: number[];
    diversityPenalty?: number;
    imageHash?: string;
  },
  allImageResults: Array<{
    imageIndex: number;
    embedding?: number[];
    diversityPenalty?: number;
    inferredAngle?: string;
  }>,
  base64Size?: number
): ImageQualityScores {
  return {
    sharpness: calculateSharpnessScore(imageResult.meta),
    lighting: calculateLightingScore(imageResult.meta, base64Size),
    angleUsefulness: calculateAngleUsefulnessScore(imageResult.inferredAngle, imageIndex),
    redundancy: calculateRedundancyScore(
      imageIndex,
      allImageResults,
      imageResult.inferredAngle
    ),
  };
}

/**
 * STEP 5.5.2 — Generate Friendly User Feedback
 * 
 * Analyzes quality scores and generates ONE friendly, actionable message.
 * Only shown if confidence is below threshold.
 * 
 * Rules:
 * - Never blame the user
 * - Never say "bad photo"
 * - Show only ONE message (most impactful issue)
 * - Friendly, helpful tone
 */
export function generateFriendlyFeedback(
  imageResults: Array<{
    qualityScores?: ImageQualityScores;
    inferredAngle?: "macro-bud" | "side-profile" | "top-canopy" | "unknown";
  }>,
  confidence: number,
  confidenceThreshold: number = 85
): string | null {
  // Only show feedback if confidence is below threshold
  if (confidence >= confidenceThreshold) {
    return null;
  }
  
  if (imageResults.length === 0) {
    return null;
  }
  
  // Calculate average scores across all images
  const avgScores = imageResults.reduce(
    (acc, img) => {
      if (!img.qualityScores) return acc;
      return {
        sharpness: acc.sharpness + img.qualityScores.sharpness,
        lighting: acc.lighting + img.qualityScores.lighting,
        angleUsefulness: acc.angleUsefulness + img.qualityScores.angleUsefulness,
        redundancy: acc.redundancy + img.qualityScores.redundancy,
        count: acc.count + 1,
      };
    },
    { sharpness: 0, lighting: 0, angleUsefulness: 0, redundancy: 0, count: 0 }
  );
  
  if (avgScores.count === 0) {
    return null;
  }
  
  const avgSharpness = avgScores.sharpness / avgScores.count;
  const avgLighting = avgScores.lighting / avgScores.count;
  const avgAngleUsefulness = avgScores.angleUsefulness / avgScores.count;
  const avgRedundancy = avgScores.redundancy / avgScores.count;
  
  // Check for missing angles
  const capturedAngles = new Set(
    imageResults
      .map(img => img.inferredAngle)
      .filter((angle): angle is "macro-bud" | "side-profile" | "top-canopy" => 
        angle !== undefined && angle !== "unknown"
      )
  );
  const hasMacro = capturedAngles.has("macro-bud");
  const hasSide = capturedAngles.has("side-profile");
  const hasTop = capturedAngles.has("top-canopy");
  
  // Priority order (most impactful first):
  // 1. Missing close-up (macro) - most valuable for identification
  // 2. Missing side angle - very useful for structure
  // 3. Low lighting - affects all analysis
  // 4. Low sharpness - affects detail detection
  // 5. High redundancy - suggests need for more diversity
  
  // 1. Missing close-up photo
  if (!hasMacro && imageResults.length < 3) {
    return "Try one closer photo of the buds";
  }
  
  // 2. Missing side angle
  if (!hasSide && imageResults.length < 3) {
    return "A side-angle shot may improve accuracy";
  }
  
  // 3. Low lighting (below 0.5)
  if (avgLighting < 0.5) {
    return "Lighting is a bit dark — natural light helps";
  }
  
  // 4. Low sharpness (below 0.5)
  if (avgSharpness < 0.5) {
    return "Try to get the buds in sharper focus";
  }
  
  // 5. High redundancy (above 0.6) - images too similar
  if (avgRedundancy > 0.6 && imageResults.length >= 2) {
    return "Try photos from different angles or distances";
  }
  
  // 6. Low angle usefulness overall
  if (avgAngleUsefulness < 0.7 && imageResults.length < 3) {
    return "Adding a close-up or side view may help";
  }
  
  // Default: generic helpful message
  return "Additional photos from different angles may improve accuracy";
}
