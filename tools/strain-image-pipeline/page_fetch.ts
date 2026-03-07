/**
 * Page Fetch — fetch HTML/JSON with throttling and user-agent.
 * Supports fixture mode for end-to-end testing without live requests.
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { CONFIG, PATHS } from "./config.js";

const USER_AGENT =
  "StrainSpotter-Ingestion/1.0 (+https://strainspotter.app)";
const DEFAULT_DELAY_MS = 2000;

export interface FetchOptions {
  delayMs?: number;
  respectRobots?: boolean;
  useFixture?: boolean;
}

export interface FetchResult {
  ok: boolean;
  rawContent: string;
  contentType: "html" | "json";
  source: "fixture" | "live";
}

/**
 * Load page content from a local fixture (for testing without live fetch).
 * Writes a copy to raw_sources for traceability.
 */
export async function fetchPageFromFixture(
  strainSlug: string,
  filename?: string
): Promise<FetchResult | null> {
  const f = filename ?? `${strainSlug}.html`;
  const path = PATHS.fixtures(f);
  if (!existsSync(path)) return null;
  const rawContent = await readFile(path, "utf-8");
  const contentType = f.endsWith(".json") ? "json" : "html";
  const outPath = contentType === "json" ? PATHS.rawJson(strainSlug) : PATHS.rawHtml(strainSlug);
  await mkdir(join(CONFIG.VAULT_ROOT, "raw_sources", contentType), { recursive: true });
  await writeFile(outPath, rawContent, "utf-8");
  return {
    ok: true,
    rawContent,
    contentType,
    source: "fixture",
  };
}

/**
 * Fetch URL and save to raw_sources. Includes throttling and user-agent.
 */
export async function fetchPageLive(
  url: string,
  strainSlug: string,
  contentType: "html" | "json",
  options?: FetchOptions
): Promise<FetchResult> {
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
  const dir = join(CONFIG.VAULT_ROOT, "raw_sources", contentType);
  await mkdir(dir, { recursive: true });
  const ext = contentType === "json" ? ".json" : ".html";
  const outPath = join(dir, `${strainSlug}${ext}`);

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });
  if (!res.ok) {
    return {
      ok: false,
      rawContent: "",
      contentType,
      source: "live",
    };
  }
  const rawContent = await res.text();
  await writeFile(outPath, rawContent, "utf-8");
  await sleep(delayMs);
  return {
    ok: true,
    rawContent,
    contentType,
    source: "live",
  };
}

/**
 * Fetch page: fixture mode (useFixture) or live mode.
 * In fixture mode, reads from fixtures/{strainSlug}.html and optionally writes to raw_sources.
 */
export async function fetchPage(
  strainSlug: string,
  sourceUrl?: string,
  options?: FetchOptions
): Promise<FetchResult | null> {
  if (options?.useFixture ?? true) {
    return fetchPageFromFixture(strainSlug);
  }
  if (!sourceUrl) return null;
  const contentType = sourceUrl.endsWith(".json") ? "json" : "html";
  return fetchPageLive(sourceUrl, strainSlug, contentType, options);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
