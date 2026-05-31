import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { scoreDatasetImageQuality } from "@/lib/scanner/datasetImageQuality";
import { dataEnginePaths, dataStorageInfo } from "@/lib/data-engine/dataPaths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const DATA_DIR = dataEnginePaths.dataRoot();
const INBOX_DIR = dataEnginePaths.inboxDir();
const REAL_DIR = dataEnginePaths.realDir();
const EVAL_DIR = dataEnginePaths.evalDir();
const REJECTED_DIR = dataEnginePaths.rejectedDir();
const TARGETS_PATH = dataEnginePaths.strainTargetsPath();
const COVERAGE_PATH = dataEnginePaths.coverageReportPath();
const VAULT_INDEX_PATH = dataEnginePaths.vaultIndexPath();
const REVIEW_MANIFEST_PATH = dataEnginePaths.reviewManifestPath();
const PURPLE_CLUSTER_MANIFEST_PATH = dataEnginePaths.purpleClusterManifestPath();
const PREFILTERED_MANIFEST_PATH = dataEnginePaths.prefilteredManifestPath();
const PREFILTER_REPORT_PATH = dataEnginePaths.prefilterReportPath();
const SOURCE_REGISTRY_PATH = dataEnginePaths.sourceRegistryPath();
const NORMALIZED_CATALOG_PATH = dataEnginePaths.normalizedCatalogPath();
const METADATA_CANDIDATES_PATH = dataEnginePaths.metadataCandidatesPath();
const IMAGE_CANDIDATES_PATH = dataEnginePaths.imageCandidatesPath();
const SCRAPE_RUNS_PATH = dataEnginePaths.scrapeRunsPath();
const SOURCE_ERRORS_PATH = dataEnginePaths.sourceErrorsPath();
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

type ReviewDecision = {
  fileName: string;
  fileKey?: string;
  filePath?: string;
  strainSlug: string;
  source: string;
  labelConfidence: "low" | "medium" | "high";
  approvedForTraining: boolean;
  approvedForEval: boolean;
  rejectReason: string | null;
  notes: string;
};

function localOnly() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Data engine is local-only." }, { status: 404 });
  }
  return null;
}

function fileKeyForPath(filePath?: string) {
  if (!filePath) return undefined;
  return createHash("sha256").update(filePath).digest("hex").slice(0, 24);
}

function extnameLower(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? "" : fileName.slice(index).toLowerCase();
}

function isImageFile(fileName: string) {
  return IMAGE_EXTENSIONS.has(extnameLower(fileName));
}

type JsonReadWarning = {
  file: string;
  reason: string;
};

const jsonReadWarnings: JsonReadWarning[] = [];

async function readJson(path: string, fallback: unknown) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    jsonReadWarnings.push({
      file: path.replace(ROOT, "."),
      reason: error instanceof Error ? error.message : "Failed to parse JSON",
    });
    console.warn("[DataEngine] Falling back for unreadable JSON", path, error);
    return fallback;
  }
}

async function countImages(baseDir: string) {
  try {
    if (!existsSync(baseDir)) return 0;
    let count = 0;
    const entries = await readdir(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = join(baseDir, entry.name);
      if (entry.isDirectory()) {
        count += await countImages(fullPath);
      } else if (entry.isFile() && isImageFile(entry.name)) {
        count += 1;
      }
    }
    return count;
  } catch (error) {
    console.warn("[DataEngine] Failed to count images", baseDir, error);
    return 0;
  }
}

async function listInboxItems() {
  try {
    if (!existsSync(INBOX_DIR)) return [];
    const entries = await readdir(INBOX_DIR, { withFileTypes: true });
    const rows = [];
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith(".") || !isImageFile(entry.name)) {
        continue;
      }
      const fullPath = join(INBOX_DIR, entry.name);
      const info = await stat(fullPath);
      const guessedStrainSlug = entry.name.split("__")[0] || "";
      const fileKey = fileKeyForPath(fullPath);
      rows.push({
        fileName: entry.name,
        fileKey,
        extension: extnameLower(entry.name),
        size: info.size,
        modifiedAt: info.mtime.toISOString(),
        guessedStrainSlug,
        source: "inbox",
        previewUrl: `/api/data-engine/image?key=${fileKey}`,
        quality: scoreDatasetImageQuality({
          fileName: entry.name,
          filePath: fullPath,
          size: info.size,
          source: "inbox",
          sourceConfidence: "high",
          labelConfidence: guessedStrainSlug ? "medium" : "low",
        }),
      });
    }
    return rows;
  } catch (error) {
    console.warn("[DataEngine] Failed to list inbox items", error);
    return [];
  }
}

