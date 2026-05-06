"use strict";

function isTrustedHighSimUserConfirmed(img) {
  if ((img.similarity ?? 0) < 0.93) return false;
  return (
    img.sourceName === "user-confirmed-scan" ||
    String(img.reviewStatus || "").toLowerCase() === "trusted_user_confirmed"
  );
}

/**
 * Group has at least one user-confirmed / trusted embedding ref ≥ 0.93 similarity.
 */
function embeddingGroupedHasTrustedHighConfidence(em) {
  const imgs = em.matchedReferenceImages || [];
  return imgs.some(isTrustedHighSimUserConfirmed);
}

/** Dominance tier: trusted user-confirmed at high similarity wins over questionable refs. */
function trustedUcRankingBoost(em) {
  const imgs = em.matchedReferenceImages || [];
  if (!imgs.some(isTrustedHighSimUserConfirmed)) return 0;
  const bestTrusted = imgs
    .filter(isTrustedHighSimUserConfirmed)
    .reduce((m, img) => Math.max(m, img.similarity ?? 0), 0);
  return 1 + bestTrusted * 0.15;
}

/**
 * Ranking for SCANNER_MATCHING_MODE=embedding_only.
 * Trusted high-sim user-confirmed refs → weighted trust score → raw similarity fallbacks.
 */
function compareGroupedEmbeddingForEmbedOnly(a, b) {
  const tbBoost = embeddingGroupedHasTrustedHighConfidence(b)
    ? trustedUcRankingBoost(b)
    : 0;
  const taBoost = embeddingGroupedHasTrustedHighConfidence(a)
    ? trustedUcRankingBoost(a)
    : 0;
  if (tbBoost !== taBoost) return tbBoost - taBoost;

  return (
    (b.referenceTrustScore ?? b.weightedAverageSimilarity ?? 0) -
      (a.referenceTrustScore ?? a.weightedAverageSimilarity ?? 0) ||
    (b.weightedAverageSimilarity ?? 0) - (a.weightedAverageSimilarity ?? 0) ||
    (b.trustedBestSimilarity ?? 0) - (a.trustedBestSimilarity ?? 0) ||
    Number(embeddingGroupedHasTrustedHighConfidence(b)) -
      Number(embeddingGroupedHasTrustedHighConfidence(a)) ||
    b.bestSimilarity - a.bestSimilarity ||
    b.visualEmbeddingScore - a.visualEmbeddingScore ||
    b.averageTopSimilarity - a.averageTopSimilarity ||
    b.referenceImageCount - a.referenceImageCount ||
    0
  );
}

/**
 * Single scalar consistent with compareGroupedEmbeddingForEmbedOnly (for debug / tie-break).
 */
function embeddingOnlyRankingScore(em) {
  const trusted = embeddingGroupedHasTrustedHighConfidence(em) ? 1 : 0;
  const boost = trustedUcRankingBoost(em);
  const trustScalar = em.referenceTrustScore ?? em.weightedAverageSimilarity ?? 0;

  return (
    trusted * 1e13 * boost +
    trustScalar * 1e9 +
    em.bestSimilarity * 1e8 +
    em.visualEmbeddingScore * 1e6 +
    (em.weightedAverageSimilarity ?? em.averageTopSimilarity) * 1e4 +
    em.referenceImageCount
  );
}

function sortGroupedEmbeddingMatchesEmbedOnly(matches) {
  return [...matches].sort(compareGroupedEmbeddingForEmbedOnly);
}

module.exports = {
  embeddingGroupedHasTrustedHighConfidence,
  compareGroupedEmbeddingForEmbedOnly,
  embeddingOnlyRankingScore,
  sortGroupedEmbeddingMatchesEmbedOnly,
  isTrustedHighSimUserConfirmed,
};
