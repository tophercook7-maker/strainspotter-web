"use strict";

/** scoreBreakdown.userConfirmedReferenceScore when trusted embedding rule applies */
const TRUSTED_UC_THRESHOLD = 100;

function hasNormalTrustedUserConfirmedEmbedding(m) {
  return (m.scoreBreakdown?.userConfirmedReferenceScore ?? 0) >= TRUSTED_UC_THRESHOLD;
}

/**
 * Sort key for normal mode: text → trusted embedding → embedding strength → weak visual/metadata.
 */
function computeNormalRankingScore(m, ctx) {
  const sb = m.scoreBreakdown || {};
  const trusted = hasNormalTrustedUserConfirmedEmbedding(m);
  const embStrength =
    typeof m.embeddingTrust?.referenceTrustScore === "number" &&
    m.embeddingTrust.referenceTrustScore > 0
      ? m.embeddingTrust.referenceTrustScore
      : m.embeddingBestSimilarity ?? 0;
  let s = (sb.textScore || 0) * 48_000;
  if (trusted) s += 4_000_000;
  s += (sb.embeddingScore || 0) * 4_000;
  s += Math.min(sb.userConfirmedReferenceScore || 0, TRUSTED_UC_THRESHOLD) * 2_200;
  const visW = ctx.hasReadableText ? 160 : 16;
  const metaW = ctx.hasReadableText ? 130 : 14;
  s += (sb.visualScore || 0) * visW;
  s += (sb.metadataScore || 0) * metaW;
  s += (sb.providerScore || 0) * 85;
  s += (sb.feedbackScore || 0) * 480;
  s += embStrength * 28_000;
  return s;
}

/**
 * If any trusted embedding candidate exists and there is no OCR strain name, competitors without
 * trusted confirmation cannot display above 55 unless they have text evidence.
 */
function applyNoTextTrustedDominanceConfidenceCap(matches, ctx) {
  if (ctx.hasReadableText) return;
  const anyTrusted = matches.some(hasNormalTrustedUserConfirmedEmbedding);
  if (!anyTrusted) return;
  for (const m of matches) {
    if (hasNormalTrustedUserConfirmedEmbedding(m)) continue;
    if ((m.scoreBreakdown?.textScore || 0) > 0) continue;
    m.confidence = Math.min(55, m.confidence);
  }
}

/**
 * Without readable text, shallow visual + metadata alone cannot justify high confidence;
 * keep conservative unless embedding signal is substantial (non-trusted).
 */
function applyNoTextShallowSignalConfidenceCap(matches, ctx) {
  if (ctx.hasReadableText) return;
  const anyTrusted = matches.some(hasNormalTrustedUserConfirmedEmbedding);
  for (const m of matches) {
    if ((m.scoreBreakdown?.textScore || 0) > 0) continue;
    if (hasNormalTrustedUserConfirmedEmbedding(m)) continue;
    const emb = m.scoreBreakdown?.embeddingScore ?? 0;
    const visualOnlyStrong = emb < 36 && (m.scoreBreakdown?.visualScore ?? 0) > 0;
    const metaHeavy =
      emb < 36 &&
      (m.scoreBreakdown?.metadataScore ?? 0) > 6 &&
      (m.scoreBreakdown?.visualScore ?? 0) < 8;
    if (!anyTrusted && (visualOnlyStrong || metaHeavy)) {
      m.confidence = Math.min(55, m.confidence);
      continue;
    }
    if (anyTrusted && emb < 40) {
      m.confidence = Math.min(55, m.confidence);
    }
  }
}

function compareNormalMatchesByRankingScore(a, b) {
  const ra = a.rankingScore ?? 0;
  const rb = b.rankingScore ?? 0;
  if (rb !== ra) return rb - ra;
  const tb = (b.scoreBreakdown?.textScore || 0) - (a.scoreBreakdown?.textScore || 0);
  if (tb !== 0) return tb;
  const eb =
    (b.scoreBreakdown?.embeddingScore || 0) - (a.scoreBreakdown?.embeddingScore || 0);
  if (eb !== 0) return eb;
  const ub =
    (b.scoreBreakdown?.userConfirmedReferenceScore || 0) -
    (a.scoreBreakdown?.userConfirmedReferenceScore || 0);
  if (ub !== 0) return ub;
  const tie =
    (b.scoreBreakdown?.tieBreakerScore || 0) - (a.scoreBreakdown?.tieBreakerScore || 0);
  return tie;
}

module.exports = {
  TRUSTED_UC_THRESHOLD,
  hasNormalTrustedUserConfirmedEmbedding,
  computeNormalRankingScore,
  applyNoTextTrustedDominanceConfidenceCap,
  applyNoTextShallowSignalConfidenceCap,
  compareNormalMatchesByRankingScore,
};