async function listInboxPathItems() {
  if (!existsSync(INBOX_DIR)) return [];
  const entries = await readdir(INBOX_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith(".") && isImageFile(entry.name))
    .map((entry) => ({
      fileName: entry.name,
      filePath: join(INBOX_DIR, entry.name),
    }));
}

function pathFromKnownItem(item: any) {
  return typeof item?.filePath === "string" ? item.filePath : undefined;
}

function resolveFilePathByKey(fileKey: string | undefined, sources: any[]) {
  if (!fileKey) return undefined;
  for (const source of sources) {
    const items = Array.isArray(source?.items) ? source.items : [];
    for (const item of items) {
      const filePath = pathFromKnownItem(item);
      if (filePath && fileKeyForPath(filePath) === fileKey) return filePath;
    }
  }
  return undefined;
}

function sanitizeReviewManifest(raw: any) {
  const manifest = normalizeReviewManifest(raw);
  return {
    ...manifest,
    items: manifest.items.map((item: any) => ({
      fileName: item.fileName,
      fileKey: fileKeyForPath(item.filePath),
      rejectReason: item.rejectReason ?? null,
      approvedForTraining: item.approvedForTraining === true,
      approvedForEval: item.approvedForEval === true,
    })),
  };
}

function normalizeReviewManifest(raw: any) {
  return {
    version: Number(raw?.version ?? 1),
    items: Array.isArray(raw?.items) ? raw.items : [],
  };
}

function normalizeArray(raw: any) {
  return Array.isArray(raw) ? raw : [];
}

function buildScrapeStats(
  sourceRegistryRaw: any,
  metadataCandidatesRaw: any,
  imageCandidatesRaw: any,
  scrapeRunsRaw: any,
  sourceErrorsRaw: any
) {
  const sources = Array.isArray(sourceRegistryRaw?.sources) ? sourceRegistryRaw.sources : [];
  const metadataCandidates = normalizeArray(metadataCandidatesRaw);
  const imageCandidates = normalizeArray(imageCandidatesRaw);
  const scrapeRuns = normalizeArray(scrapeRunsRaw);
  const sourceErrors = normalizeArray(sourceErrorsRaw);
  const enabledSources = sources.filter((source: any) => source?.enabled === true);
  const lastScrapeRun = scrapeRuns
    .slice()
    .sort((a: any, b: any) =>
      String(b?.finishedAt ?? b?.startedAt ?? "").localeCompare(String(a?.finishedAt ?? a?.startedAt ?? ""))
    )[0] ?? null;

  return {
    totalMetadataCandidates: metadataCandidates.length,
    totalImageCandidates: imageCandidates.length,
    enabledSources: enabledSources.map((source: any) => ({
      id: source.id,
      name: source.name,
      sourceType: source.sourceType,
      allowedUse: source.allowedUse,
    })),
    disabledSourceCount: sources.length - enabledSources.length,
    sourceErrorCount: sourceErrors.length,
    recentSourceErrors: sourceErrors.slice(-5).reverse(),
    lastScrapeRun,
    noSourcesEnabled: enabledSources.length === 0,
  };
}

