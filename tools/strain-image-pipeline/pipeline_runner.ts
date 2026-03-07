#!/usr/bin/env node
/**
 * Pipeline runner: source queue -> page fetch -> image extraction -> download ->
 * classify -> quality -> dedupe -> promote -> review queue output.
 * Supports fixture mode for end-to-end testing.
 */

import { readFile, readdir, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { CONFIG, PATHS } from "./config.js";
import { loadStrainQueue } from "./source_queue.js";
import { fetchPage } from "./page_fetch.js";
import { extractImageUrls } from "./image_url_extraction.js";
import { runDownload } from "./download_images.js";
import { runClassifier } from "./image_classifier.js";
import { runQualityCheck } from "./image_quality_check.js";
import { runDedupe } from "./image_dedupe.js";
import { runPromote } from "./promote.js";
import { writeToReviewQueue } from "./review_queue_output.js";
import type { DownloadStats } from "./types.js";
import type { QualityStats } from "./image_quality_check.js";
import type { DedupeStats } from "./image_dedupe.js";

const USE_FIXTURE = process.env.USE_FIXTURE !== "0";
const SMALL_BATCH_SIZE = 5;

async function loadStrainNames(source?: string): Promise<string[]> {
  const names = await loadStrainQueue(source);
  return names.slice(0, SMALL_BATCH_SIZE).map((s) => s.trim().toLowerCase().replace(/\s+/g, "-"));
}

interface RunManifest {
  runId: string;
  startedAt: string;
  finishedAt: string;
  mode: "fixture" | "live";
  strainsProcessed: number;
  pagesFetched: number;
  imageUrlsExtracted: number;
  imagesDownloaded: number;
  imagesRejected: number;
  promotedToReview: number;
}

async function writeRunLog(
  runId: string,
  lines: string[]
): Promise<void> {
  await mkdir(PATHS.logs, { recursive: true });
  const logPath = join(PATHS.logs, `run_${runId}.log`);
  await writeFile(logPath, lines.join("\n"), "utf-8");
}

async function writeRunManifest(manifest: RunManifest): Promise<string> {
  await mkdir(PATHS.logs, { recursive: true });
  const path = join(PATHS.logs, `manifest_${manifest.runId}.json`);
  await writeFile(path, JSON.stringify(manifest, null, 2), "utf-8");
  return path;
}

async function countPromotedImages(strainNames: string[]): Promise<number> {
  let n = 0;
  for (const name of strainNames) {
    const dir = PATHS.candidateImages(name);
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(e.name)) n++;
      }
    } catch {
      // skip
    }
  }
  return n;
}

