/**
 * Reference-library trust tiers for grouped embedding similarity.
 * Down-weights needs_review / variant labels so weak API references cannot dominate UX.
 */

/** Terms that usually indicate phenotype/line drift unless the canon strain label includes them. */
const VARIANT_HINT_TERMS = new Set([
  "auto",
  "fast",
  "version",
  "cross",
  "bx",
  "f1",
  "f4",
  "cbd",
  "sour",
  "purple",
  "white",
  "blackberry",
  "sherbet",
  "autoflower",
  "automatic",
]);

export type MatchedReferenceImageRow = {
  localPath?: string;
  imageUrl?: string;
  sourcePageUrl?: string;
  similarity?: number;
  sourceName?: string;
  reviewStatus?: string;
};

export type MatchTrustTier = "trusted" | "exact" | "weak" | "needs_review";

export type ReferenceTrustBreakdown = {
  trustedMatchCount: number;
  needsReviewMatchCount: number;
  variantMatchCount: number;
  /** Catalog / deterministic exact API rows */
  apiExactMatchCount: number;
  weightedAverageSimilarity: number;
  trustedBestSimilarity: number;
  referenceTrustScore: number;
  /** Only needs_review (or weaker) refs; no trusted / api_exact / strong exact-named evidence */
  needsReviewOnlyDominant: boolean;
  hasTrustedEvidence: boolean;
  hasApiExactEvidence: boolean;
  hasStrongExactNameEvidence: boolean;
  dominantWarning?: string;
  matchTrustTier: MatchTrustTier;
};

function norm(s: unknown): string {
  return typeof s === "string" ? s.trim().toLowerCase() : "";
}

function tokenSet(text: string): Set<string> {
  return new Set(
    norm(text)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2)
  );
}

/** Cosine-lite token overlap ~ Jaccard for short strain names */
function tokenNameOverlap(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / Math.max(A.size, B.size);
}

export function isTrustedUserConfirmedRef(img: {
  sourceName?: string;
  reviewStatus?: string;
}): boolean {
  return (
    norm(img.reviewStatus) === "trusted_user_confirmed" ||
    img.sourceName === "user-confirmed-scan"
  );
}

export function imageIsNeedsReview(img: {
  reviewStatus?: string;
}): boolean {
  const r = norm(img.reviewStatus);
  return r.startsWith("needs_review");
}