function buildCatalogStats(normalizedCatalogRaw: any, targetsRaw: any, metadataCandidatesRaw: any) {
  const strains = Array.isArray(normalizedCatalogRaw?.strains) ? normalizedCatalogRaw.strains : [];
  const targets = Array.isArray(targetsRaw) ? targetsRaw : [];
  const metadataCandidates = normalizeArray(metadataCandidatesRaw);
  const strainBySlug = new Map(strains.map((strain: any) => [strain.slug, strain]));
  const topMissingPriorityTargets = targets
    .filter((target: any) => {
      const strain = strainBySlug.get(target.slug) as any;
      if (!strain) return true;
      const sourceRefs = Array.isArray(strain.sourceRefs) ? strain.sourceRefs : [];
      return !sourceRefs.some((source: any) =>
        ["metadata-candidate", "existing-catalog", "large-catalog-import"].includes(source?.sourceKind)
      );
    })
    .sort((a: any, b: any) => Number(a.priority ?? 999) - Number(b.priority ?? 999))
    .slice(0, 8)
    .map((target: any) => ({
      slug: target.slug,
      displayName: target.displayName,
      priority: target.priority,
      cluster: target.cluster,
    }));

  return {
    totalNormalizedStrains: strains.length,
    approvedCatalogCount: strains.filter((strain: any) => strain.reviewStatus === "approved").length,
    candidateCatalogCount: strains.filter((strain: any) => strain.reviewStatus === "candidate").length,
    rejectedCatalogCount: strains.filter((strain: any) => strain.reviewStatus === "rejected").length,
    metadataCandidateCount: metadataCandidates.length,
    updatedAt: normalizedCatalogRaw?.updatedAt ?? null,
    topMissingPriorityTargets,
  };
}

function coverageStatus(row: any) {
  const training = Number(row?.trainingImages ?? 0);
  const evalImages = Number(row?.evalImages ?? 0);
  const targetTraining = Number(row?.targetTrainingImages ?? 25);
  const targetEval = Number(row?.targetEvalImages ?? 5);

  if (training <= 0) return "Missing";
  if (training >= targetTraining && evalImages < targetEval) return "Eval Missing";
  if (training >= targetTraining && evalImages >= targetEval) return "Strong";
  if (training >= Math.ceil(targetTraining * 0.4)) return "Ready-ish";
  return "Needs Images";
}

function buildPriorityCoverage(coverageRaw: any, targetsRaw: any) {
  const targets = Array.isArray(targetsRaw) ? targetsRaw : [];
  const byStrain = Array.isArray(coverageRaw?.byStrain) ? coverageRaw.byStrain : [];
  const coverageBySlug = new Map(byStrain.map((row: any) => [row.slug, row]));

  return targets
    .slice()
    .sort((a: any, b: any) => Number(a.priority ?? 999) - Number(b.priority ?? 999))
    .map((target: any) => {
      const coverage = (coverageBySlug.get(target.slug) as any) ?? {};
      const row = {
        slug: target.slug,
        displayName: target.displayName ?? coverage.displayName ?? target.slug,
        cluster: target.cluster ?? coverage.cluster ?? null,
        priority: target.priority ?? null,
        targetTrainingImages: Number(target.targetTrainingImages ?? coverage.targetTrainingImages ?? 25),
        targetEvalImages: Number(target.targetEvalImages ?? coverage.targetEvalImages ?? 5),
        trainingImages: Number(coverage.trainingImages ?? 0),
        evalImages: Number(coverage.evalImages ?? 0),
      };
      return {
        ...row,
        status: coverageStatus(row),
      };
    });
}

function buildCoverageSummary(
  coverageRaw: any,
  priorityCoverage: Array<{ trainingImages: number; evalImages: number; status: string }>
) {
  const priorityCovered = priorityCoverage.filter((row) => row.trainingImages > 0).length;
  const priorityMissing = priorityCoverage.filter((row) => row.trainingImages <= 0).length;
  return {
    generatedAt: coverageRaw?.generatedAt ?? null,
    totalTrainingStrains: Number(coverageRaw?.totalTrainingStrains ?? 0),
    totalTrainingImages: Number(coverageRaw?.totalTrainingImages ?? 0),
    totalEvalImages: Number(coverageRaw?.totalEvalImages ?? 0),
    priorityStrainsTotal: priorityCoverage.length,
    priorityStrainsCovered: priorityCovered,
    priorityStrainsMissing: priorityMissing,
    priorityEvalMissing: priorityCoverage.filter((row) => row.evalImages <= 0).length,
    priorityStrong: priorityCoverage.filter((row) => row.status === "Strong").length,
  };
}