async function main() {
  const args = process.argv.slice(2);
  const strainListPath = args[0] || process.env.STRAIN_LIST;
  const runId = `run_${Date.now()}`;
  const logLines: string[] = [];

  const strainNames = await loadStrainNames(strainListPath);
  logLines.push(`[${new Date().toISOString()}] Pipeline started ${runId}`);
  logLines.push(`[Pipeline] Mode: ${USE_FIXTURE ? "fixture" : "live"}`);
  logLines.push(`[Pipeline] Processing ${strainNames.length} strains: ${strainNames.join(", ")}`);
  console.log(`[Pipeline] Mode: ${USE_FIXTURE ? "fixture" : "live"}`);
  console.log(`[Pipeline] Processing ${strainNames.length} strains`);
  console.log(`[Pipeline] Max ${CONFIG.MAX_IMAGES_PER_RUN} images per run, ${CONFIG.MAX_IMAGES_PER_STRAIN} per strain`);
  console.log("");

  const imageUrlsByStrain: Record<string, string[]> = {};
  let pagesFetched = 0;
  let totalUrlsExtracted = 0;

  for (const strainSlug of strainNames) {
    const fetchResult = await fetchPage(strainSlug, undefined, { useFixture: USE_FIXTURE });
    if (!fetchResult?.ok) {
      logLines.push(`[Fetch] ${strainSlug}: no content (fixture missing or fetch failed)`);
      continue;
    }
    pagesFetched++;
    const urls = await extractImageUrls(
      fetchResult.rawContent,
      fetchResult.contentType,
      strainSlug
    );
    const urlList = urls.map((r) => r.url).filter(Boolean);
    if (urlList.length > 0) {
      imageUrlsByStrain[strainSlug] = urlList;
      totalUrlsExtracted += urlList.length;
    }
    logLines.push(`[Fetch] ${strainSlug}: ${urlList.length} image URLs extracted`);
  }

  console.log(`[Fetch] Pages fetched: ${pagesFetched}, Image URLs extracted: ${totalUrlsExtracted}`);
  logLines.push(`[Fetch] Total pages: ${pagesFetched}, URLs: ${totalUrlsExtracted}`);
  console.log("");

  const downloadStats: DownloadStats = await runDownload({
    strainNames,
    imageUrlsByStrain,
    maxPerRun: CONFIG.MAX_IMAGES_PER_RUN,
    maxPerStrain: CONFIG.MAX_IMAGES_PER_STRAIN,
  });
  logLines.push(`[Download] strains=${downloadStats.strainsProcessed} downloaded=${downloadStats.imagesDownloaded} rejected=${downloadStats.imagesRejected}`);
  console.log(`[Download] strains=${downloadStats.strainsProcessed} downloaded=${downloadStats.imagesDownloaded} rejected=${downloadStats.imagesRejected}`);

  const classified = await runClassifier(strainNames);
  logLines.push(`[Classify] ${classified} images classified`);
  console.log(`[Classify] ${classified} images classified`);

  const qualityStats: QualityStats = await runQualityCheck(strainNames);
  logLines.push(`[Quality] checked=${qualityStats.checked} passed=${qualityStats.passed} rejected=${qualityStats.rejected}`);
  console.log(`[Quality] checked=${qualityStats.checked} passed=${qualityStats.passed} rejected=${qualityStats.rejected}`);

  const dedupeStats: DedupeStats = await runDedupe(strainNames);
  logLines.push(`[Dedupe] total=${dedupeStats.total} duplicates_removed=${dedupeStats.duplicatesRemoved}`);
  console.log(`[Dedupe] total=${dedupeStats.total} duplicates_removed=${dedupeStats.duplicatesRemoved}`);

  const promoted = await runPromote(strainNames);
  downloadStats.imagesPromoted = promoted;
  logLines.push(`[Promote] ${promoted} images promoted to staging`);
  console.log(`[Promote] ${promoted} images promoted to staging`);

  const promotedCount = await countPromotedImages(strainNames);
  const candidates = await writeToReviewQueue(strainNames);
  logLines.push(`[ReviewQueue] ${candidates} candidates written`);
  console.log(`[ReviewQueue] ${candidates} candidates written`);

  const finishedAt = new Date().toISOString();
  logLines.push(`[${finishedAt}] Pipeline finished`);

  const manifest: RunManifest = {
    runId,
    startedAt: logLines[0]?.match(/\[([^\]]+)\]/)?.[1] ?? new Date().toISOString(),
    finishedAt,
    mode: USE_FIXTURE ? "fixture" : "live",
    strainsProcessed: downloadStats.strainsProcessed,
    pagesFetched,
    imageUrlsExtracted: totalUrlsExtracted,
    imagesDownloaded: downloadStats.imagesDownloaded,
    imagesRejected: downloadStats.imagesRejected + qualityStats.rejected,
    promotedToReview: promotedCount,
  };

  await writeRunLog(runId, logLines);
  const manifestPath = await writeRunManifest(manifest);

  console.log("");
  console.log("--- Summary ---");
  console.log(`Strains processed:     ${manifest.strainsProcessed}`);
  console.log(`Pages fetched:         ${manifest.pagesFetched}`);
  console.log(`Image URLs extracted:  ${manifest.imageUrlsExtracted}`);
  console.log(`Images downloaded:     ${manifest.imagesDownloaded}`);
  console.log(`Images rejected:       ${manifest.imagesRejected}`);
  console.log(`Promoted to review:    ${manifest.promotedToReview}`);
  console.log(`Logs: ${join(PATHS.logs, `run_${runId}.log`)}`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
