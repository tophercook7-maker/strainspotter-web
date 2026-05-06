export type EmbeddingGroupedLike = {
  bestSimilarity: number;
  visualEmbeddingScore: number;
  averageTopSimilarity: number;
  referenceImageCount: number;
  weightedAverageSimilarity?: number;
  referenceTrustScore?: number;
  trustedBestSimilarity?: number;
  matchedReferenceImages?: Array<{
    similarity?: number;
    sourceName?: string;
    reviewStatus?: string;
  }>;
};

export function embeddingGroupedHasTrustedHighConfidence(
  em: EmbeddingGroupedLike
): boolean;

export function compareGroupedEmbeddingForEmbedOnly(
  a: EmbeddingGroupedLike,
  b: EmbeddingGroupedLike
): number;

export function embeddingOnlyRankingScore(em: EmbeddingGroupedLike): number;

export function sortGroupedEmbeddingMatchesEmbedOnly<T extends EmbeddingGroupedLike>(
  matches: T[]
): T[];