function buildPrefilterSummary(prefilterReportRaw: any, prefilteredManifest: any) {
  const manifestItems = Array.isArray(prefilteredManifest?.items) ? prefilteredManifest.items : [];
  return {
    generatedAt: prefilterReportRaw?.generatedAt ?? prefilteredManifest?.generatedAt ?? null,
    indexedImagesProcessed: Number(prefilterReportRaw?.indexedImagesProcessed ?? 0),
    candidatesKeptForReview: Number(prefilterReportRaw?.candidatesKeptForReview ?? manifestItems.length),
    glossyBadAutoRejected: Number(prefilterReportRaw?.glossyBadAutoRejected ?? 0),
    nonTargetImagesSkipped: Number(prefilterReportRaw?.nonTargetImagesSkipped ?? 0),
  };
}

function emptyDashboardPayload(warnings: JsonReadWarning[] = [], error?: string) {
  const coverageSummary = buildCoverageSummary(null, []);
  return {
    ok: false,
    error,
    warnings,
    stats: {
      totalIndexedImages: 0,
      approvedTrainingImages: 0,
      evalImages: 0,
      rejectedImages: 0,
      targetStrainCoverage: 0,
    },
    catalogCount: 0,
    coverageSummary,
    priorityCoverage: [],
    prefilterSummary: buildPrefilterSummary(null, null),
    recentActivity: [],
    targets: [],
    coverage: { byStrain: [] },
    queueSource: "vault-index",
    reviewQueue: [],
    reviewManifest: { version: 1, items: [] },
    scrapeStats: buildScrapeStats({ sources: [] }, [], [], [], []),
    catalogStats: buildCatalogStats({ strains: [] }, [], []),
    storage: dataStorageInfo(),
  };
}

function buildRecentActivity({
  coverageSummary,
  prefilterSummary,
  reviewQueueSize,
  scrapeStats,
  vaultTotalImages,
  reviewManifest,
}: {
  coverageSummary: any;
  prefilterSummary: any;
  reviewQueueSize: number;
  scrapeStats: any;
  vaultTotalImages: number;
  reviewManifest: any;
}) {
  const events = [];
  if (prefilterSummary.generatedAt) {
    events.push({
      title: "Latest prefilter run",
      detail: `${prefilterSummary.candidatesKeptForReview} images kept for review, ${prefilterSummary.glossyBadAutoRejected} glossy/bad auto-rejected.`,
      timestamp: prefilterSummary.generatedAt,
      tone: "warning",
    });
  }
  if (vaultTotalImages > 0) {
    events.push({
      title: "Vault index loaded",
      detail: `${vaultTotalImages} indexed images are available for review-first intake.`,
      timestamp: null,
      tone: "info",
    });
  }
  events.push({
    title: "Review queue ready",
    detail: `${reviewQueueSize} images currently visible in the review queue.`,
    timestamp: null,
    tone: reviewQueueSize > 0 ? "success" : "default",
  });
  if (coverageSummary.generatedAt) {
    events.push({
      title: "Coverage report generated",
      detail: `${coverageSummary.totalTrainingStrains} training strains, ${coverageSummary.totalTrainingImages} approved training images, ${coverageSummary.totalEvalImages} eval images.`,
      timestamp: coverageSummary.generatedAt,
      tone: "info",
    });
  }
  if (scrapeStats?.lastScrapeRun) {
    const run = scrapeStats.lastScrapeRun;
    events.push({
      title: "Latest scrape run",
      detail: `${run.type ?? "scrape"} finished with ${run.imagesDownloaded ?? 0} images downloaded and ${run.errors ?? 0} errors.`,
      timestamp: run.finishedAt ?? run.startedAt ?? null,
      tone: Number(run.errors ?? 0) > 0 ? "warning" : "success",
    });
  }
  const reviewItems = Array.isArray(reviewManifest?.items) ? reviewManifest.items : [];
  if (reviewItems.length > 0) {
    const training = reviewItems.filter((item: any) => item.approvedForTraining === true).length;
    const evalItems = reviewItems.filter((item: any) => item.approvedForEval === true).length;
    const rejected = reviewItems.filter((item: any) => item.rejectReason).length;
    events.push({
      title: "Review decisions saved",
      detail: `${training} training approvals, ${evalItems} eval approvals, ${rejected} rejected items in the local review manifest.`,
      timestamp: null,
      tone: "default",
    });
  }
  return events;
}