function hasVariantMismatch(sourceLabel: string, strainName: string): boolean {
  const sCanon = norm(strainName);
  const lbl = norm(sourceLabel);
  if (!lbl || lbl === "straincompass") return false;
  if ((lbl.includes(" x ") || lbl.includes(" bx")) && tokenNameOverlap(sourceLabel, strainName) < 0.75) {
    return true;
  }
  const strainTok = tokenSet(strainName);
  for (const t of VARIANT_HINT_TERMS) {
    const reWord = new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`);
    if (reWord.test(lbl) && !strainTok.has(t)) return true;
  }
  return false;
}

/** Per-image multiplier applied to cosine similarity contributions */
export function computeReferenceImageTrustWeight(params: {
  similarity: number;
  sourceName?: string;
  reviewStatus?: string;
  strainSlug: string;
  strainName: string;
}): number {
  const { sourceName, reviewStatus, strainSlug, strainName } = params;
  const canon = (strainName || strainSlug || "").trim();

  if (isTrustedUserConfirmedRef({ sourceName, reviewStatus })) {
    return 1.25;
  }

  const srcNorm = norm(sourceName);
  const srcStr = typeof sourceName === "string" ? sourceName : "";

  const variantMis =
    srcStr.length > 0 ? hasVariantMismatch(srcStr, canon) : false;

  let w = 0.95;

  if (srcNorm === "api_exact_match") {
    return variantMis ? 0.35 : 1.0;
  }

  if (srcNorm === "straincompass") {
    w = 1.0;
  }

  if (imageIsNeedsReview({ reviewStatus })) {
    w = Math.min(w, 0.55);
  }

  if (srcStr.length > 0 && srcNorm !== "straincompass") {
    const overlap = tokenNameOverlap(srcStr, canon);
    if (overlap >= 0.92 && !imageIsNeedsReview({ reviewStatus })) {
      w = Math.max(w, 0.95);
    }
    if (overlap < 0.55) {
      w = Math.min(w, 0.35);
    }
  }

  if (variantMis) {
    const strainHasVariantHint = [...VARIANT_HINT_TERMS].some((t) =>
      norm(canon).includes(t),
    );
    if (!strainHasVariantHint) {
      w = Math.min(w, 0.35);
    }
  }

  return Math.max(0.08, Math.min(w, 1.5));
}

export function computeGroupedReferenceTrust(
  matchedReferenceImages: MatchedReferenceImageRow[],
  strainSlug: string,
  strainName: string
): ReferenceTrustBreakdown {
  const ranked =
    [...matchedReferenceImages].sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0)) ??
    [];

  let trustedMatchCount = 0;
  let needsReviewMatchCount = 0;
  let variantMatchCount = 0;
  let apiExactMatchCount = 0;
  let wSum = 0;
  let simW = 0;
  let trustedBestSimilarity = 0;

  for (const img of ranked.slice(0, 5)) {
    const sim = img.similarity ?? 0;
    const src = typeof img.sourceName === "string" ? img.sourceName : "";
    if (norm(src) === "api_exact_match") apiExactMatchCount += 1;

    const w = computeReferenceImageTrustWeight({
      similarity: sim,
      sourceName: img.sourceName,
      reviewStatus: img.reviewStatus,
      strainSlug,
      strainName,
    });

    if (isTrustedUserConfirmedRef(img)) trustedMatchCount += 1;
    else if (imageIsNeedsReview(img)) needsReviewMatchCount += 1;
    if (hasVariantMismatch(src, strainName)) variantMatchCount += 1;

    simW += sim * w;
    wSum += w;

    if (isTrustedUserConfirmedRef(img) || norm(src) === "api_exact_match") {
      trustedBestSimilarity = Math.max(trustedBestSimilarity, sim);
    }
  }

  const weightedAverageSimilarity = wSum > 0 ? simW / wSum : 0;

  const hasTrustedEvidence = ranked.some(isTrustedUserConfirmedRef);
  const hasApiExactEvidence =
    ranked.some((i) => norm(i.sourceName) === "api_exact_match") ?? false;

  let hasStrongExactNameEvidence = false;
  for (const img of ranked) {
    const sn = typeof img.sourceName === "string" ? img.sourceName : "";
    if (
      sn &&
      norm(sn) !== "straincompass" &&
      !imageIsNeedsReview(img) &&
      tokenNameOverlap(sn, strainName || strainSlug) >= 0.92
    ) {
      hasStrongExactNameEvidence = true;
      break;
    }
  }

  const needsReviewOnlyDominant =
    ranked.length > 0 &&
    !hasTrustedEvidence &&
    !hasApiExactEvidence &&
    !hasStrongExactNameEvidence &&
    ranked.slice(0, 5).every((i) => imageIsNeedsReview(i));

  /** Scalar for coarse sort ordering */
  let referenceTrustScore =
    weightedAverageSimilarity * (1 + Math.min(trustedMatchCount * 0.07, 0.21));

  referenceTrustScore += trustedBestSimilarity * 0.12;

  referenceTrustScore -= Math.min(variantMatchCount * 0.035, 0.12);
  if (needsReviewOnlyDominant) {
    referenceTrustScore *= 0.62;
  }

  let dominantWarning: string | undefined;
  if (needsReviewOnlyDominant) {
    dominantWarning = "Match relies mostly on unreviewed reference images.";
  }

  let matchTrustTier: MatchTrustTier = "weak";
  const ucHighTrusted = ranked.some(
    (i) => (i.similarity ?? 0) >= 0.93 && isTrustedUserConfirmedRef(i)
  );
  if (ucHighTrusted) {
    matchTrustTier = "trusted";
  } else if (
    hasApiExactEvidence ||
    (hasStrongExactNameEvidence &&
      ranked.some((i) => {
        const sn = typeof i.sourceName === "string" ? i.sourceName : "";
        return !(imageIsNeedsReview(i) || hasVariantMismatch(sn, strainName));
      }))
  ) {
    matchTrustTier = "exact";
  } else if (needsReviewOnlyDominant) {
    matchTrustTier = "needs_review";
  }

  return {
    trustedMatchCount,
    needsReviewMatchCount,
    variantMatchCount,
    apiExactMatchCount,
    weightedAverageSimilarity: Number(weightedAverageSimilarity.toFixed(6)),
    trustedBestSimilarity: Number(trustedBestSimilarity.toFixed(6)),
    referenceTrustScore: Number(referenceTrustScore.toFixed(6)),
    needsReviewOnlyDominant,
    hasTrustedEvidence,
    hasApiExactEvidence,
    hasStrongExactNameEvidence,
    dominantWarning,
    matchTrustTier,
  };
}

export function applyTrustToEmbeddingMatch(group: {
  strainSlug: string;
  strainName: string;
  matchedReferenceImages: MatchedReferenceImageRow[];
  referenceImageCount: number;
}) {
  const trust = computeGroupedReferenceTrust(
    group.matchedReferenceImages,
    group.strainSlug,
    group.strainName
  );
  const wAvg = trust.weightedAverageSimilarity;

  const bestRaw = Math.max(
    ...group.matchedReferenceImages.map((r) => r.similarity ?? 0),
    0
  );
  const arithTop =
    group.matchedReferenceImages
      .slice(0, 3)
      .reduce((s, m) => s + (m.similarity ?? 0), 0) /
    Math.min(3, Math.max(1, group.matchedReferenceImages.length));

  return {
    strainSlug: group.strainSlug,
    strainName: group.strainName,
    matchedReferenceImages: group.matchedReferenceImages,
    bestSimilarity: bestRaw,
    /** Arithmetic mean of top-3 raw similarities (ambiguity / legacy) */
    averageTopSimilarity: Number(arithTop.toFixed(4)),
    weightedAverageSimilarity: wAvg,
    trustedBestSimilarity: trust.trustedBestSimilarity,
    referenceTrustScore: trust.referenceTrustScore,
    trustedMatchCount: trust.trustedMatchCount,
    needsReviewMatchCount: trust.needsReviewMatchCount,
    variantMatchCount: trust.variantMatchCount,
    apiExactMatchCount: trust.apiExactMatchCount,
    needsReviewOnlyDominant: trust.needsReviewOnlyDominant,
    matchTrustTier: trust.matchTrustTier,
    referenceTrustWarnings: trust.dominantWarning ? [trust.dominantWarning] : undefined,
    /** Primary scoring cosine proxy */
    visualEmbeddingScore: Number((wAvg * 100).toFixed(3)),
    referenceImageCount: group.referenceImageCount,
  };
}
