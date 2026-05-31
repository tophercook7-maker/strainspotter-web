import { writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import {
  SCRAPE_RUNS_PATH,
  SOURCE_ERRORS_PATH,
  INBOX_DIR,
  METADATA_CANDIDATES_PATH,
  IMAGE_CANDIDATES_PATH,
  appendJsonArray,
  extractImages,
  isSameOrigin,
  readJson,
  readRegistry,
  readScrapeTargets,
  robotsAllows,
  sleep,
  slugify,
  beginScrapeStatus,
  finishScrapeStatus,
  shouldStopScrape,
  targetAllowsStrain,
  writeScrapeStatus,
  writeJson,
} from "./scrape-utils.mjs";

function extensionFromUrl(imageUrl) {
  const extension = extname(new URL(imageUrl).pathname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) return extension;
  return ".jpg";
}

function dedupeCandidates(candidates) {
  const byKey = new Map();
  for (const candidate of candidates) {
    byKey.set(`${candidate.strainSlug}::${candidate.imageUrl}`, candidate);
  }
  return [...byKey.values()].sort((a, b) => a.strainSlug.localeCompare(b.strainSlug));
}

async function fetchText(url, source) {
  if (!(await robotsAllows(url, source))) {
    throw new Error(`Blocked by robots.txt: ${url}`);
  }
  await sleep(Math.max(Number(source.rateLimitMs ?? 3000), 1000));
  const response = await fetch(url, {
    headers: { "User-Agent": "StrainSpotterDataEngine/2.0" },
  });
  if (!response.ok) throw new Error(`Fetch failed ${response.status}: ${url}`);
  return await response.text();
}

async function downloadImage(imageUrl, source) {
  if (!(await robotsAllows(imageUrl, source))) {
    throw new Error(`Blocked by robots.txt: ${imageUrl}`);
  }
  await sleep(Math.max(Number(source.rateLimitMs ?? 3000), 1000));
  const response = await fetch(imageUrl, {
    headers: { "User-Agent": "StrainSpotterDataEngine/2.0" },
  });
  if (!response.ok) throw new Error(`Image fetch failed ${response.status}: ${imageUrl}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  await beginScrapeStatus("images");
  const scrapeTargets = await readScrapeTargets();
  const registry = await readRegistry();
  const sources = registry.sources.filter(
    (source) => source.enabled === true && String(source.sourceType ?? "").includes("images")
  );
  const metadata = await readJson(METADATA_CANDIDATES_PATH, []);
  const existing = await readJson(IMAGE_CANDIDATES_PATH, []);
  const candidates = Array.isArray(existing) ? existing : [];
  const errors = [];
  const run = {
    type: "images",
    startedAt: new Date().toISOString(),
    enabledSources: sources.length,
    pagesFetched: 0,
    imagesDownloaded: 0,
    candidatesAdded: 0,
    errors: 0,
  };
  const maxPagesPerRun = Number(scrapeTargets.maxPagesPerRun ?? 100);
  const maxImagesPerStrain = Number(scrapeTargets.maxImagesPerStrain ?? 25);
  const imagesByStrain = new Map();
  for (const item of candidates) {
    const slug = slugify(item.strainSlug);
    if (!slug) continue;
    imagesByStrain.set(slug, (imagesByStrain.get(slug) ?? 0) + 1);
  }

  for (const source of sources) {
    if (await shouldStopScrape()) break;
    if (!source.selectors?.imageUrls) {
      errors.push({
        sourceId: source.id,
        at: new Date().toISOString(),
        message: "Missing imageUrls selector",
      });
      continue;
    }
    await writeScrapeStatus({
      currentSource: source.id,
      currentStrain: null,
      processedPages: run.pagesFetched,
      downloadedImages: run.imagesDownloaded,
    });

    const pages = new Map();
    for (const item of Array.isArray(metadata) ? metadata : []) {
      if (
        item.sourceId === source.id &&
        item.sourceUrl &&
        targetAllowsStrain(scrapeTargets, item.slug || slugify(item.name))
      ) {
        pages.set(item.sourceUrl, item.slug || slugify(item.name));
      }
    }
    for (const seedUrl of source.seedUrls ?? []) {
      pages.set(seedUrl, slugify(source.name));
    }

    let sourceImageNumber = candidates.filter((item) => item.sourceId === source.id).length + 1;
    for (const [sourceUrl, strainSlug] of pages) {
      const normalizedStrainSlug = slugify(strainSlug);
      if ((await shouldStopScrape()) || run.pagesFetched >= Math.min(Number(source.maxPagesPerRun ?? 100), maxPagesPerRun)) break;
      if (!targetAllowsStrain(scrapeTargets, normalizedStrainSlug)) continue;
      if ((imagesByStrain.get(normalizedStrainSlug) ?? 0) >= maxImagesPerStrain) continue;
      try {
        const html = await fetchText(sourceUrl, source);
        run.pagesFetched += 1;
        await writeScrapeStatus({
          currentSource: source.id,
          currentStrain: normalizedStrainSlug,
          processedPages: run.pagesFetched,
          downloadedImages: run.imagesDownloaded,
        });
        for (const imageUrl of extractImages(html, sourceUrl, source.selectors.imageUrls)) {
          if (await shouldStopScrape()) break;
          if (!isSameOrigin(imageUrl, source.baseUrl)) continue;
          if ((imagesByStrain.get(normalizedStrainSlug) ?? 0) >= maxImagesPerStrain) break;

          const fileName = `${normalizedStrainSlug || "unknown"}__${source.id}__${String(
            sourceImageNumber
          ).padStart(4, "0")}${extensionFromUrl(imageUrl)}`;
          const filePath = join(INBOX_DIR, fileName);
          const buffer = await downloadImage(imageUrl, source);
          await writeFile(filePath, buffer, { flag: "wx" }).catch((error) => {
            if (error?.code === "EEXIST") return;
            throw error;
          });

          candidates.push({
            fileName,
            strainSlug: normalizedStrainSlug || "unknown",
            sourceId: source.id,
            sourceUrl,
            imageUrl,
            downloadedAt: new Date().toISOString(),
            licenseNotes: source.licenseNotes,
            reviewStatus: "pending",
            recommendedAction: "review",
          });
          sourceImageNumber += 1;
          imagesByStrain.set(normalizedStrainSlug, (imagesByStrain.get(normalizedStrainSlug) ?? 0) + 1);
          run.imagesDownloaded += 1;
          run.candidatesAdded += 1;
          await writeScrapeStatus({
            currentSource: source.id,
            currentStrain: normalizedStrainSlug,
            processedPages: run.pagesFetched,
            downloadedImages: run.imagesDownloaded,
          });
        }
      } catch (error) {
        const row = {
          sourceId: source.id,
          sourceUrl,
          at: new Date().toISOString(),
          message: error instanceof Error ? error.message : String(error),
        };
        errors.push(row);
        await writeScrapeStatus({ errors: errors.slice(-10) });
      }
    }
  }

  run.errors = errors.length;
  run.finishedAt = new Date().toISOString();
  await writeJson(IMAGE_CANDIDATES_PATH, dedupeCandidates(candidates));
  await appendJsonArray(SCRAPE_RUNS_PATH, [run]);
  await appendJsonArray(SOURCE_ERRORS_PATH, errors);

  console.log("Image scrape complete");
  console.log(`Enabled image sources: ${sources.length}`);
  console.log(`Pages fetched: ${run.pagesFetched}`);
  console.log(`Images downloaded: ${run.imagesDownloaded}`);
  console.log(`Candidates added this run: ${run.candidatesAdded}`);
  console.log(`Errors: ${run.errors}`);
  await finishScrapeStatus({
    lastAction: "images",
    processedPages: run.pagesFetched,
    downloadedImages: run.imagesDownloaded,
    errors: errors.slice(-10),
  });
}

main().catch(async (error) => {
  await finishScrapeStatus({
    lastAction: "images",
    errors: [{ at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error) }],
  });
  console.error("Image scrape failed:", error);
  process.exit(1);
});
