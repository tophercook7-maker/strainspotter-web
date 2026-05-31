import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { dirname, join } from "node:path";
import { NextResponse } from "next/server";
import { dataEnginePaths, dataStorageInfo } from "@/lib/data-engine/dataPaths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
export const SCRAPE_TARGETS_PATH = dataEnginePaths.scrapeTargetsPath();
export const SCRAPE_STATUS_PATH = dataEnginePaths.scrapeStatusPath();
export const SOURCE_REGISTRY_PATH = dataEnginePaths.sourceRegistryPath();
export const SCRAPE_RUNS_PATH = dataEnginePaths.scrapeRunsPath();
export const IMAGE_CANDIDATES_PATH = dataEnginePaths.imageCandidatesPath();
export const METADATA_CANDIDATES_PATH = dataEnginePaths.metadataCandidatesPath();
export const REVIEW_PREFERENCES_PATH = dataEnginePaths.reviewPreferencesPath();
export const REVIEW_MANIFEST_PATH = dataEnginePaths.reviewManifestPath();
export { dataStorageInfo };

type ScrapeRun = {
  type: "photos";
  child?: ChildProcessWithoutNullStreams | null;
};

type ScrapeGlobal = typeof globalThis & {
  __strainspotterScrapeRun?: ScrapeRun | null;
};

export const defaultScrapeStatus = {
  running: false,
  startedAt: null,
  stoppedAt: null,
  lastAction: null,
  currentSource: null,
  currentStrain: null,
  processedPages: 0,
  downloadedImages: 0,
  imageUrlsFound: 0,
  attemptedDownloads: 0,
  sentToReview: 0,
  autoTraining: 0,
  autoEval: 0,
  autoRejected: 0,
  autoReview: 0,
  autoSetAside: 0,
  bestReviewCandidates: 0,
  imagesSkipped: 0,
  skippedImages: 0,
  rejectedImages: 0,
  rejectionReasons: {},
  filterMode: "review-borderline",
  reviewMode: "auto-sort-safe",
  readySources: 0,
  totalSources: 0,
  errors: [],
  lastError: null,
  log: [],
  recentEvents: [],
  stopRequested: false,
};

const defaultScrapeTargets = {
  version: 1,
  active: true,
  mode: "priority-cluster",
  reviewMode: "auto-sort-safe",
  filterMode: "review-borderline",
  maxImagesPerStrain: 25,
  maxPagesPerRun: 100,
  clusters: {},
  selectedStrains: [],
};

export function localOnly() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Data engine is local-only." }, { status: 404 });
  }
  return null;
}

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export async function readScrapeTargets() {
  const targets = await readJson<Record<string, any>>(SCRAPE_TARGETS_PATH, defaultScrapeTargets);
  return {
    ...defaultScrapeTargets,
    ...targets,
    clusters: targets.clusters ?? {},
    selectedStrains: Array.isArray(targets.selectedStrains) ? targets.selectedStrains : [],
  };
}

export async function readScrapeStatus() {
  const status = await readJson<Record<string, any>>(SCRAPE_STATUS_PATH, defaultScrapeStatus);
  return {
    ...defaultScrapeStatus,
    ...status,
    errors: Array.isArray(status.errors) ? status.errors : [],
    log: Array.isArray(status.log) ? status.log : [],
    recentEvents: Array.isArray(status.recentEvents) ? status.recentEvents : [],
  };
}

export async function writeScrapeStatus(patch: Record<string, unknown>) {
  const current = await readScrapeStatus();
  await writeJson(SCRAPE_STATUS_PATH, {
    ...current,
    ...patch,
    errors: patch.errors ?? current.errors,
    log: patch.log ?? current.log,
    recentEvents: patch.recentEvents ?? current.recentEvents,
  });
}

