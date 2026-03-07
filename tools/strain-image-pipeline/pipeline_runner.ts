#!/usr/bin/env node
/**
 * Pipeline runner: download -> classify -> quality -> dedupe -> promote.
 * Limit: 500 images per run.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { CONFIG, PATHS } from "./config.js";
import { runDownload } from "./download_images.js";
import { runClassifier } from "./image_classifier.js";
import { runQualityCheck } from "./image_quality_check.js";
import { runDedupe } from "./image_dedupe.js";
import { runPromote } from "./promote.js";
import type { DownloadStats } from "./types.js";
import type { QualityStats } from "./image_quality_check.js";
import type { DedupeStats } from "./image_dedupe.js";

async function loadStrainNames(source?: string): Promise<string[]> {
  if (source) {
    try {
      const raw = await readFile(source, "utf-8");
      return raw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      console.warn("Could not read strain list from", source);
    }
  }
  // Default: try full_strains_35000.txt on Vault drive
  for (const base of ["/Volumes/Vault/", "/Volumes/TheVault/"]) {
    try {
      const path = `${base}full_strains_35000.txt`;
      const raw = await readFile(path, "utf-8");
      return raw
        .split(/\r?\n/)
        .slice(0, 50)
        .map((s) => s.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter(Boolean);
    } catch {
      continue;
    }
  }
  return ["blue-dream", "og-kush", "sour-diesel", "gelato", "wedding-cake"];
}

async function main() {
  const args = process.argv.slice(2);
  const strainListPath = args[0] || process.env.STRAIN_LIST;

  const strainNames = await loadStrainNames(strainListPath);
  console.log(`[Pipeline] Processing ${strainNames.length} strains`);
  console.log(`[Pipeline] Max ${CONFIG.MAX_IMAGES_PER_RUN} images per run, ${CONFIG.MAX_IMAGES_PER_STRAIN} per strain`);
  console.log("");

  const downloadStats: DownloadStats = await runDownload({
    strainNames,
    maxPerRun: CONFIG.MAX_IMAGES_PER_RUN,
    maxPerStrain: CONFIG.MAX_IMAGES_PER_STRAIN,
  });
  console.log(`[Download] strains=${downloadStats.strainsProcessed} downloaded=${downloadStats.imagesDownloaded} rejected=${downloadStats.imagesRejected}`);

  const classified = await runClassifier(strainNames);
  console.log(`[Classify] ${classified} images classified`);

  const qualityStats: QualityStats = await runQualityCheck(strainNames);
  console.log(`[Quality] checked=${qualityStats.checked} passed=${qualityStats.passed} rejected=${qualityStats.rejected}`);

  const dedupeStats: DedupeStats = await runDedupe(strainNames);
  console.log(`[Dedupe] total=${dedupeStats.total} duplicates_removed=${dedupeStats.duplicatesRemoved}`);

  const promoted = await runPromote(strainNames);
  downloadStats.imagesPromoted = promoted;
  console.log(`[Promote] ${promoted} images promoted to staging`);

  console.log("");
  console.log("--- Summary ---");
  console.log(`Strains processed:     ${downloadStats.strainsProcessed}`);
  console.log(`Images downloaded:     ${downloadStats.imagesDownloaded}`);
  console.log(`Images rejected:       ${downloadStats.imagesRejected + qualityStats.rejected}`);
  console.log(`Images promoted:       ${downloadStats.imagesPromoted}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
