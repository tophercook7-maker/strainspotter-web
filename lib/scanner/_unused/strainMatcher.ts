import strainDb from "@/lib/data/strains.json";
import fs from "node:fs";
import path from "node:path";
import { resolveReferenceLocalPath } from "@/lib/server/storagePaths";
import {
  getStrainCompassCandidates,
  searchExternalStrains,
} from "@/lib/strain-data/strainDataService";
import {
  getEmbeddingIndexImageCount,
  isEmbeddingIndexAvailable,
  matchVisualEmbeddingFromBase64,
  type EmbeddingMatch,
  type EmbeddingMatchResult,
} from "@/lib/scanner/visualEmbeddingMatcher";
import {
  embeddingGroupedHasTrustedHighConfidence,
  embeddingOnlyRankingScore,
  sortGroupedEmbeddingMatchesEmbedOnly,
} from "@/lib/scanner/embeddingOnlyRanking.js";
import {
  TRUSTED_UC_THRESHOLD,
  applyNoTextShallowSignalConfidenceCap,
  applyNoTextTrustedDominanceConfidenceCap,
  compareNormalMatchesByRankingScore,
  computeNormalRankingScore,
} from "@/lib/scanner/normalModeRanking.js";
import { getFeedbackPrior } from "@/lib/scanner/feedbackPrior";
import type { FeedbackPriorContext } from "@/lib/scanner/feedbackPrior";
import { appendRecentScanDebugAndDetectRepeat } from "@/lib/scanner/recentScanDebugLog";
import {
  getScannerMatchingMode,
  isFeedbackPriorDisabled,
  isProviderBoostDisabled,
  isScannerDebugMatching,
} from "@/lib/scanner/scannerMatchingEnv";
import type { NormalizedExternalStrain } from "@/lib/strain-data/providers/types";

export type VisualTraits = {
  dominantColors?: string[];
  budStructure?: string;
  trichomeDensity?: string;
  pistilColor?: string;
  possibleType?: "Indica" | "Sativa" | "Hybrid" | "Unknown" | string;
  confidence?: number;
};

export type StrainMatch = {
  name: string;
  strainName: string;
  slug: string;
  confidence: number;
  reasoning: string[];
  evidence?: Array<{
    type: "text" | "reference-image" | "type" | "metadata" | "external";
    message: string;
    sourcePageUrl?: string;
  }>;
  warnings: string[];
  referenceImageCount: number;
  referenceImagesMatched: number;
  /** Internal normal-mode sort key; UI uses confidence. */
  rankingScore?: number;
  /** Best grouped cosine similarity when an embedding match exists */
  embeddingBestSimilarity?: number;
  candidateSources?: string[];
  scoreBreakdown: {
    textScore: number;
    visualScore: number;
    embeddingScore?: number;
    userConfirmedReferenceScore?: number;
    metadataScore: number;
    providerScore: number;
    feedbackScore: number;
    tieBreakerScore: number;
  };
  initialRank?: number;
  finalRank?: number;
  matchedReferenceImages?: Array<{
    localPath?: string;
    imageUrl?: string;
    sourcePageUrl?: string;
    similarity?: number;
    sourceName?: string;
    reviewStatus?: string;
  }>;
  /** Populated when embedding grouping ran with trust enrichment */
  embeddingTrust?: {
    referenceTrustScore: number;
    trustedMatchCount: number;
    needsReviewMatchCount: number;
    variantMatchCount: number;
    weightedAverageSimilarity: number;
    trustedBestSimilarity: number;
    matchTrustTier: string;
    needsReviewOnlyDominant: boolean;
    warnings?: string[];
  };
};

type ImageFeatures = {
  dominantColors: string[];
  averageHash: string;
  colorHistogram: number[];
};

type ReferenceIndexRecord = {
  strainSlug: string;
  strainName: string;
  localPath: string;
  sourcePageUrl: string;
  imageUrl: string;
  features?: {
    dominantColors?: string[];
    averageHash?: string;
    colorHistogram?: number[];
    visualTraits?: unknown;
  };
};

type ReferenceIndex = {
  imageCount: number;
  originalImageCount?: number;
  skippedMissingFiles?: number;
  disabledReferenceImageCount?: number;
  records: ReferenceIndexRecord[];
};

type StrainEntry = {
  name?: string;
  aliases?: string[];
  type?: string;
  dominantType?: string;
  effects?: string[];
  flavors?: string[];
  terpeneProfile?: string[];
  commonTerpenes?: string[];
  visualProfile?: {
    colorProfile?: string;
    budStructure?: string;
    trichomeDensity?: string;
    leafShape?: string;
    pistilColor?: string[];
  };
  morphology?: {
    budDensity?: string;
    leafShape?: string;
    trichomeDensity?: string;
    pistilColor?: string[];
  };
};

type ProviderCandidateDebug = {
  provider: string;
  name: string;
  slug: string;
  nameSimilarity: number;
  accepted: boolean;
  reason?: string;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function tokens(value: unknown): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function overlapScore(needles: string[], haystack: string): number {
  if (!needles.length || !haystack) return 0;

  const hay = new Set(tokens(haystack));
  if (!hay.size) return 0;

  let hits = 0;
  for (const needle of needles) {
    if (hay.has(needle)) hits++;
  }

  return hits / needles.length;
}

function nameSimilarity(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.length || !right.length) return 0;
  const leftText = left.join(" ");
  const rightText = right.join(" ");
  if (leftText === rightText) return 1;
  if (leftText.includes(rightText) || rightText.includes(leftText)) return 0.9;
  const rightSet = new Set(right);
  const hits = left.filter((token) => rightSet.has(token)).length;
  return hits / Math.max(left.length, right.length);
}

function includesName(detectedText: string, strain: StrainEntry): boolean {
  const haystack = normalize(detectedText);
  const names = [strain.name, ...(strain.aliases ?? [])]
    .map(normalize)
    .filter(Boolean);

  return names.some((name) => haystack.includes(name));
}

function includesExternalName(detectedText: string, strain: NormalizedExternalStrain): boolean {
  return normalize(detectedText).includes(normalize(strain.name));
}

function referenceCountBySlug(referenceIndex: ReferenceIndex | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const record of referenceIndex?.records ?? []) {
    counts.set(record.strainSlug, (counts.get(record.strainSlug) ?? 0) + 1);
  }
  return counts;
}

function visualOnlyConfidenceCap(referenceImageCount: number): number {
  if (referenceImageCount >= 10) return 75;
  if (referenceImageCount >= 5) return 65;
  if (referenceImageCount >= 2) return 55;
  return 45;
}

function hasTextEvidence(match: StrainMatch): boolean {
  return match.scoreBreakdown.textScore > 0;
}

function tieBreakerScore(match: StrainMatch): number {
  return (
    match.scoreBreakdown.textScore * 3 +
    (match.scoreBreakdown.embeddingScore ?? 0) * 2 +
    (match.scoreBreakdown.userConfirmedReferenceScore ?? 0) * 2.5 +
    match.referenceImageCount * 0.35 +
    match.referenceImagesMatched * 0.8 +
    match.scoreBreakdown.feedbackScore * 2 +
    match.scoreBreakdown.metadataScore * 0.4 +
    match.scoreBreakdown.providerScore * 0.25
  );
}

function computeUserConfirmedReferenceScore(
  matchedImages: Array<{ similarity?: number; sourceName?: string; reviewStatus?: string }>
): number {
  let sum = 0;
  for (const img of matchedImages) {
    const simWeight = typeof img.similarity === "number" ? Math.max(0.35, img.similarity) : 1;
    const trusted =
      img.reviewStatus === "trusted_user_confirmed" ||
      img.reviewStatus === "trusted_manual_exact";
    const userScan = img.sourceName === "user-confirmed-scan";
    if (trusted) sum += 3.5 * simWeight;
    else if (userScan) sum += 2.2 * simWeight;
  }
  return Number(Math.min(10, sum).toFixed(2));
}

