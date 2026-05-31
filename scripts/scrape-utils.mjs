import { readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { DATA_PATHS } from "./data-paths.mjs";

export const SOURCE_REGISTRY_PATH = DATA_PATHS.sourceRegistryPath();
export const SCRAPE_RUNS_PATH = DATA_PATHS.scrapeRunsPath();
export const SOURCE_ERRORS_PATH = DATA_PATHS.sourceErrorsPath();
export const SCRAPE_TARGETS_PATH = DATA_PATHS.scrapeTargetsPath();
export const SCRAPE_STATUS_PATH = DATA_PATHS.scrapeStatusPath();
export const IMAGE_CANDIDATES_PATH = DATA_PATHS.imageCandidatesPath();
export const METADATA_CANDIDATES_PATH = DATA_PATHS.metadataCandidatesPath();
export const REVIEW_PREFERENCES_PATH = DATA_PATHS.reviewPreferencesPath();
export const REVIEW_MANIFEST_PATH = DATA_PATHS.reviewManifestPath();
export const INBOX_DIR = DATA_PATHS.inboxDir();
export const REAL_DIR = DATA_PATHS.realDir();
export const EVAL_DIR = DATA_PATHS.evalDir();
export const REJECTED_DIR = DATA_PATHS.rejectedDir();
export const GLOSSY_DIR = DATA_PATHS.glossyDir();

export const DEFAULT_SCRAPE_TARGETS = {
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

export const DEFAULT_SCRAPE_STATUS = {
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
  readySources: 0,
  totalSources: 0,
  errors: [],
  lastError: null,
  log: [],
  recentEvents: [],
  stopRequested: false,
};

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSameOrigin(url, baseUrl) {
  try {
    return new URL(url).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

export function hostMatches(url, hosts = []) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hosts.some((host) => {
      const normalized = String(host ?? "").toLowerCase().trim();
      return normalized && (hostname === normalized || hostname.endsWith(`.${normalized}`));
    });
  } catch {
    return false;
  }
}

export async function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, JSON.stringify(value, null, 2) + "\n", "utf8");
  await rename(tempPath, path);
}

export async function appendJsonArray(path, rows) {
  const current = await readJson(path, []);
  const next = Array.isArray(current) ? current : [];
  next.push(...rows);
  await writeJson(path, next);
}

export async function readRegistry() {
  const registry = await readJson(SOURCE_REGISTRY_PATH, { version: 1, sources: [] });
  if (!Array.isArray(registry.sources)) {
    throw new Error("data/source-registry.json must include a sources array");
  }
  return registry;
}

export async function readScrapeTargets() {
  const targets = await readJson(SCRAPE_TARGETS_PATH, DEFAULT_SCRAPE_TARGETS);
  return {
    ...DEFAULT_SCRAPE_TARGETS,
    ...targets,
    clusters: targets?.clusters ?? {},
    selectedStrains: Array.isArray(targets?.selectedStrains) ? targets.selectedStrains : [],
  };
}

export async function readScrapeStatus() {
  const status = await readJson(SCRAPE_STATUS_PATH, DEFAULT_SCRAPE_STATUS);
  return {
    ...DEFAULT_SCRAPE_STATUS,
    ...status,
    errors: Array.isArray(status?.errors) ? status.errors : [],
    log: Array.isArray(status?.log) ? status.log : [],
    recentEvents: Array.isArray(status?.recentEvents) ? status.recentEvents : [],
  };
}

export async function writeScrapeStatus(patch) {
  const current = await readScrapeStatus();
  await writeJson(SCRAPE_STATUS_PATH, {
    ...current,
    ...patch,
    errors: patch.errors ?? current.errors,
    log: patch.log ?? current.log,
    recentEvents: patch.recentEvents ?? current.recentEvents,
  });
}

export async function appendScrapeEvent(message) {
  const current = await readScrapeStatus();
  const event = {
    at: new Date().toISOString(),
    message,
  };
  const textLine = `${new Date().toLocaleTimeString()} ${message}`;
  await writeScrapeStatus({
    log: [...(Array.isArray(current.log) ? current.log : []), textLine].slice(-80),
    recentEvents: [...(Array.isArray(current.recentEvents) ? current.recentEvents : []), event].slice(-50),
  });
}

