/**
 * Source Queue — strain list and source URL management for ingestion.
 * Scaffolded; extend with real source resolution.
 */

import { readFile } from "fs/promises";
import { CONFIG } from "./config.js";

export interface QueueItem {
  strain: string;
  sourceUrl?: string;
  sourceSite?: string;
}

/**
 * Load strain names from file or default list.
 */
export async function loadStrainQueue(sourcePath?: string): Promise<string[]> {
  if (sourcePath) {
    try {
      const raw = await readFile(sourcePath, "utf-8");
      return raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    } catch {
      console.warn("Could not read queue from", sourcePath);
    }
  }
  for (const base of ["/Volumes/Vault/", "/Volumes/TheVault/"]) {
    try {
      const raw = await readFile(`${base}full_strains_35000.txt`, "utf-8");
      return raw.split(/\r?\n/).slice(0, 100).map((s) => s.trim()).filter(Boolean);
    } catch {
      continue;
    }
  }
  return ["blue-dream", "og-kush", "sour-diesel", "gelato", "wedding-cake"];
}

/**
 * Get queue items with optional source URLs. Placeholder for source resolution.
 */
export async function getQueueItems(strainNames: string[]): Promise<QueueItem[]> {
  return strainNames.map((strain) => ({ strain }));
}