function topMatchesAreAmbiguous(matches: StrainMatch[]): boolean {
  const top = matches.slice(0, 3);
  if (top.length < 2) return false;
  const high = Math.max(...top.map((match) => match.confidence));
  const low = Math.min(...top.map((match) => match.confidence));
  return high - low <= 3;
}

function effectiveFeedbackPrior(
  slug: string,
  ctx: FeedbackPriorContext | undefined,
  hasReadableText: boolean
) {
  if (isFeedbackPriorDisabled()) {
    return { feedbackScore: 0, selectedCount: 0, wrongCount: 0 };
  }
  const fp = getFeedbackPrior(slug, ctx);
  if (hasReadableText) return fp;
  let fs = fp.feedbackScore;
  if (fs > 0) fs *= 0.38;
  else if (fs < 0) fs *= 0.72;
  return { ...fp, feedbackScore: Number(fs.toFixed(2)) };
}

function applyNearTieFeedbackBoost(matches: StrainMatch[]): void {
  const top = matches.slice(0, 3);
  if (top.length < 2) return;
  const topConfidence = Math.max(...top.map((match) => match.confidence));

  for (const match of top) {
    const feedbackScore = Math.max(0, Math.min(8, match.scoreBreakdown.feedbackScore));
    if (!feedbackScore || topConfidence - match.confidence > 3) continue;
    const maxConfidence = hasTextEvidence(match) ? 99 : 89;
    const boosted = Math.min(maxConfidence, match.confidence + feedbackScore);
    if (boosted <= match.confidence) continue;
    match.confidence = boosted;
    match.reasoning = [
      ...match.reasoning,
      "Past user feedback confirmed this strain in a close visual tie.",
    ].slice(0, 4);
    match.warnings = [
      ...new Set([
        ...match.warnings,
        "Feedback helped break a close visual tie.",
      ]),
    ];
  }
}

