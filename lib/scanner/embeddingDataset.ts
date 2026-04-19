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
      score: cosineSimilarity(embedding, strain.averageEmbedding),
      imageCount: strain.imageCount,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK));
}
