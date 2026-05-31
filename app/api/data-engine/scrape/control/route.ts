import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { dataEnginePaths } from "@/lib/data-engine/dataPaths";
import {
  IMAGE_CANDIDATES_PATH,
  METADATA_CANDIDATES_PATH,
  REVIEW_PREFERENCES_PATH,
  REVIEW_MANIFEST_PATH,
  SCRAPE_RUNS_PATH,
  SOURCE_REGISTRY_PATH,
  countsBy,
  dataStorageInfo,
  localOnly,
  readJson,
  readScrapeStatus,
  readScrapeTargets,
  sourceSetupIssues,
  sourceStatus,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INBOX_DIR = dataEnginePaths.inboxDir();

function fileKeyForPath(filePath?: string) {
  if (!filePath) return undefined;
  return createHash("sha256").update(filePath).digest("hex").slice(0, 24);
}

function reviewCandidateRow(candidate: any) {
  const fileName = typeof candidate?.fileName === "string" ? candidate.fileName : "";
  const filePath = fileName ? join(INBOX_DIR, fileName) : "";
  const fileKey = filePath && existsSync(filePath) ? fileKeyForPath(filePath) : undefined;
  return {
    id: fileKey ?? fileName,
    fileName,
    fileKey,
    imageUrl: fileKey ? `/api/data-engine/image?key=${encodeURIComponent(fileKey)}` : null,
    imageSrc: fileKey ? `/api/data-engine/image?key=${encodeURIComponent(fileKey)}` : null,
    strainSlug: candidate?.strainSlug,
    sourceId: candidate?.sourceId,
    queryUsed: candidate?.queryUsed,
    qualityWarnings: Array.isArray(candidate?.qualityWarnings) ? candidate.qualityWarnings : candidate?.quality?.qualityWarnings ?? [],
    qualityScore: Number(candidate?.learnedScore ?? candidate?.quality?.learnedScore ?? candidate?.quality?.score ?? 0),
    learnedReasons: Array.isArray(candidate?.learnedReasons) ? candidate.learnedReasons : candidate?.quality?.learnedReasons ?? [],
    reviewPriority: candidate?.reviewPriority ?? candidate?.quality?.reviewPriority ?? "medium",
    recommendedAction: candidate?.recommendedAction,
    reviewStatus: candidate?.reviewStatus,
  };
}

function visibleReviewQueue(candidates: any[]) {
  const perStrain = new Map<string, number>();
  return candidates
    .filter((item) => (item.reviewStatus ?? "pending") === "pending" && item.recommendedAction === "review")
    .map(reviewCandidateRow)
    .filter((item) => item.imageSrc)
    .sort((a, b) => {
      const scoreDelta = Number(b.qualityScore ?? 0) - Number(a.qualityScore ?? 0);
      if (scoreDelta !== 0) return scoreDelta;
      return String(b.fileName).localeCompare(String(a.fileName));
    })
    .filter((item) => {
      const strain = String(item.strainSlug ?? "unknown");
      const current = perStrain.get(strain) ?? 0;
      if (current >= 25) return false;
      perStrain.set(strain, current + 1);
      return true;
    })
    .slice(0, 100);
}

function reviewDecisionCounts(items: any[]) {
  return items.reduce(
    (counts, item) => {
      if (item?.approvedForTraining === true) counts.training += 1;
      else if (item?.approvedForEval === true) counts.eval += 1;
      else if (item?.rejectReason) counts.reject += 1;
      return counts;
    },
    { training: 0, eval: 0, reject: 0 }
  );
}

export async function GET() {
  const blocked = localOnly();
  if (blocked) return blocked;

  const scrapeTargets = await readScrapeTargets();
  const sourceRegistry = await readJson<{ sources?: any[] }>(SOURCE_REGISTRY_PATH, { sources: [] });
  const sources = Array.isArray(sourceRegistry.sources) ? sourceRegistry.sources : [];
  const enabledSources = sources.filter((source) => source.enabled === true);
  const disabledSources = sources.filter((source) => source.enabled !== true);
  const readySources = sources.filter((source) => source.enabled === true && sourceStatus(source) === "Ready");
  const scrapeStatus = await readScrapeStatus();
  const runs = await readJson<any[]>(SCRAPE_RUNS_PATH, []);
  const imageCandidates = await readJson<any[]>(IMAGE_CANDIDATES_PATH, []);
  const metadataCandidates = await readJson<any[]>(METADATA_CANDIDATES_PATH, []);
  const reviewManifest = await readJson<{ items?: any[] }>(REVIEW_MANIFEST_PATH, { items: [] });
  const reviewPreferences = await readJson<Record<string, any>>(REVIEW_PREFERENCES_PATH, {
    version: 1,
    updatedAt: null,
    approvedSignals: {},
    rejectedSignals: {},
    sourceScores: {},
    strainStats: {},
    summaries: {
      approvedPatterns: [],
      rejectedPatterns: [],
      trustedSources: [],
      rejectedReasons: [],
    },
  });
  const persistedReviewDecisionCounts = reviewDecisionCounts(Array.isArray(reviewManifest.items) ? reviewManifest.items : []);
  const visibleCandidates = Array.isArray(imageCandidates) ? visibleReviewQueue(imageCandidates) : [];
  const setAsideCandidates = Array.isArray(imageCandidates)
    ? imageCandidates.filter((item) => item.recommendedAction === "set-aside").length
    : 0;
  const pendingReviewCandidateCount = Array.isArray(imageCandidates)
    ? imageCandidates.filter((item) => (item.reviewStatus ?? "pending") === "pending" && item.recommendedAction === "review").length
    : 0;
  const autoDecisionCounts = Array.isArray(imageCandidates) ? countsBy(imageCandidates, "autoDecision") : {};

  return NextResponse.json({
    scrapeTargets,
    sourceRegistry: {
      totalSources: sources.length,
      enabledSourcesCount: enabledSources.length,
      readyPhotoSourcesCount: readySources.length,
      disabledSourcesCount: disabledSources.length,
      noSourcesEnabled: enabledSources.length === 0,
      noReadySources: readySources.length === 0,
    },
    sources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      enabled: source.enabled === true,
      sourceType: source.sourceType,
      type: source.type,
      licenseNotes: source.licenseNotes,
      status: sourceStatus(source),
      issues: sourceSetupIssues(source),
    })),
    enabledSources: enabledSources.map((source) => ({
      id: source.id,
      name: source.name,
      sourceType: source.sourceType,
      allowedUse: source.allowedUse,
      maxPagesPerRun: source.maxPagesPerRun,
    })),
    disabledSourcesCount: disabledSources.length,
    scrapeStatus,
    reviewPreferences,
    storage: dataStorageInfo(),
    recentScrapeRuns: Array.isArray(runs) ? runs.slice(-8).reverse() : [],
    recentResults: {
      imagesDownloadedThisRun: Number(scrapeStatus.downloadedImages ?? 0),
      imagesFoundThisRun: Number(scrapeStatus.imageUrlsFound ?? 0),
      imagesSentToReviewThisRun: Number(scrapeStatus.sentToReview ?? scrapeStatus.downloadedImages ?? 0),
      imagesAutoTrainingThisRun: Number(scrapeStatus.autoTraining ?? autoDecisionCounts.training ?? 0),
      imagesAutoEvalThisRun: Number(scrapeStatus.autoEval ?? autoDecisionCounts.eval ?? 0),
      imagesAutoRejectedThisRun: Number(scrapeStatus.autoRejected ?? autoDecisionCounts.reject ?? 0),
      imagesAutoReviewThisRun: Number(scrapeStatus.autoReview ?? autoDecisionCounts.review ?? pendingReviewCandidateCount),
      bestReviewCandidatesThisRun: Number(scrapeStatus.bestReviewCandidates ?? scrapeStatus.sentToReview ?? 0),
      imagesAutoSetAsideThisRun: Number(scrapeStatus.autoSetAside ?? setAsideCandidates),
      imagesRejectedThisRun: Number(scrapeStatus.rejectedImages ?? 0),
      rejectionReasons: scrapeStatus.rejectionReasons ?? {},
      filterMode: scrapeStatus.filterMode ?? scrapeTargets.filterMode ?? "review-borderline",
      reviewMode: scrapeStatus.reviewMode ?? scrapeTargets.reviewMode ?? "auto-sort-safe",
      imagesSkippedThisRun: Number(scrapeStatus.skippedImages ?? scrapeStatus.imagesSkipped ?? 0),
      candidateImagesWaitingForReview: Array.isArray(imageCandidates)
        ? pendingReviewCandidateCount
        : 0,
      topStrainsCollected: Object.entries(countsBy(Array.isArray(imageCandidates) ? imageCandidates : [], "strainSlug"))
        .sort(([, a], [, b]) => Number(b) - Number(a))
        .slice(0, 6)
        .map(([slug, count]) => ({ slug, count })),
      sourceErrors: Array.isArray(scrapeStatus.errors) ? scrapeStatus.errors.slice(-5) : [],
    },
    reviewQueue: {
      totalPending: visibleCandidates.length,
      totalAvailable: pendingReviewCandidateCount,
      hiddenLowerPriority: Math.max(0, pendingReviewCandidateCount - visibleCandidates.length),
      setAside: setAsideCandidates,
      candidates: visibleCandidates,
    },
    pendingReviewCandidates: visibleCandidates,
    reviewDecisionCounts: persistedReviewDecisionCounts,
    imageCandidateCounts: {
      total: Array.isArray(imageCandidates) ? imageCandidates.length : 0,
      byStrain: countsBy(Array.isArray(imageCandidates) ? imageCandidates : [], "strainSlug"),
      bySource: countsBy(Array.isArray(imageCandidates) ? imageCandidates : [], "sourceId"),
    },
    metadataCandidateCounts: {
      total: Array.isArray(metadataCandidates) ? metadataCandidates.length : 0,
      byStrain: countsBy(Array.isArray(metadataCandidates) ? metadataCandidates : [], "slug"),
      bySource: countsBy(Array.isArray(metadataCandidates) ? metadataCandidates : [], "sourceId"),
    },
  });
}