function strainVisualText(strain: StrainEntry): string {
  return [
    strain.visualProfile?.colorProfile,
    strain.visualProfile?.budStructure,
    strain.visualProfile?.trichomeDensity,
    strain.visualProfile?.leafShape,
    ...(strain.visualProfile?.pistilColor ?? []),
    strain.morphology?.budDensity,
    strain.morphology?.leafShape,
    strain.morphology?.trichomeDensity,
    ...(strain.morphology?.pistilColor ?? []),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function strainSecondaryText(strain: StrainEntry): string {
  return [
    ...(strain.effects ?? []),
    ...(strain.flavors ?? []),
    ...(strain.terpeneProfile ?? []),
    ...(strain.commonTerpenes ?? []),
  ].join(" ");
}

function externalMetadataText(strain: NormalizedExternalStrain): string {
  return [
    strain.type,
    strain.lineage,
    strain.breeder,
    strain.description,
    ...(strain.effects ?? []),
    ...(strain.flavors ?? []),
    ...(strain.terpenes ?? []),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function externalDisplayName(source: NormalizedExternalStrain["source"]): string {
  return source === "budprofiles" ? "BudProfiles" : "StrainCompass";
}

function localMetadataAgrees(ext: NormalizedExternalStrain): boolean {
  const local = (Array.isArray(strainDb) ? (strainDb as StrainEntry[]) : []).find(
    (strain) => slugify(strain.name ?? "") === ext.slug
  );
  if (!local) return false;
  const extType = normalize(ext.type);
  const localType = normalize(local.dominantType || local.type);
  if (extType && localType.includes(extType)) return true;
  return overlapScore(tokens(externalMetadataText(ext)), strainSecondaryText(local)) > 0;
}

function externalConfidence(input: {
  ext: NormalizedExternalStrain;
  detectedText: string;
  textNeedles: string[];
  metadataOverlap: number;
  referenceIndexUsed: boolean;
  nameSimilarity: number;
}): number {
  const hasImage = Boolean(input.ext.imageUrl);
  const exactText = includesExternalName(input.detectedText, input.ext);
  const fuzzyText = input.nameSimilarity >= 0.75 || overlapScore(input.textNeedles, input.ext.name) >= 0.75;
  const metadataAgrees = localMetadataAgrees(input.ext) || input.metadataOverlap > 0;

  if (exactText && hasImage) return 94;
  if (fuzzyText && hasImage && metadataAgrees) return 82;
  if (fuzzyText && hasImage) return 75;
  if (input.referenceIndexUsed && hasImage && metadataAgrees) return 55;
  if (hasImage && metadataAgrees) return 45;
  return input.referenceIndexUsed ? 45 : 35;
}

function queryFromDetectedText(detectedText: string): string {
  return detectedText
    .replace(/[^a-zA-Z0-9#\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function queriesFromDetectedText(detectedText: string): string[] {
  const cleanTokens = tokens(detectedText).slice(0, 10);
  const queries = new Set<string>();
  const full = queryFromDetectedText(detectedText);
  if (full) queries.add(full);

  for (let size = Math.min(4, cleanTokens.length); size >= 2; size -= 1) {
    for (let i = 0; i <= cleanTokens.length - size; i += 1) {
      queries.add(cleanTokens.slice(i, i + size).join(" "));
      if (queries.size >= 5) return [...queries];
    }
  }

  return [...queries];
}

function buildImageFeaturesFromBase64(imageBase64?: string): ImageFeatures | null {
  if (!imageBase64) return null;
  const commaIndex = imageBase64.indexOf(",");
  const normalized = (commaIndex >= 0 ? imageBase64.slice(commaIndex + 1) : imageBase64).replace(/\s/g, "");
  if (!normalized) return null;

  const buffer = Buffer.from(normalized, "base64");
  if (!buffer.length) return null;

  const bins = new Array(16).fill(0);
  for (const byte of buffer) bins[Math.floor(byte / 16)] += 1;
  const total = Math.max(1, buffer.length);
  const colorHistogram = bins.map((count) => Number((count / total).toFixed(6)));

  const blockCount = 64;
  const blockSize = Math.max(1, Math.floor(buffer.length / blockCount));
  const avgs: number[] = [];
  for (let i = 0; i < blockCount; i += 1) {
    const start = i * blockSize;
    const end = Math.min(buffer.length, start + blockSize);
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += buffer[j];
    avgs.push(sum / Math.max(1, end - start));
  }
  const globalAvg = avgs.reduce((sum, value) => sum + value, 0) / avgs.length;
  const averageHash = avgs.map((value) => (value >= globalAvg ? "1" : "0")).join("");

  const dominantColors = colorHistogram
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => `byte-bin-${item.index}`);

  return { dominantColors, averageHash, colorHistogram };
}

function loadReferenceIndex(): ReferenceIndex | null {
  const indexPath = path.join(
    process.cwd(),
    "data",
    "strain-reference-images",
    "reference-index.json"
  );
  if (!fs.existsSync(indexPath)) return null;

  try {
    const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8")) as ReferenceIndex;
    if (!Array.isArray(parsed.records)) return null;
    let disabledReferenceImageCount = 0;
    const jsonlPath = path.join(
      process.cwd(),
      "data",
      "strain-reference-images",
      "reference-images.jsonl"
    );
    if (fs.existsSync(jsonlPath)) {
      disabledReferenceImageCount = fs
        .readFileSync(jsonlPath, "utf8")
        .split(/\r?\n/)
        .filter((line) => {
          try {
            return Boolean(line.trim()) && JSON.parse(line).disabled === true;
          } catch {
            return false;
          }
        }).length;
    }
    const records = parsed.records.filter((record) => {
      if (!record.localPath) return false;
      const resolved = resolveReferenceLocalPath(record.localPath);
      return fs.existsSync(resolved);
    });
    return {
      ...parsed,
      originalImageCount: parsed.imageCount ?? parsed.records.length,
      imageCount: records.length,
      skippedMissingFiles: parsed.records.length - records.length,
      disabledReferenceImageCount,
      records,
    };
  } catch {
    return null;
  }
}

function histogramSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  const length = Math.min(a.length, b.length);
  let intersection = 0;
  let total = 0;
  for (let i = 0; i < length; i += 1) {
    intersection += Math.min(a[i] ?? 0, b[i] ?? 0);
    total += Math.max(a[i] ?? 0, b[i] ?? 0);
  }
  return total > 0 ? intersection / total : 0;
}

function hashSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const length = Math.min(a.length, b.length);
  let same = 0;
  for (let i = 0; i < length; i += 1) {
    if (a[i] === b[i]) same += 1;
  }
  return length ? same / length : 0;
}

function referenceScores(
  uploadedFeatures: ImageFeatures | null,
  referenceIndex: ReferenceIndex | null
) {
  const bySlug = new Map<
    string,
    {
      strainSlug: string;
      strainName: string;
      score: number;
      count: number;
      sources: string[];
    }
  >();

  if (!uploadedFeatures || !referenceIndex?.records?.length) return bySlug;

  for (const record of referenceIndex.records) {
    const features = record.features;
    if (!features?.colorHistogram || !features.averageHash) continue;
    const hist = histogramSimilarity(
      uploadedFeatures.colorHistogram,
      features.colorHistogram
    );
    const hash = hashSimilarity(uploadedFeatures.averageHash, features.averageHash);
    const score = hist * 0.68 + hash * 0.32;
    if (score < 0.48) continue;

    const current =
      bySlug.get(record.strainSlug) ?? {
        strainSlug: record.strainSlug,
        strainName: record.strainName,
        score: 0,
        count: 0,
        sources: [],
      };
    current.score = Math.max(current.score, score);
    current.count += 1;
    if (record.sourcePageUrl && current.sources.length < 3) {
      current.sources.push(record.sourcePageUrl);
    }
    bySlug.set(record.strainSlug, current);
  }

  return bySlug;
}

function buildTrustedEmbeddingInjectionMatch(
  strain: StrainEntry,
  em: EmbeddingMatch,
  ctx: {
    referenceCounts: Map<string, number>;
    embeddingTopSlugs: string[];
    hasReadableText: boolean;
    referenceIndexUsed: boolean;
    embeddingResult: EmbeddingMatchResult;
    visuallyAmbiguous: boolean;
  }
): StrainMatch {
  const name = typeof strain.name === "string" ? strain.name : "";
  const slug = slugify(name);
  const candidateReferenceCount = ctx.referenceCounts.get(slug) ?? em.referenceImageCount;
  const feedbackPrior = effectiveFeedbackPrior(slug, { embeddingTopSlugs: ctx.embeddingTopSlugs }, ctx.hasReadableText);
  const embeddingBoost = Math.min(
    62,
    Math.max(0, (em.averageTopSimilarity - 0.18) * (ctx.hasReadableText ? 180 : 205))
  );
  const scoreBreakdown = {
    textScore: 0,
    visualScore: 0,
    embeddingScore: Number(embeddingBoost.toFixed(2)),
    userConfirmedReferenceScore: TRUSTED_UC_THRESHOLD,
    metadataScore: 0,
    providerScore: 0,
    feedbackScore: feedbackPrior.feedbackScore,
    tieBreakerScore: 0,
  };
  const score = embeddingBoost + TRUSTED_UC_THRESHOLD + feedbackPrior.feedbackScore;
  let confidence = Math.round(score);
  const reasoning: string[] = [
    `Trusted user-confirmed embedding reference (best similarity ${em.bestSimilarity.toFixed(3)}).`,
    `Matched ${em.matchedReferenceImages.length} embedding reference image${em.matchedReferenceImages.length === 1 ? "" : "s"}.`,
  ];
  const warnings: string[] = [];
  const evidence: StrainMatch["evidence"] = [
    {
      type: "reference-image",
      message: `Trusted embedding similarity ${em.bestSimilarity.toFixed(3)}`,
      sourcePageUrl: em.matchedReferenceImages[0]?.sourcePageUrl,
    },
  ];

  const visualCap = visualOnlyConfidenceCap(candidateReferenceCount);

  if (!ctx.hasReadableText) {
    warnings.push("No readable strain text found");
    warnings.push("Visual-only cannabis bud matches are uncertain");
    if (em.matchedReferenceImages.length >= 3) {
      confidence = Math.min(72, Math.max(48, confidence));
    } else {
      confidence = Math.min(45, confidence);
    }
  }

  if (!ctx.hasReadableText && confidence >= 90) {
    confidence = 89;
  }

  if (!ctx.referenceIndexUsed) {
    confidence = Math.min(ctx.hasReadableText ? 45 : 35, confidence);
  }

  if (!ctx.hasReadableText && candidateReferenceCount < 3) {
    warnings.push("Candidate has fewer than 3 reference images");
    confidence = Math.min(50, confidence);
  }

  if (feedbackPrior.wrongCount > feedbackPrior.selectedCount) {
    warnings.push("Local feedback history has marked this candidate wrong before");
  }

  if (ctx.visuallyAmbiguous) {
    warnings.push("Top matches are visually similar; confidence reduced");
    confidence = Math.min(65, confidence);
  }

  if (ctx.embeddingResult.ambiguityWarning) {
    warnings.push(ctx.embeddingResult.ambiguityWarning);
    confidence = Math.min(72, confidence);
  }

  const match: StrainMatch = {
    name,
    strainName: name,
    slug,
    confidence: Math.max(1, Math.min(99, confidence)),
    reasoning: reasoning.slice(0, 3),
    evidence: evidence.slice(0, 5),
    warnings: [...new Set(warnings)],
    referenceImageCount: candidateReferenceCount,
    referenceImagesMatched: em.matchedReferenceImages.length,
    matchedReferenceImages: em.matchedReferenceImages,
    scoreBreakdown,
    embeddingBestSimilarity: em.bestSimilarity,
    embeddingTrust: buildEmbeddingTrustSummary(em),
    candidateSources: ["local", "embedding", "trusted-user-embedding"],
  };
  match.scoreBreakdown.tieBreakerScore = Number(tieBreakerScore(match).toFixed(3));
  return match;
}

function buildEmbeddingTrustSummary(
  em: EmbeddingMatch | undefined
): StrainMatch["embeddingTrust"] | undefined {
  if (!em) return undefined;
  if (
    em.referenceTrustScore == null &&
    em.weightedAverageSimilarity == null &&
    em.trustedBestSimilarity == null
  ) {
    return undefined;
  }
  const wAvg = em.weightedAverageSimilarity ?? em.averageTopSimilarity ?? 0;
  return {
    referenceTrustScore: em.referenceTrustScore ?? 0,
    trustedMatchCount: em.trustedMatchCount ?? 0,
    needsReviewMatchCount: em.needsReviewMatchCount ?? 0,
    variantMatchCount: em.variantMatchCount ?? 0,
    weightedAverageSimilarity: Number(wAvg.toFixed(6)),
    trustedBestSimilarity: em.trustedBestSimilarity ?? 0,
    matchTrustTier: em.matchTrustTier ?? "weak",
    needsReviewOnlyDominant: Boolean(em.needsReviewOnlyDominant),
    warnings:
      em.referenceTrustWarnings?.length ? [...em.referenceTrustWarnings] : undefined,
  };
}

function embeddingTrustDebugSlice(et: StrainMatch["embeddingTrust"]) {
  return !et
    ? {}
    : {
        referenceTrustScore: et.referenceTrustScore,
        trustedMatchCount: et.trustedMatchCount,
        needsReviewMatchCount: et.needsReviewMatchCount,
        variantMatchCount: et.variantMatchCount,
        weightedAverageSimilarity: et.weightedAverageSimilarity,
        trustedBestSimilarity: et.trustedBestSimilarity,
        matchTrustTier: et.matchTrustTier as
          | "trusted"
          | "exact"
          | "weak"
          | "needs_review",
      };
}

export async function rankLocalStrains(input: {
  detectedText?: string;
  visualTraits?: VisualTraits;
  imageBase64?: string;
  /** Preferred for CLIP embedding — same bytes as API hash/size when provided. */
  imageBuffer?: Buffer;
  imageContentType?: string;
  scanFingerprint?: {
    scanId: string;
    imageHashShort: string;
    imageSizeBytes: number;
  };
}): Promise<{
  topMatches: StrainMatch[];
  notes: string[];
  referenceIndexUsed: boolean;
  referenceImageCount: number;
  confidenceCapReason: string | null;
  ambiguous?: boolean;
  uncertain?: boolean;
  uncertaintyMessage?: string | null;
  debug?: {
    candidateCount: number;
    totalCandidatesConsidered?: number;
    candidatesBySource?: {
      local: number;
      straincompass: number;
      budprofiles: number;
      embedding: number;
      feedback: number;
    };
    rawEmbeddingImageMatchesTop20?: Array<{
      strainSlug: string;
      strainName: string;
      localPath: string;
      similarity: number;
    }>;
    groupedEmbeddingStrainMatchesTop10?: EmbeddingMatchResult["topEmbeddingMatches"];
    /** Alias for groupedEmbeddingStrainMatchesTop10 (API contract). */
    groupedEmbeddingMatches?: EmbeddingMatchResult["topEmbeddingMatches"];
    embeddingImageCount?: number;
    scanEmbeddingGenerated?: boolean;
    scanEmbeddingError?: string | null;
    embeddingVectorLength?: number;
    scanEmbeddingPreview?: number[];
    warnings?: string[];
    finalTopMatches?: Array<{
      slug: string;
      strainName: string;
      rankingScore?: number;
      confidence: number;
      embeddingScore?: number;
      matchedReferenceImagesCount?: number;
      bestSimilarity?: number;
      hasTrustedUserConfirmedMatch?: boolean;
      candidateSources?: string[];
      scoreBreakdown: StrainMatch["scoreBreakdown"];
      referenceTrustScore?: number;
      trustedMatchCount?: number;
      needsReviewMatchCount?: number;
      variantMatchCount?: number;
      weightedAverageSimilarity?: number;
      trustedBestSimilarity?: number;
      matchTrustTier?: "trusted" | "exact" | "weak" | "needs_review";
    }>;
    matchingWarnings?: string[];
    repeatedTopMatchesWarning?: string;
    scanEmbeddingDebug?: EmbeddingMatchResult["embeddingDebug"];
    referenceIndexStats: {
      indexedLocalImages: number;
      originalImageCount: number;
      skippedMissingFiles: number;
      enabledReferenceImageCount: number;
      disabledReferenceImageCount: number;
    };
    providerCandidatesConsidered: ProviderCandidateDebug[];
    embeddingIndexUsed: boolean;
    embeddingModel: string | null;
    topEmbeddingMatches: EmbeddingMatchResult["topEmbeddingMatches"];
    embeddingAmbiguityWarning: string | null;
    embeddingError?: string;
    matchingMode?: string;
  };
}> {
  const strains = Array.isArray(strainDb) ? (strainDb as StrainEntry[]) : [];
  const referenceIndex = loadReferenceIndex();
  const referenceIndexUsed = Boolean(referenceIndex?.records?.length);
  const referenceImageCount = referenceIndex?.imageCount ?? referenceIndex?.records?.length ?? 0;
  const confidenceCapReason = referenceIndexUsed
    ? null
    : "No verified local reference image index found. Run npm run references:download and npm run references:index.";

  if (!strains.length) {
    return {
      topMatches: [],
      notes: ["No local strain database was found for server-side matching."],
      referenceIndexUsed,
      referenceImageCount,
      confidenceCapReason,
    };
  }

  const detectedText = input.detectedText ?? "";
  const visualTraits = input.visualTraits ?? {};
  const possibleType = normalize(visualTraits.possibleType);
  const visualNeedles = [
    ...(Array.isArray(visualTraits.dominantColors)
      ? visualTraits.dominantColors
      : []),
    visualTraits.budStructure,
    visualTraits.trichomeDensity,
    visualTraits.pistilColor,
  ]
    .flatMap(tokens)
    .filter(Boolean);
  const textNeedles = tokens(detectedText);
  const hasReadableText = textNeedles.length > 0;
  const mode = getScannerMatchingMode();
  const matchingWarnings: string[] = [];
  if (isFeedbackPriorDisabled()) {
    matchingWarnings.push("Feedback prior disabled for this scan.");
  }
  if (isProviderBoostDisabled()) {
    matchingWarnings.push("Provider metadata boost disabled for this scan.");
  }
  if (mode === "embedding_only") {
    matchingWarnings.push("Matching mode: embedding_only — ranking uses grouped visual embeddings only.");
    const embeddingResult = await matchVisualEmbeddingFromBase64({
      imageBase64: input.imageBase64,
      imageBuffer: input.imageBuffer,
      contentType: input.imageContentType,
    });
    const referenceCounts = referenceCountBySlug(referenceIndex);
    const groupedSource =
      embeddingResult.groupedEmbeddingMatchesAll?.length
        ? embeddingResult.groupedEmbeddingMatchesAll
        : embeddingResult.topEmbeddingMatches;
    const sortedGrouped = sortGroupedEmbeddingMatchesEmbedOnly(groupedSource);

    const matchesBuilt: StrainMatch[] = [];

    for (const em of sortedGrouped) {
      const strain = strains.find((s) => slugify(s.name ?? "") === em.strainSlug);
      const name = strain?.name ?? em.strainName;
      const slug = em.strainSlug;
      const refCount = referenceCounts.get(slug) ?? em.referenceImageCount;
      const trusted = embeddingGroupedHasTrustedHighConfidence(em);
      const embedHonestSim =
        em.weightedAverageSimilarity ?? em.averageTopSimilarity;
      let honestConf = Math.min(56, Math.round(28 + embedHonestSim * 48));
      if (em.needsReviewOnlyDominant) honestConf = Math.min(50, honestConf);
      const rankingScore = embeddingOnlyRankingScore(em);
      const trustSummary = buildEmbeddingTrustSummary(em);
      const warns = [
          "Embedding-only diagnostic mode — text, feedback priors, and provider boosts are not used for ranking.",
          ...(trustSummary?.warnings ?? []),
        ];
      matchesBuilt.push({
        name,
        strainName: name,
        slug,
        rankingScore,
        embeddingBestSimilarity: em.bestSimilarity,
        embeddingTrust: trustSummary,
        confidence: Math.max(14, honestConf),
        reasoning: [
          `Embedding-only: trust-weighted similarity ${embedHonestSim.toFixed(
            3
          )} (raw top=${em.bestSimilarity.toFixed(3)} avgTop3Raw=${em.averageTopSimilarity.toFixed(3)}).`,
          ...(trusted
            ? [
                "Trusted user-confirmed reference matched at high similarity — ranked ahead of weak library matches.",
              ]
            : []),
        ],
        warnings: warns,
        referenceImageCount: refCount,
        referenceImagesMatched: em.matchedReferenceImages.length,
        matchedReferenceImages: em.matchedReferenceImages,
        scoreBreakdown: {
          textScore: 0,
          visualScore: 0,
          embeddingScore: em.visualEmbeddingScore,
          userConfirmedReferenceScore: trusted ? 100 : 0,
          metadataScore: 0,
          providerScore: 0,
          feedbackScore: 0,
          tieBreakerScore: Number(embedHonestSim.toFixed(4)),
        },
      });
    }

    let repeatedTopMatchesWarning: string | undefined;
    if (isScannerDebugMatching() && input.scanFingerprint && matchesBuilt.length) {
      const hit = appendRecentScanDebugAndDetectRepeat({
        createdAt: new Date().toISOString(),
        scanId: input.scanFingerprint.scanId,
        imageHashShort: input.scanFingerprint.imageHashShort,
        topMatchSlugs: matchesBuilt.slice(0, 5).map((m) => m.slug),
        topMatchConfidences: matchesBuilt.slice(0, 5).map((m) => m.confidence),
        embeddingIndexUsed: embeddingResult.embeddingIndexUsed,
        totalCandidatesConsidered: groupedSource.length,
      });
      repeatedTopMatchesWarning = hit.repeatedTopMatchesWarning;
      if (repeatedTopMatchesWarning) matchingWarnings.push(repeatedTopMatchesWarning);
    }

    const uncertain =
      !hasReadableText && Boolean(repeatedTopMatchesWarning);
    const uncertaintyMessage = uncertain
      ? "Scanner does not have enough visual evidence for this photo yet."
      : null;
    const notesEmbedding: string[] = [];
    if (
      embeddingResult.embeddingIndexUsed &&
      embeddingResult.embeddingImageCount > 0 &&
      !embeddingResult.scanEmbeddingGenerated
    ) {
      const msg =
        embeddingResult.scanEmbeddingError ||
        "Scan image embedding failed; embedding comparison could not run.";
      notesEmbedding.push(msg);
      matchingWarnings.push(
        "Scan image embedding failed; embedding comparison could not run."
      );
    }
    if (uncertain) {
      notesEmbedding.push(uncertaintyMessage!);
      for (const m of matchesBuilt) {
        m.confidence = Math.min(40, m.confidence);
        m.warnings = [
          ...new Set([
            ...m.warnings,
            "Insufficient distinct visual evidence — these suggestions may not be meaningful.",
          ]),
        ];
      }
    }

    const providerCandidatesConsideredEarly: ProviderCandidateDebug[] = [];
    const slugSet = new Set<string>();
    for (const em of groupedSource) slugSet.add(em.strainSlug);

    const debugEmbedding =
      isScannerDebugMatching()
        ? {
            candidateCount: matchesBuilt.length,
            totalCandidatesConsidered: slugSet.size,
            candidatesBySource: {
              local: matchesBuilt.length,
              straincompass: 0,
              budprofiles: 0,
              embedding: groupedSource.length,
              feedback: 0,
            },
            rawEmbeddingImageMatchesTop20:
              embeddingResult.embeddingDebug?.rawImageMatchesTop20,
            groupedEmbeddingStrainMatchesTop10:
              embeddingResult.embeddingDebug?.groupedStrainMatchesTop10 ??
              embeddingResult.groupedEmbeddingMatchesAll?.slice(0, 10) ??
              [],
            groupedEmbeddingMatches:
              embeddingResult.embeddingDebug?.groupedStrainMatchesTop10 ??
              embeddingResult.groupedEmbeddingMatchesAll?.slice(0, 10) ??
              [],
            embeddingImageCount: embeddingResult.embeddingImageCount,
            scanEmbeddingGenerated: embeddingResult.scanEmbeddingGenerated ?? false,
            scanEmbeddingError: embeddingResult.scanEmbeddingError ?? null,
            embeddingVectorLength: embeddingResult.embeddingVectorLength ?? 0,
            scanEmbeddingPreview:
              embeddingResult.embeddingDebug?.scanEmbeddingPreview ?? [],
            warnings: [
              ...matchingWarnings,
              ...(repeatedTopMatchesWarning ? [repeatedTopMatchesWarning] : []),
              ...(confidenceCapReason ? [confidenceCapReason] : []),
            ],
            finalTopMatches: matchesBuilt.slice(0, 5).map((m) => ({
              slug: m.slug,
              strainName: m.strainName,
              rankingScore: m.rankingScore ?? 0,
              confidence: m.confidence,
              matchedReferenceImagesCount:
                m.matchedReferenceImages?.length ?? m.referenceImagesMatched,
              bestSimilarity: m.embeddingBestSimilarity,
              ...embeddingTrustDebugSlice(m.embeddingTrust),
              hasTrustedUserConfirmedMatch: embeddingGroupedHasTrustedHighConfidence({
                bestSimilarity: m.embeddingBestSimilarity ?? 0,
                visualEmbeddingScore: m.scoreBreakdown.embeddingScore ?? 0,
                averageTopSimilarity: m.scoreBreakdown.tieBreakerScore ?? 0,
                referenceImageCount: m.referenceImageCount,
                matchedReferenceImages: m.matchedReferenceImages ?? [],
                weightedAverageSimilarity:
                  m.embeddingTrust?.weightedAverageSimilarity,
                referenceTrustScore: m.embeddingTrust?.referenceTrustScore,
                trustedBestSimilarity: m.embeddingTrust?.trustedBestSimilarity,
              }),
              scoreBreakdown: m.scoreBreakdown,
            })),
            matchingWarnings:
              matchingWarnings.length > 0 ? matchingWarnings : undefined,
            repeatedTopMatchesWarning,
            scanEmbeddingDebug: embeddingResult.embeddingDebug,
            referenceIndexStats: {
              indexedLocalImages: referenceImageCount,
              originalImageCount: referenceIndex?.originalImageCount ?? referenceImageCount,
              skippedMissingFiles: referenceIndex?.skippedMissingFiles ?? 0,
              enabledReferenceImageCount: referenceImageCount,
              disabledReferenceImageCount: referenceIndex?.disabledReferenceImageCount ?? 0,
            },
            providerCandidatesConsidered: providerCandidatesConsideredEarly,
            embeddingIndexUsed: embeddingResult.embeddingIndexUsed,
            embeddingModel: embeddingResult.embeddingModel,
            topEmbeddingMatches: embeddingResult.topEmbeddingMatches,
            embeddingAmbiguityWarning: embeddingResult.ambiguityWarning,
            embeddingError: embeddingResult.error,
            matchingMode: mode,
          }
        : undefined;

    return {
      topMatches: matchesBuilt.slice(0, 5),
      notes: notesEmbedding,
      referenceIndexUsed,
      referenceImageCount,
      confidenceCapReason,
      ambiguous:
        matchesBuilt.length === 0
          ? false
          : topMatchesAreAmbiguous(matchesBuilt) || mode === "embedding_only",
      uncertain,
      uncertaintyMessage,
      debug: debugEmbedding,
    };
  }

  if (mode === "text_only") {
    matchingWarnings.push("Matching mode: text_only — fingerprint and embedding similarity are ignored.");
  }

  const uploadedFeatures =
    mode === "text_only" ? null : buildImageFeaturesFromBase64(input.imageBase64);
  const visualBySlug =
    mode === "text_only" ? new Map() : referenceScores(uploadedFeatures, referenceIndex);
  const embeddingResult =
    mode === "text_only"
      ? {
          embeddingIndexUsed: isEmbeddingIndexAvailable(),
          embeddingModel: null as string | null,
          embeddingImageCount: getEmbeddingIndexImageCount(),
          topEmbeddingMatches: [] as EmbeddingMatchResult["topEmbeddingMatches"],
          ambiguityWarning: null as string | null,
          scanEmbeddingGenerated: false,
          scanEmbeddingError: null,
          embeddingVectorLength: 0,
        }
      : await matchVisualEmbeddingFromBase64({
          imageBase64: input.imageBase64,
          imageBuffer: input.imageBuffer,
          contentType: input.imageContentType,
        });
  const embeddingGroupedSource =
    embeddingResult.groupedEmbeddingMatchesAll?.length
      ? embeddingResult.groupedEmbeddingMatchesAll
      : embeddingResult.topEmbeddingMatches;
  const embeddingBySlug = new Map(
    embeddingGroupedSource.map((match) => [match.strainSlug, match])
  );
  const embeddingTopSlugs = embeddingGroupedSource
    .map((match) => match.strainSlug)
    .filter((s): s is string => Boolean(s));
  const referenceCounts = referenceCountBySlug(referenceIndex);
  const providerCandidatesConsidered: ProviderCandidateDebug[] = [];
  const providerWarnings: string[] = [];
  const ambiguousVisual =
    [...visualBySlug.values()].sort((a, b) => b.score - a.score).slice(0, 3);
  const visuallyAmbiguous =
    ambiguousVisual.length > 1 &&
    (ambiguousVisual[0].score - ambiguousVisual[1].score < 0.04 ||
      (ambiguousVisual[2] && ambiguousVisual[0].score - ambiguousVisual[2].score < 0.07));

  let localStrainsScoringPositive = 0;

  const LOCAL_NORMAL_CANDIDATE_POOL = 52;

  let matches: StrainMatch[] = strains
    .map((strain): (StrainMatch & { rawScore: number }) | null => {
      const name = typeof strain.name === "string" ? strain.name : "";
      if (!name) return null;

      const reasoning: string[] = [];
      const evidence: StrainMatch["evidence"] = [];
      const warnings: string[] = [];
      const scoreBreakdown = {
        textScore: 0,
        visualScore: 0,
        embeddingScore: 0,
        userConfirmedReferenceScore: 0,
        metadataScore: 0,
        providerScore: 0,
        feedbackScore: 0,
        tieBreakerScore: 0,
      };
      let score = 0;
      let hasExactText = false;
      let hasFuzzyText = false;
      let visualReferenceStrong = false;

      if (detectedText && includesName(detectedText, strain)) {
        hasExactText = true;
        score += 94;
        scoreBreakdown.textScore = 94;
        reasoning.push("Detected text matches a local strain name or alias.");
        evidence.push({ type: "text", message: "Text found on label" });
      } else if (textNeedles.length) {
        const nameScore = overlapScore(textNeedles, [
          name,
          ...(strain.aliases ?? []),
        ].join(" "));
        if (nameScore > 0) {
          hasFuzzyText = true;
          scoreBreakdown.textScore = Math.min(58, nameScore * 58);
          score += scoreBreakdown.textScore;
          reasoning.push("Detected text partially overlaps local strain naming.");
          evidence.push({ type: "text", message: "Close detected text strain name" });
        }
      }

      const slug = slugify(name);
      const ref = visualBySlug.get(slug);
      const embeddingMatch = embeddingBySlug.get(slug);
      const candidateReferenceCount = referenceCounts.get(slug) ?? 0;
      const feedbackPrior = effectiveFeedbackPrior(slug, { embeddingTopSlugs }, hasReadableText);
      scoreBreakdown.feedbackScore = feedbackPrior.feedbackScore;
      score += feedbackPrior.feedbackScore;
      const visualCap = visualOnlyConfidenceCap(candidateReferenceCount);
      if (embeddingMatch) {
        const strongEmbeddingMatches = embeddingMatch.matchedReferenceImages.filter(
          (match) => match.similarity >= 0.26
        ).length;
        const embedSimForBoost =
          embeddingMatch.weightedAverageSimilarity ??
          embeddingMatch.averageTopSimilarity;
        const embeddingBoost = Math.min(
          62,
          Math.max(
            0,
            (embedSimForBoost - 0.18) * (hasReadableText ? 180 : 205)
          )
        );
        scoreBreakdown.embeddingScore = Number(embeddingBoost.toFixed(2));
        score += embeddingBoost;
        const userConfirmedReferenceScore = embeddingGroupedHasTrustedHighConfidence(embeddingMatch)
          ? TRUSTED_UC_THRESHOLD
          : computeUserConfirmedReferenceScore(embeddingMatch.matchedReferenceImages);
        scoreBreakdown.userConfirmedReferenceScore = userConfirmedReferenceScore;
        score += userConfirmedReferenceScore;
        if (userConfirmedReferenceScore > 0) {
          reasoning.push(
            "Nearest embedding neighbors include user-confirmed reference photos (weighted)."
          );
        }
        reasoning.push(
          `Matched ${embeddingMatch.matchedReferenceImages.length} embedding reference image${embeddingMatch.matchedReferenceImages.length === 1 ? "" : "s"}.`
        );
        evidence.push({
          type: "reference-image",
          message: `Visual embedding similarity (trust-weighted) ${Number(
            embedSimForBoost.toFixed(3)
          )}`,
          sourcePageUrl: embeddingMatch.matchedReferenceImages[0]?.sourcePageUrl,
        });
        if (strongEmbeddingMatches >= 3 && candidateReferenceCount >= 3) {
          visualReferenceStrong = true;
        }
      }
      if (ref) {
        let referenceBoost = Math.min(45, ref.score * 45 + Math.min(6, ref.count * 2));
        if (!hasReadableText) referenceBoost *= 0.72;
        scoreBreakdown.visualScore = referenceBoost;
        score += referenceBoost;
        visualReferenceStrong = ref.score >= 0.72 && ref.count >= 3;
        reasoning.push(`Matched ${ref.count} reference image${ref.count === 1 ? "" : "s"}.`);
        reasoning.push("Similar dominant colors and image fingerprint.");
        evidence.push(
          ...ref.sources.map((sourcePageUrl) => ({
            type: "reference-image" as const,
            message: `Matched ${ref.count} reference image${ref.count === 1 ? "" : "s"}`,
            sourcePageUrl,
          }))
        );
      }

      const type = normalize(strain.dominantType || strain.type);
      if (
        mode !== "text_only" &&
        possibleType &&
        possibleType !== "unknown" &&
        type.includes(possibleType)
      ) {
        score += 16;
        scoreBreakdown.metadataScore += 16;
        reasoning.push("OpenAI type estimate matches local strain type.");
        evidence.push({ type: "type", message: `Type matched ${strain.dominantType || strain.type}` });
      }

      const visualScore = overlapScore(visualNeedles, strainVisualText(strain));
      if (mode !== "text_only" && visualScore > 0) {
        const boost = Math.min(12, visualScore * 12);
        score += boost;
        scoreBreakdown.metadataScore += boost;
        reasoning.push("Extracted visual traits overlap the local visual profile.");
        evidence.push({ type: "metadata", message: "Visual traits matched local metadata" });
      }

      const secondaryScore = overlapScore(textNeedles, strainSecondaryText(strain));
      if (secondaryScore > 0) {
        const boost = Math.min(7, secondaryScore * 7);
        score += boost;
        scoreBreakdown.metadataScore += boost;
        reasoning.push("Detected text overlaps local effects, flavors, or terpene metadata.");
        evidence.push({ type: "metadata", message: "Text overlapped local effects/flavors metadata" });
      }

      if (score <= 0) return null;

      localStrainsScoringPositive += 1;

      let confidence = Math.round(score);
      if (hasExactText) {
        confidence = Math.max(90, Math.min(97, confidence));
      } else if (hasFuzzyText && visualReferenceStrong) {
        confidence = Math.max(75, Math.min(90, confidence));
      } else if (visualReferenceStrong) {
        confidence = Math.max(55, Math.min(visualCap, confidence));
      } else if (ref) {
        confidence = Math.max(45, Math.min(visualCap, confidence));
      }

      if (!hasExactText && !hasFuzzyText) {
        warnings.push("No readable strain text found");
        warnings.push("Visual-only cannabis bud matches are uncertain");
        if (embeddingMatch && embeddingMatch.matchedReferenceImages.length >= 3) {
          confidence = Math.min(72, Math.max(48, confidence));
        } else {
          confidence = ref ? Math.min(visualCap, confidence) : Math.min(45, confidence);
        }
      }

      if (!hasExactText && confidence >= 90) {
        confidence = 89;
      }

      if (!referenceIndexUsed) {
        confidence = Math.min(hasReadableText ? 45 : 35, confidence);
      }

      if (!hasReadableText && candidateReferenceCount < 3) {
        warnings.push("Candidate has fewer than 3 reference images");
        confidence = Math.min(50, confidence);
      }

      if (feedbackPrior.wrongCount > feedbackPrior.selectedCount) {
        warnings.push("Local feedback history has marked this candidate wrong before");
      }

      if (visuallyAmbiguous && ref) {
        warnings.push("Top matches are visually similar; confidence reduced");
        confidence = Math.min(65, confidence);
      }

      if (embeddingResult.ambiguityWarning && embeddingMatch) {
        warnings.push(embeddingResult.ambiguityWarning);
        confidence = Math.min(72, confidence);
      }

      if (embeddingMatch?.needsReviewOnlyDominant && !hasExactText && !hasFuzzyText) {
        const nw =
          embeddingMatch.referenceTrustWarnings?.[0] ||
          "Match relies mostly on unreviewed reference images.";
        warnings.push(nw);
        confidence = Math.min(50, confidence);
        scoreBreakdown.embeddingScore = Number(
          (scoreBreakdown.embeddingScore * 0.82).toFixed(2)
        );
      } else if (embeddingMatch?.referenceTrustWarnings?.length) {
        for (const nw of embeddingMatch.referenceTrustWarnings) {
          warnings.push(nw);
        }
      }

      const candidateSources: string[] = ["local"];
      if (embeddingMatch) candidateSources.push("embedding");
      if (ref) candidateSources.push("shallow-visual-index");
      if (scoreBreakdown.metadataScore > 0) candidateSources.push("metadata-type");
      if ((scoreBreakdown.userConfirmedReferenceScore ?? 0) >= TRUSTED_UC_THRESHOLD) {
        candidateSources.push("trusted-user-embedding");
      }

      const match: StrainMatch & { rawScore: number } = {
        name,
        strainName: name,
        slug,
        confidence: Math.max(1, Math.min(99, confidence)),
        rawScore: score,
        reasoning: reasoning.slice(0, 3),
        evidence: evidence.slice(0, 5),
        warnings: [...new Set(warnings)],
        referenceImageCount: candidateReferenceCount,
        referenceImagesMatched: Math.max(ref?.count ?? 0, embeddingMatch?.matchedReferenceImages.length ?? 0),
        matchedReferenceImages: embeddingMatch?.matchedReferenceImages ?? [],
        embeddingBestSimilarity: embeddingMatch?.bestSimilarity,
        embeddingTrust: buildEmbeddingTrustSummary(embeddingMatch),
        candidateSources,
        scoreBreakdown,
      };
      match.scoreBreakdown.tieBreakerScore = Number(tieBreakerScore(match).toFixed(3));
      return match;
    })
    .filter((match): match is StrainMatch & { rawScore: number } => Boolean(match))
    .sort((a, b) => b.rawScore - a.rawScore)
    .slice(0, LOCAL_NORMAL_CANDIDATE_POOL)
    .map(({ rawScore: _rawScore, ...match }) => match);

  const trustedSeen = new Set(matches.map((m) => m.slug));
  for (const em of sortGroupedEmbeddingMatchesEmbedOnly(embeddingGroupedSource)) {
    if (!embeddingGroupedHasTrustedHighConfidence(em)) continue;
    if (trustedSeen.has(em.strainSlug)) continue;
    const strain = strains.find((s) => slugify(s.name ?? "") === em.strainSlug);
    if (!strain || typeof strain.name !== "string" || !strain.name) continue;
    trustedSeen.add(em.strainSlug);
    matches.push(
      buildTrustedEmbeddingInjectionMatch(strain, em, {
        referenceCounts,
        embeddingTopSlugs,
        hasReadableText,
        referenceIndexUsed,
        embeddingResult,
        visuallyAmbiguous,
      })
    );
  }

  const assignNormalRankingScores = () => {
    for (const m of matches) {
      m.scoreBreakdown.tieBreakerScore = Number(tieBreakerScore(m).toFixed(3));
      let rs = computeNormalRankingScore(m, { hasReadableText });
      if (m.embeddingTrust?.needsReviewOnlyDominant && !hasTextEvidence(m)) {
        rs *= 0.88;
      }
      m.rankingScore = rs;
    }
    matches.sort(compareNormalMatchesByRankingScore);
    matches.forEach((m, index) => {
      m.finalRank = index + 1;
    });
  };

  const bestLocalConfidence =
    matches.length === 0 ? 0 : Math.max(...matches.map((m) => m.confidence));

  const usefulQuery = queryFromDetectedText(detectedText);
  if (!isProviderBoostDisabled() && usefulQuery && bestLocalConfidence < 60) {
    const candidateQueries = queriesFromDetectedText(detectedText);
    const [strainCompassGroups, externalGroups] = await Promise.all([
      Promise.all(candidateQueries.map((query) => getStrainCompassCandidates(query, 10))),
      Promise.all(candidateQueries.map((query) => searchExternalStrains(query))),
    ]);
    const strainCompassCandidates = strainCompassGroups.flat();
    const externalResults = externalGroups.flat();
    const external = [
      ...strainCompassCandidates,
      ...externalResults.filter(
        (result) =>
          !strainCompassCandidates.some(
            (candidate) => `${candidate.source}:${candidate.slug}` === `${result.source}:${result.slug}`
          )
      ),
    ];
    for (const ext of external.slice(0, 20)) {
      const candidateNameSimilarity = Math.max(
        nameSimilarity(usefulQuery, ext.name),
        ...candidateQueries.map((query) => nameSimilarity(query, ext.name))
      );
      if (ext.source === "budprofiles" && candidateNameSimilarity < 0.75) {
        providerWarnings.push("BudProfiles result ignored due to low name similarity.");
        providerCandidatesConsidered.push({
          provider: ext.source,
          name: ext.name,
          slug: ext.slug,
          nameSimilarity: Number(candidateNameSimilarity.toFixed(3)),
          accepted: false,
          reason: "low_name_similarity",
        });
        continue;
      }
      if (ext.source === "straincompass" && candidateNameSimilarity < 0.65) {
        providerCandidatesConsidered.push({
          provider: ext.source,
          name: ext.name,
          slug: ext.slug,
          nameSimilarity: Number(candidateNameSimilarity.toFixed(3)),
          accepted: false,
          reason: "low_name_similarity",
        });
        continue;
      }
      providerCandidatesConsidered.push({
        provider: ext.source,
        name: ext.name,
        slug: ext.slug,
        nameSimilarity: Number(candidateNameSimilarity.toFixed(3)),
        accepted: true,
      });
      const existing = matches.find((match) => match.slug === ext.slug);
      const metadataOverlap = overlapScore(textNeedles, externalMetadataText(ext));
      const hasImage = Boolean(ext.imageUrl);
      let confidenceFromExternal = externalConfidence({
        ext,
        detectedText,
        textNeedles,
        metadataOverlap,
        referenceIndexUsed,
        nameSimilarity: candidateNameSimilarity,
      });
      if (!hasReadableText) {
        confidenceFromExternal = Math.max(26, Math.round(confidenceFromExternal * 0.52));
      }
      const externalReasoning = [
        `Matched external provider: ${externalDisplayName(ext.source)}.`,
        ...(hasImage ? ["External provider supplied a reference image URL."] : []),
        ...(metadataOverlap > 0
          ? ["Matched terpene/effect metadata from external provider."]
          : []),
      ];

      if (existing) {
        existing.confidence = Math.max(existing.confidence, confidenceFromExternal);
        existing.reasoning = [...existing.reasoning, ...externalReasoning].slice(0, 4);
        existing.scoreBreakdown.providerScore = Math.max(
          existing.scoreBreakdown.providerScore,
          confidenceFromExternal
        );
        existing.candidateSources = [
          ...new Set([...(existing.candidateSources ?? ["local"]), "provider"]),
        ];
        existing.evidence = [
          ...(existing.evidence ?? []),
          {
            type: "external" as const,
            message: `Matched external provider: ${externalDisplayName(ext.source)}`,
            sourcePageUrl: ext.sourceUrl ?? undefined,
          },
          ...(hasImage
            ? [
                {
                  type: "reference-image" as const,
                  message: "External provider supplied imageUrl for reference seeding",
                  sourcePageUrl: ext.imageUrl ?? undefined,
                },
              ]
            : []),
        ].slice(0, 6);
      } else {
        matches.push({
          name: ext.name,
          strainName: ext.name,
          slug: ext.slug,
          confidence: confidenceFromExternal,
          reasoning: externalReasoning,
          warnings: hasReadableText ? [] : ["No readable strain text found"],
          referenceImageCount: referenceCounts.get(ext.slug) ?? 0,
          referenceImagesMatched: 0,
          candidateSources: ["provider", ext.source],
          scoreBreakdown: {
            textScore: candidateNameSimilarity >= 0.75 ? 75 : 0,
            visualScore: 0,
            embeddingScore: 0,
            userConfirmedReferenceScore: 0,
            metadataScore: metadataOverlap * 20,
            providerScore: confidenceFromExternal,
            feedbackScore: effectiveFeedbackPrior(ext.slug, { embeddingTopSlugs }, hasReadableText)
              .feedbackScore,
            tieBreakerScore: 0,
          },
          evidence: [
            {
              type: "external" as const,
              message: `Matched external provider: ${externalDisplayName(ext.source)}`,
              sourcePageUrl: ext.sourceUrl ?? undefined,
            },
            ...(hasImage
              ? [
                  {
                    type: "reference-image" as const,
                    message: "External provider supplied imageUrl for reference seeding",
                    sourcePageUrl: ext.imageUrl ?? undefined,
                  },
                ]
              : []),
          ],
        });
      }
    }
  }

  if (mode === "normal" && hasReadableText && !isFeedbackPriorDisabled()) {
    applyNearTieFeedbackBoost(matches);
  }
  applyNoTextTrustedDominanceConfidenceCap(matches, { hasReadableText });
  applyNoTextShallowSignalConfidenceCap(matches, { hasReadableText });
  assignNormalRankingScores();

  let repeatedTopMatchesWarning: string | undefined;
  if (isScannerDebugMatching() && input.scanFingerprint && matches.length) {
    const slugSet = new Set<string>();
    for (const m of matches) slugSet.add(m.slug);
    for (const em of embeddingGroupedSource) slugSet.add(em.strainSlug);
    for (const p of providerCandidatesConsidered) {
      if (p.accepted) slugSet.add(p.slug);
    }
    const hit = appendRecentScanDebugAndDetectRepeat({
      createdAt: new Date().toISOString(),
      scanId: input.scanFingerprint.scanId,
      imageHashShort: input.scanFingerprint.imageHashShort,
      topMatchSlugs: matches.slice(0, 5).map((m) => m.slug),
      topMatchConfidences: matches.slice(0, 5).map((m) => m.confidence),
      embeddingIndexUsed: embeddingResult.embeddingIndexUsed,
      totalCandidatesConsidered: slugSet.size,
    });
    repeatedTopMatchesWarning = hit.repeatedTopMatchesWarning;
    if (repeatedTopMatchesWarning) matchingWarnings.push(repeatedTopMatchesWarning);
  }

  const uncertain = !hasReadableText && Boolean(repeatedTopMatchesWarning);
  const uncertaintyMessage = uncertain
    ? "Scanner does not have enough visual evidence for this photo yet."
    : null;

  const notes = matches.length
    ? referenceIndexUsed
      ? []
      : [
          "Scanner is running visual-trait mode only. Build reference image index to improve confidence.",
        ]
    : [
        referenceIndexUsed
          ? "No local strain match passed the current text/type/visual/reference scoring threshold."
          : "No verified local reference image index found. Run npm run references:download and npm run references:index.",
      ];
  notes.push(...[...new Set(providerWarnings)]);
  const ambiguous = topMatchesAreAmbiguous(matches);
  if (ambiguous) {
    notes.push("Top matches are visually similar; confidence reduced.");
    for (const match of matches.slice(0, 3)) {
      match.warnings = [
        ...new Set([
          ...match.warnings,
          "Top matches are visually similar; confidence reduced.",
        ]),
      ];
      if (!hasTextEvidence(match)) {
        match.confidence = Math.max(1, match.confidence - 5);
      }
    }
  }

  if (uncertain) {
    notes.push(uncertaintyMessage!);
    for (const match of matches) {
      match.confidence = Math.min(42, match.confidence);
      match.warnings = [
        ...new Set([
          ...match.warnings,
          "Insufficient distinct visual evidence — these suggestions may not be meaningful.",
        ]),
      ];
    }
  }

  assignNormalRankingScores();

  const providerAcceptedStraincompass = providerCandidatesConsidered.filter(
    (p) => p.provider === "straincompass" && p.accepted
  ).length;
  const providerAcceptedBudprofiles = providerCandidatesConsidered.filter(
    (p) => p.provider === "budprofiles" && p.accepted
  ).length;
  const embeddingCandidates = embeddingGroupedSource.length;
  const feedbackCandidates = matches.filter(
    (m) => Math.abs(m.scoreBreakdown.feedbackScore) > 0.001
  ).length;
  const slugSetDebug = new Set<string>();
  for (const m of matches) slugSetDebug.add(m.slug);
  for (const em of embeddingGroupedSource) slugSetDebug.add(em.strainSlug);
  for (const p of providerCandidatesConsidered) {
    if (p.accepted) slugSetDebug.add(p.slug);
  }

  return {
    topMatches: matches.slice(0, 5),
    notes,
    referenceIndexUsed,
    referenceImageCount,
    confidenceCapReason,
    ambiguous,
    uncertain,
    uncertaintyMessage,
    debug: isScannerDebugMatching()
      ? {
          candidateCount: matches.length,
          totalCandidatesConsidered: slugSetDebug.size,
          candidatesBySource: {
            local: localStrainsScoringPositive,
            straincompass: providerAcceptedStraincompass,
            budprofiles: providerAcceptedBudprofiles,
            embedding: embeddingCandidates,
            feedback: feedbackCandidates,
          },
          rawEmbeddingImageMatchesTop20:
            embeddingResult.embeddingDebug?.rawImageMatchesTop20,
          groupedEmbeddingStrainMatchesTop10:
            embeddingResult.embeddingDebug?.groupedStrainMatchesTop10 ??
            embeddingResult.groupedEmbeddingMatchesAll?.slice(0, 10) ??
            [],
          groupedEmbeddingMatches:
            embeddingResult.embeddingDebug?.groupedStrainMatchesTop10 ??
            embeddingResult.groupedEmbeddingMatchesAll?.slice(0, 10) ??
            [],
          embeddingImageCount: embeddingResult.embeddingImageCount,
          scanEmbeddingGenerated: embeddingResult.scanEmbeddingGenerated ?? false,
          scanEmbeddingError: embeddingResult.scanEmbeddingError ?? null,
          embeddingVectorLength: embeddingResult.embeddingVectorLength ?? 0,
          scanEmbeddingPreview:
            embeddingResult.embeddingDebug?.scanEmbeddingPreview ?? [],
          warnings: [
            ...matchingWarnings,
            ...(repeatedTopMatchesWarning ? [repeatedTopMatchesWarning] : []),
            ...(confidenceCapReason ? [confidenceCapReason] : []),
          ],
          finalTopMatches: matches.slice(0, 5).map((m) => ({
            slug: m.slug,
            strainName: m.strainName,
            rankingScore: m.rankingScore ?? 0,
            confidence: m.confidence,
            embeddingScore: m.scoreBreakdown.embeddingScore ?? 0,
            matchedReferenceImagesCount:
              m.matchedReferenceImages?.length ?? m.referenceImagesMatched,
            bestSimilarity: m.embeddingBestSimilarity,
            ...embeddingTrustDebugSlice(m.embeddingTrust),
            hasTrustedUserConfirmedMatch:
              (m.scoreBreakdown.userConfirmedReferenceScore ?? 0) >= TRUSTED_UC_THRESHOLD,
            candidateSources: m.candidateSources ?? [],
            scoreBreakdown: m.scoreBreakdown,
          })),
          matchingWarnings: matchingWarnings.length > 0 ? matchingWarnings : undefined,
          repeatedTopMatchesWarning,
          scanEmbeddingDebug: embeddingResult.embeddingDebug,
          referenceIndexStats: {
            indexedLocalImages: referenceImageCount,
            originalImageCount: referenceIndex?.originalImageCount ?? referenceImageCount,
            skippedMissingFiles: referenceIndex?.skippedMissingFiles ?? 0,
            enabledReferenceImageCount: referenceImageCount,
            disabledReferenceImageCount: referenceIndex?.disabledReferenceImageCount ?? 0,
          },
          providerCandidatesConsidered,
          embeddingIndexUsed: embeddingResult.embeddingIndexUsed,
          embeddingModel: embeddingResult.embeddingModel,
          topEmbeddingMatches: embeddingResult.topEmbeddingMatches,
          embeddingAmbiguityWarning: embeddingResult.ambiguityWarning,
          embeddingError: embeddingResult.error,
          matchingMode: mode,
        }
      : undefined,
  };
}
