/**
 * Page Fetch — fetch HTML/JSON with robots.txt and rate limit respect.
 * Scaffolded; implement real fetch with throttling.
 */

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { CONFIG } from "./config.js";

const USER_AGENT = "StrainSpotter-Ingestion/1.0 (+https://strainspotter.app)";
const DEFAULT_DELAY_MS = 2000;

export interface FetchOptions {
  delayMs?: number;
  respectRobots?: boolean;
}

/**
 * Fetch URL and save to raw_sources. Placeholder — no actual fetch until pipeline is ready.
 */
export async function fetchPage(
  url: string,
  destDir: "html" | "json",
  filename: string,
  _options?: FetchOptions
): Promise<boolean> {
  const dir = join(CONFIG.VAULT_ROOT, "raw_sources", destDir);
  await mkdir(dir, { recursive: true });
  // Scaffold: would fetch, parse robots.txt, throttle. For now no-op.
  return false;
}
