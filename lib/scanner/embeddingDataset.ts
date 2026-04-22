// lib/scanner/embeddingDataset.ts

export interface EmbeddedImageRecord {
  path: string;
  embedding: number[];
}

export interface EmbeddedStrainRecord {
  strainName: string;
  imageCount: number;
  averageEmbedding: number[];
  images: EmbeddedImageRecord[];
}

export interface StrainEmbeddingDataset {
  version: number;
  model: string;
  createdAt: string;
  datasetRoot: string;
  strains: EmbeddedStrainRecord[];
}

/**
 * Cosine similarity for normalized embeddings is in [-1, 1]; we clamp to [0, 1] for downstream fusion.
 */
export function clampSimilarity01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const av = Number(a[i]) || 0;
    const bv = Number(b[i]) || 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }

  if (magA === 0 || magB === 0) return 0;

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Weight best single training image vs strain centroid (dataset JSON unchanged). */
const BEST_IMAGE_SIM_WEIGHT = 0.7;
const AVERAGE_STRAIN_SIM_WEIGHT = 0.3;

/**
 * Prefer the closest per-image embedding in the strain, blended with centroid similarity,
 * so queries near a specific dataset photo rank that strain higher.
 */
export function strainSimilarityToQuery(
  queryEmbedding: number[],
  strain: EmbeddedStrainRecord
): number {
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) return 0;

  const avgSim = cosineSimilarity(queryEmbedding, strain.averageEmbedding);
  const imgs = strain.images ?? [];
  let bestImageSim = -1;

  for (const img of imgs) {
    if (!Array.isArray(img.embedding) || img.embedding.length === 0) continue;
    if (img.embedding.length !== queryEmbedding.length) continue;
    const s = cosineSimilarity(queryEmbedding, img.embedding);
    if (s > bestImageSim) bestImageSim = s;
  }

  if (bestImageSim < 0) {
    return clampSimilarity01(avgSim);
  }

  return clampSimilarity01(
    BEST_IMAGE_SIM_WEIGHT * bestImageSim + AVERAGE_STRAIN_SIM_WEIGHT * avgSim
  );
}

export function findNearestEmbeddedStrains(
  embedding: number[],
  dataset: StrainEmbeddingDataset,
  topK = 3
): Array<{
  strainName: string;
  score: number;
  imageCount: number;
}> {
  if (!Array.isArray(dataset?.strains)) return [];
  if (!Array.isArray(embedding) || embedding.length === 0) return [];

  return dataset.strains
    .map((strain) => ({
      strainName: strain.strainName,
      /** Raw combined similarity, guaranteed ∈ [0, 1]. */
      score: strainSimilarityToQuery(embedding, strain),
      imageCount: strain.imageCount,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK));
}