function queueItemFromManifestItem(item: any) {
  const fileKey = fileKeyForPath(item.filePath);
  return {
    fileName: item.fileName,
    fileKey,
    extension: extnameLower(item.fileName ?? ""),
    size: item.size,
    modifiedAt: item.modifiedAt,
    guessedStrainSlug: item.strainSlug || item.guessedStrainSlug,
    source: item.source || "prefiltered",
    prefilterScore: item.prefilterScore,
    prefilterReasons: item.prefilterReasons,
    previewUrl: `/api/data-engine/image?key=${fileKey}`,
    quality: scoreDatasetImageQuality({
      fileName: item.fileName,
      filePath: item.filePath,
      size: item.size,
      source: item.source || "prefiltered",
      sourceConfidence: "medium",
      labelConfidence: item.labelConfidence || "medium",
    }),
  };
}

export async function GET() {
  const blocked = localOnly();
  if (blocked) return blocked;
  jsonReadWarnings.length = 0;

  try {
    const [
    targets,
    coverage,
    vaultIndexRaw,
    reviewManifestRaw,
    purpleClusterRaw,
    prefilteredRaw,
    prefilterReportRaw,
    sourceRegistryRaw,
    normalizedCatalogRaw,
    metadataCandidatesRaw,
    imageCandidatesRaw,
    scrapeRunsRaw,
    sourceErrorsRaw,
    inboxItems,
    ] = await Promise.all([
      readJson(TARGETS_PATH, []),
      readJson(COVERAGE_PATH, null),
      readJson(VAULT_INDEX_PATH, { items: [] }),
      readJson(REVIEW_MANIFEST_PATH, { version: 1, items: [] }),
      readJson(PURPLE_CLUSTER_MANIFEST_PATH, null),
      readJson(PREFILTERED_MANIFEST_PATH, null),
      readJson(PREFILTER_REPORT_PATH, null),
      readJson(SOURCE_REGISTRY_PATH, { version: 1, sources: [] }),
      readJson(NORMALIZED_CATALOG_PATH, { version: 1, updatedAt: null, strains: [] }),
      readJson(METADATA_CANDIDATES_PATH, []),
      readJson(IMAGE_CANDIDATES_PATH, []),
      readJson(SCRAPE_RUNS_PATH, []),
      readJson(SOURCE_ERRORS_PATH, []),
      listInboxItems(),
    ]);

  const rawVaultItems = Array.isArray((vaultIndexRaw as any).items)
    ? (vaultIndexRaw as any).items
    : [];

  const reviewManifest = normalizeReviewManifest(reviewManifestRaw);
  const purpleClusterManifest =
    purpleClusterRaw == null ? null : normalizeReviewManifest(purpleClusterRaw);
  const prefilteredManifest =
    prefilteredRaw == null ? null : normalizeReviewManifest(prefilteredRaw);
  const purpleClusterItems =
    purpleClusterManifest?.items.map(queueItemFromManifestItem) ?? [];
  const prefilteredItems = prefilteredManifest?.items.map(queueItemFromManifestItem) ?? [];
  const activeQueueSource =
    purpleClusterItems.length > 0
      ? "purple-cluster"
      : prefilteredItems.length > 0
        ? "prefiltered"
        : "vault-index";
  const fallbackVaultItems =
    purpleClusterItems.length > 0 || prefilteredItems.length > 0
      ? []
      : rawVaultItems.slice(0, 250).map((item: any) => {
          const fileKey = fileKeyForPath(item.filePath);
          return {
            fileName: item.fileName,
            fileKey,
            extension: item.extension,
            size: item.size,
            modifiedAt: item.modifiedAt,
            guessedStrainSlug: item.guessedStrainSlug,
            source: item.source,
            previewUrl: `/api/data-engine/image?key=${fileKey}`,
            quality: scoreDatasetImageQuality({
              fileName: item.fileName,
              filePath: item.filePath,
              size: item.size,
              source: item.source,
              sourceConfidence: "medium",
              labelConfidence: item.guessedStrainSlug ? "medium" : "low",
            }),
          };
        });
  const reviewQueue =
    purpleClusterItems.length > 0
      ? [...purpleClusterItems, ...inboxItems]
      : prefilteredItems.length > 0
        ? [...prefilteredItems, ...inboxItems]
        : [...fallbackVaultItems, ...inboxItems];
  const stats = {
    totalIndexedImages: Number((vaultIndexRaw as any)?.totalImages ?? rawVaultItems.length),
    approvedTrainingImages: await countImages(REAL_DIR),
    evalImages: await countImages(EVAL_DIR),
    rejectedImages: await countImages(REJECTED_DIR),
    targetStrainCoverage: Array.isArray(targets) ? targets.length : 0,
  };
  const scrapeStats = buildScrapeStats(
    sourceRegistryRaw,
    metadataCandidatesRaw,
    imageCandidatesRaw,
    scrapeRunsRaw,
    sourceErrorsRaw
  );
  const priorityCoverage = buildPriorityCoverage(coverage, targets);
  const coverageSummary = buildCoverageSummary(coverage, priorityCoverage);
  const prefilterSummary = buildPrefilterSummary(prefilterReportRaw, prefilteredManifest);
  const catalogStats = buildCatalogStats(normalizedCatalogRaw, targets, metadataCandidatesRaw);
  const recentActivity = buildRecentActivity({
    coverageSummary,
    prefilterSummary,
    reviewQueueSize: reviewQueue.length,
    scrapeStats,
    vaultTotalImages: stats.totalIndexedImages,
    reviewManifest,
  });

  return NextResponse.json({
    stats,
    ok: true,
    warnings: jsonReadWarnings,
    catalogCount: catalogStats.totalNormalizedStrains,
    coverageSummary,
    priorityCoverage,
    prefilterSummary,
    recentActivity,
    targets,
    coverage,
    queueSource: activeQueueSource,
    reviewQueue,
    reviewManifest: sanitizeReviewManifest(reviewManifest),
    scrapeStats,
    catalogStats,
    storage: dataStorageInfo(),
  });
  } catch (error) {
    console.error("[DataEngine] Manifest API failed; returning fallback dashboard payload", error);
    return NextResponse.json(
      emptyDashboardPayload(
        jsonReadWarnings,
        error instanceof Error ? error.message : "Unknown manifest error"
      ),
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  const blocked = localOnly();
  if (blocked) return blocked;

  const body = (await request.json()) as ReviewDecision;
  if (!body.fileName || !body.strainSlug) {
    return NextResponse.json({ error: "fileName and strainSlug are required" }, { status: 400 });
  }

  await mkdir(DATA_DIR, { recursive: true });
  const manifest = normalizeReviewManifest(await readJson(REVIEW_MANIFEST_PATH, { version: 1, items: [] }));
  const resolvedFilePath =
    body.filePath ??
    resolveFilePathByKey(body.fileKey, [
      { items: await listInboxPathItems() },
      await readJson(PREFILTERED_MANIFEST_PATH, null),
      await readJson(PURPLE_CLUSTER_MANIFEST_PATH, null),
      await readJson(VAULT_INDEX_PATH, { items: [] }),
    ]);
  const key = resolvedFilePath || body.fileName;
  const nextItem = {
    fileName: body.fileName,
    filePath: resolvedFilePath,
    strainSlug: body.strainSlug,
    source: body.source || "unknown",
    labelConfidence: body.labelConfidence || "medium",
    approvedForTraining: body.approvedForTraining === true,
    approvedForEval: body.approvedForEval === true,
    rejectReason: body.rejectReason ?? null,
    notes: body.notes ?? "",
  };

  const existingIndex = manifest.items.findIndex(
    (item: any) => (item.filePath || item.fileName) === key
  );
  if (existingIndex >= 0) manifest.items[existingIndex] = nextItem;
  else manifest.items.push(nextItem);

  await writeFile(REVIEW_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return NextResponse.json({ ok: true, reviewManifest: sanitizeReviewManifest(manifest) });
}