export async function beginScrapeStatus(action) {
  await writeScrapeStatus({
    running: true,
    startedAt: new Date().toISOString(),
    stoppedAt: null,
    lastAction: action,
    currentSource: null,
    currentStrain: null,
    processedPages: 0,
    downloadedImages: 0,
    errors: [],
    stopRequested: false,
  });
}

export async function finishScrapeStatus(patch = {}) {
  const current = await readScrapeStatus();
  await writeScrapeStatus({
    running: false,
    stoppedAt: new Date().toISOString(),
    currentSource: null,
    currentStrain: null,
    ...patch,
    errors: patch.errors ?? current.errors,
  });
}

export async function shouldStopScrape() {
  const status = await readScrapeStatus();
  return status.stopRequested === true;
}

export function targetStrainSet(targets) {
  if (targets?.mode === "all") return null;
  const selected = Array.isArray(targets?.selectedStrains) ? targets.selectedStrains : [];
  return new Set(selected.map(slugify).filter(Boolean));
}

export function targetAllowsStrain(targets, strainSlug) {
  const allowed = targetStrainSet(targets);
  if (!allowed) return true;
  return allowed.has(slugify(strainSlug));
}

export async function logSourceErrors(errors) {
  if (!errors.length) return;
  await appendJsonArray(SOURCE_ERRORS_PATH, errors);
}

export async function robotsAllows(targetUrl, source) {
  if (source.robotsPolicy !== "respect") return false;

  let response;
  let url;
  try {
    url = new URL(targetUrl);
    const robotsUrl = `${url.origin}/robots.txt`;
    response = await fetch(robotsUrl, {
      headers: { "User-Agent": "StrainSpotterDataEngine/2.0" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return false;
  }

  if (response.status === 404) return true;
  if (!response.ok) return false;

  const text = await response.text();
  let applies = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      const agent = value.toLowerCase();
      applies = agent === "*" || agent === "strainspotterdataengine";
      continue;
    }

    if (applies && key === "disallow" && value && url.pathname.startsWith(value)) {
      return false;
    }
  }
  return true;
}

export function extractLinks(html, pageUrl, selector) {
  if (!selector) return [];
  const links = new Set();
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = anchorPattern.exec(html))) {
    try {
      links.add(new URL(match[1], pageUrl).toString());
    } catch {
      // Skip malformed URLs.
    }
  }
  return [...links];
}

export function extractImages(html, pageUrl, selector) {
  if (!selector) return [];
  const images = new Set();
  const imagePattern = /<img\b[^>]*(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imagePattern.exec(html))) {
    try {
      images.add(new URL(match[1], pageUrl).toString());
    } catch {
      // Skip malformed URLs.
    }
  }
  const srcsetPattern = /<img\b[^>]*srcset=["']([^"']+)["'][^>]*>/gi;
  while ((match = srcsetPattern.exec(html))) {
    for (const candidate of match[1].split(",")) {
      const [rawUrl] = candidate.trim().split(/\s+/);
      if (!rawUrl) continue;
      try {
        images.add(new URL(rawUrl, pageUrl).toString());
      } catch {
        // Skip malformed URLs.
      }
    }
  }
  return [...images];
}

export function stripTags(value) {
  return String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classFromSelector(selector) {
  const match = selector.match(/\.([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

export function extractTextBySelector(html, selector) {
  if (!selector) return "";
  const className = classFromSelector(selector);
  if (!className) return "";
  const pattern = new RegExp(
    `<([a-z0-9]+)\\\\b[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\\\s\\\\S]*?)<\\\\/\\\\1>`,
    "i"
  );
  const match = html.match(pattern);
  return stripTags(match?.[2] ?? "");
}

export function extractListBySelector(html, selector) {
  const text = extractTextBySelector(html, selector);
  if (!text) return [];
  return text
    .split(/[,|•]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
