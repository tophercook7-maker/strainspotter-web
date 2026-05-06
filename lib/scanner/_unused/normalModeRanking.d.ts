export const TRUSTED_UC_THRESHOLD: 100;

type ScoreBreakdownLike = {
  textScore?: number;
  visualScore?: number;
  embeddingScore?: number;
  userConfirmedReferenceScore?: number;
  metadataScore?: number;
  providerScore?: number;
  feedbackScore?: number;
  tieBreakerScore?: number;
};

type MatchLike = {
  rankingScore?: number;
  scoreBreakdown?: ScoreBreakdownLike;
  embeddingBestSimilarity?: number;
  confidence?: number;
};

export function hasNormalTrustedUserConfirmedEmbedding(m: MatchLike): boolean;

export function computeNormalRankingScore(
  m: MatchLike,
  ctx: { hasReadableText: boolean }
): number;

export function applyNoTextTrustedDominanceConfidenceCap(
  matches: MatchLike[],
  ctx: { hasReadableText: boolean }
): void;

export function applyNoTextShallowSignalConfidenceCap(
  matches: MatchLike[],
  ctx: { hasReadableText: boolean }
): void;

export function compareNormalMatchesByRankingScore(a: MatchLike, b: MatchLike): number;