export function slugify(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function countsBy(rows: any[], key: string) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = String(row?.[key] ?? "unknown");
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function sourceStrategy(source: any) {
  if (source.sourceType === "local-folder" || source.type === "local-folder") return "local-folder";
  if (
    source.sourceType === "image-search-json" ||
    source.sourceType === "image-search-api" ||
    source.type === "image-search-json" ||
    source.type === "image-search-api"
  ) {
    return "image-search-json";
  }
  if (source.type === "metadata-pages") return "metadata-pages";
  if (source.type === "direct-image-list") return "direct-image-list";
  if (source.type === "rss-feed") return "rss-feed";
  if (source.type === "search-url-template" || source.searchUrlTemplate || source.search?.url) return "search-url-template";
  return "configured-pages";
}

function searchTemplate(source: any) {
  return source.endpoint || source.searchUrlTemplate || source.search?.url || "";
}

export function sourceSetupIssues(source: any) {
  const issues: string[] = [];
  const strategy = sourceStrategy(source);
  if (String(source.baseUrl ?? "").includes("example.com")) {
    issues.push("Replace example.com with a real allowed source");
  }
  if (source.enabled === true && String(source.licenseNotes ?? "").toLowerCase().includes("enable only if")) {
    issues.push("License or permission must be confirmed before enabling");
  }
  if (String(source.licenseNotes ?? "").trim().toLowerCase().startsWith("disabled:")) {
    issues.push("Source license notes mark it disabled");
  }
  if (strategy === "local-folder") {
    const roots = Array.isArray(source.localRoots) ? source.localRoots : [];
    if (!roots.some((root: unknown) => existsSync(String(root)))) issues.push("TheVault folder not found.");
  }
  if (strategy === "configured-pages" && (!Array.isArray(source.seedUrls) || source.seedUrls.length === 0)) {
    issues.push("Missing seed URLs");
  }
  if (strategy === "rss-feed" && (!Array.isArray(source.seedUrls) || source.seedUrls.length === 0)) {
    issues.push("Missing feed URLs");
  }
  if (
    !["direct-image-list", "local-folder", "image-search-json"].includes(strategy) &&
    (!source.selectors || typeof source.selectors !== "object")
  ) {
    issues.push("Missing selectors");
  }
  if (
    !["direct-image-list", "local-folder", "image-search-json"].includes(strategy) &&
    !source.selectors?.imageUrls &&
    !source.selectors?.image &&
    String(source.sourceType ?? "").includes("images")
  ) {
    issues.push("Missing image selector");
  }
  if (strategy === "search-url-template" && !searchTemplate(source)) {
    issues.push("Missing search URL template");
  }
  if (strategy === "image-search-json" && !searchTemplate(source)) {
    issues.push("Missing search endpoint URL");
  }
  if (strategy === "image-search-json" && source.apiKeyEnv && !process.env[source.apiKeyEnv]) {
    issues.push(`Needs API key: ${source.apiKeyEnv}`);
  }
  if (strategy === "image-search-json" && source.cxEnv && !process.env[source.cxEnv]) {
    issues.push(`Needs search engine id: ${source.cxEnv}`);
  }
  if (strategy === "direct-image-list" && (!Array.isArray(source.imageUrls) || source.imageUrls.length === 0)) {
    issues.push("Missing direct image URLs");
  }
  if (
    !Number.isFinite(Number(source.rateLimitMs)) ||
    Number(source.rateLimitMs) < (strategy === "local-folder" ? 0 : 1000)
  ) {
    issues.push("Missing safe wait time");
  }
  if (!source.licenseNotes) issues.push("Missing license or permission note");
  return issues;
}

export function sourceStatus(source: any) {
  if (source.enabled !== true) return "Disabled";
  return sourceSetupIssues(source).length ? "Needs setup" : "Ready";
}

function isStaleRunningStatus(status: Record<string, any>) {
  if (status.running !== true) return false;
  const started = status.startedAt ? new Date(status.startedAt).getTime() : 0;
  return !started || Date.now() - started > 15 * 60 * 1000;
}

function sanitizeText(value: string) {
  return value
    .replaceAll(ROOT, ".")
    .replace(/\/Users\/[^\s"'`]+/g, "[local]")
    .replace(/\/Volumes\/[^\s"'`]+/g, "[vault]");
}

function outputLines(stdout: string, stderr: string) {
  return sanitizeText([stdout, stderr].filter(Boolean).join("\n"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-40);
}

export async function runScrapeCommand() {
  const blocked = localOnly();
  if (blocked) return blocked;

  const globalState = globalThis as ScrapeGlobal;
  const status = await readScrapeStatus();
  if (!globalState.__strainspotterScrapeRun && isStaleRunningStatus(status)) {
    await writeScrapeStatus({
      running: false,
      stopRequested: false,
      currentSource: null,
      currentStrain: null,
      lastAction: "auto-reset-stale-run",
      stoppedAt: new Date().toISOString(),
      lastError: "Recovered stale scraper state older than 15 minutes.",
    });
  }
  const nextStatus = await readScrapeStatus();
  if (globalState.__strainspotterScrapeRun || nextStatus.running) {
    return NextResponse.json(
      {
        status: "error",
        error: "A scrape is already running.",
        scrapeStatus: nextStatus,
      },
      { status: 409 }
    );
  }

  // Built at runtime so Turbopack doesn't try to statically resolve it
  // as a module import (it's a child_process target, not a module).
  const script = ["scripts", "run-photo-scraper.mjs"].join("/");
  const startedAt = new Date().toISOString();
  await writeScrapeStatus({
    running: true,
    startedAt,
    stoppedAt: null,
    lastAction: "photos",
    currentSource: null,
    currentStrain: null,
    processedPages: 0,
    downloadedImages: 0,
    imageUrlsFound: 0,
    attemptedDownloads: 0,
    sentToReview: 0,
    imagesSkipped: 0,
    skippedImages: 0,
    rejectedImages: 0,
    rejectionReasons: {},
    errors: [],
    lastError: null,
    log: ["Starting photo scraping"],
    recentEvents: [],
    stopRequested: false,
  });

  const child = spawn("node", [script], { cwd: ROOT, env: process.env });
  globalState.__strainspotterScrapeRun = { type: "photos", child };
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  child.on("close", async (code) => {
    globalState.__strainspotterScrapeRun = null;
    if (code !== 0) {
      const current = await readScrapeStatus();
      await writeScrapeStatus({
        running: false,
        stoppedAt: new Date().toISOString(),
        lastError: `Photo scraper exited with code ${code}.`,
        errors: [
          ...(Array.isArray(current.errors) ? current.errors : []),
          {
            at: new Date().toISOString(),
            message: `Photo scraper exited with code ${code}.`,
            output: outputLines(stdout, stderr).slice(-8).join("\n"),
          },
        ].slice(-10),
      });
    }
  });

  return NextResponse.json(
    {
      status: "started",
      type: "photos",
      startedAt,
      scrapeStatus: await readScrapeStatus(),
      message: "Photo scraping started.",
    },
    { status: 202 }
  );
}

export async function requestScrapeStop() {
  const blocked = localOnly();
  if (blocked) return blocked;

  await writeScrapeStatus({
    stopRequested: true,
    lastAction: "stop-requested",
    stoppedAt: new Date().toISOString(),
    recentEvents: [
      ...((await readScrapeStatus()).recentEvents ?? []),
      { at: new Date().toISOString(), message: "Stop requested" },
    ].slice(-50),
  });
  return NextResponse.json({
    status: "success",
    message: "Stop requested. The scraper will stop between pages or image downloads.",
    scrapeStatus: await readScrapeStatus(),
  });
}
