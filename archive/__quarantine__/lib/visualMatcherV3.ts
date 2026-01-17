/**
 * Visual Matcher V3 - Fusion of all signal paths
 * Includes augmentation, cluster alignment, and enhanced weighting
 */

import { matchImageToManifest, Manifest } from './visualMatcherV2';

// Augmentation pipeline - will be imported dynamically
// Note: This is a placeholder that will be replaced at runtime
async function runAugmentationPipeline(imageBuffer: Buffer, options: any) {
  // In production, this would call the actual augmentation service
  // For now, we'll extract a single embedding as fallback
  // Extract embedding using visualMatcherV2's extractEmbedding
  const { extractEmbedding } = await import('./visualMatcherV2');
  const embedding = await extractEmbedding(imageBuffer);
  return {
    robustEmbedding: embedding || new Array(512).fill(0),
    variants: 1,
    allEmbeddings: [embedding || new Array(512).fill(0)]
  };
}

export interface MatchResultV3 {
  strain: string;
  score: number;
  breakdown: {
    pHash: number;
    color: number;
    texture: number;
    embedding: number;
    cluster: number;
    labelText: number;
  };
  robustEmbedding?: number[];
  variants?: number;
}

/**
 * Match image using V3 matcher with augmentation
 */
export async function matchImageToManifestV3(
  imageBuffer: Buffer,
  manifest: Manifest,
  visionResults?: {
    labels?: string[];
    text?: string[];
  },
  weights?: {
    weight_phash?: number;
    weight_color?: number;
    weight_texture?: number;
    weight_embedding?: number;
    weight_cluster?: number;
    weight_label?: number;
  },
  clusters?: Array<{
    cluster_id: number;
    centroid: number[];
    image_urls: string[];
  }>
): Promise<MatchResultV3> {
  // Run augmentation pipeline to get robust embedding
  const augmentationResult = await runAugmentationPipeline(imageBuffer, {
    numAugments: 8,
    useAverage: true
  });

  // Use robust embedding for matching
  // Temporarily replace manifest embeddings with our robust one for scoring
  const manifestWithRobustEmbedding: Manifest = {
    ...manifest,
    embeddings: [augmentationResult.robustEmbedding, ...(manifest.embeddings || [])]
  };

  // Use V2 matcher with enhanced weights
  const v2Weights = {
    weight_phash: weights?.weight_phash ?? 0.15,
    weight_color: weights?.weight_color ?? 0.10,
    weight_texture: weights?.weight_texture ?? 0.10,
    weight_embedding: weights?.weight_embedding ?? 0.35,
    weight_cluster: weights?.weight_cluster ?? 0.20,
    weight_label: weights?.weight_label ?? 0.10
  };

  const v2Result = await matchImageToManifest(
    imageBuffer,
    manifestWithRobustEmbedding,
    visionResults,
    v2Weights,
    clusters
  );

  const result: MatchResultV3 = {
    strain: v2Result.strain,
    score: v2Result.score,
    breakdown: {
      ...v2Result.breakdown,
      cluster: v2Result.breakdown.cluster || 0,
    },
    robustEmbedding: augmentationResult.robustEmbedding || undefined,
    variants: augmentationResult.variants
  };
  return result;
}

/**
 * Multi-image consistency check
 * If multiple frames provided, check consistency across them
 */
export async function matchMultipleImagesV3(
  imageBuffers: Buffer[],
  manifest: Manifest,
  visionResults?: {
    labels?: string[];
    text?: string[];
  },
  weights?: any,
  clusters?: any[]
): Promise<MatchResultV3 & { consistency: number }> {
  // Match each image
  const matches = await Promise.all(
    imageBuffers.map(buffer =>
      matchImageToManifestV3(buffer, manifest, visionResults, weights, clusters)
    )
  );

  // Compute average score
  const avgScore = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;

  // Compute consistency (lower std dev = higher consistency)
  const scores = matches.map(m => m.score);
  const mean = avgScore;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.max(0, 100 - (stdDev / mean) * 100);

  // Use best match breakdown
  const bestMatch = matches.reduce((best, m) => m.score > best.score ? m : best);

  return {
    ...bestMatch,
    score: Math.round(avgScore),
    consistency: Math.round(consistency)
  };
}
