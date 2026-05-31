import {
  SCRAPE_RUNS_PATH,
  SOURCE_ERRORS_PATH,
  METADATA_CANDIDATES_PATH,
  appendJsonArray,
  extractLinks,
  extractListBySelector,
  extractTextBySelector,
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

async function fetchHtml(url, source) {
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

function dedupeCandidates(candidates) {
  const byKey = new Map();
  for (const candidate of candidates) {
    byKey.set(`${candidate.slug}::${candidate.sourceUrl}`, candidate);
  }
  return [...byKey.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

async function main() {
  await beginScrapeStatus("metadata");
  const scrapeTargets = await readScrapeTargets();
  const registry = await readRegistry();
  const sources = registry.sources.filter((source) => source.enabled === true);
  const existing = await readJson(METADATA_CANDIDATES_PATH, []);
  const candidates = Array.isArray(existing) ? existing : [];
  const errors = [];
  const run = {
    type: "metadata",
    startedAt: new Date().toISOString(),
    enabledSources: sources.length,
    pagesFetched: 0,
    candidatesAdded: 0,
    errors: 0,
  };
  const maxPagesPerRun = Number(scrapeTargets.maxPagesPerRun ?? 100);

  for (const source of sources) {
    if (await shouldStopScrape()) break;
    if (!String(source.sourceType ?? "").includes("metadata")) continue;
    await writeScrapeStatus({
      currentSource: source.id,
      currentStrain: null,
      processedPages: run.pagesFetched,
    });
    if (!source.selectors?.strainLinks && !source.selectors?.name) {
      errors.push({
        sourceId: source.id,
        at: new Date().toISOString(),
        message: "Missing selectors for metadata scrape",
      });
      continue;
    }

    const pageUrls = new Set();
    for (const seedUrl of source.seedUrls ?? []) {
      if ((await shouldStopScrape()) || run.pagesFetched >= Math.min(Number(source.maxPagesPerRun ?? 100), maxPagesPerRun)) break;
      try {
        const seedHtml = await fetchHtml(seedUrl, source);
        run.pagesFetched += 1;
        await writeScrapeStatus({
          currentSource: source.id,
          processedPages: run.pagesFetched,
        });
        pageUrls.add(seedUrl);
        for (const link of extractLinks(seedHtml, seedUrl, source.selectors?.strainLinks)) {
          if (isSameOrigin(link, source.baseUrl)) pageUrls.add(link);
        }
      } catch (error) {
        errors.push({
          sourceId: source.id,
          sourceUrl: seedUrl,
          at: new Date().toISOString(),
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    for (const sourceUrl of pageUrls) {
      if ((await shouldStopScrape()) || run.pagesFetched >= Math.min(Number(source.maxPagesPerRun ?? 100), maxPagesPerRun)) break;
      try {
        const html = await fetchHtml(sourceUrl, source);
        run.pagesFetched += 1;
        const name = extractTextBySelector(html, source.selectors?.name);
        if (!name) continue;
        const slug = slugify(name);
        await writeScrapeStatus({
          currentSource: source.id,
          currentStrain: slug,
          processedPages: run.pagesFetched,
        });
        if (!targetAllowsStrain(scrapeTargets, slug)) continue;
        candidates.push({
          name,
          slug,
          type: extractTextBySelector(html, source.selectors?.type),
          description: extractTextBySelector(html, source.selectors?.description),
          effects: extractListBySelector(html, source.selectors?.effects),
          flavors: extractListBySelector(html, source.selectors?.flavors),
          lineage: extractTextBySelector(html, source.selectors?.lineage),
          sourceUrl,
          sourceId: source.id,
          licenseNotes: source.licenseNotes,
          scrapedAt: new Date().toISOString(),
          reviewStatus: "pending",
          recommendedAction: "review",
        });
        run.candidatesAdded += 1;
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
  await writeJson(METADATA_CANDIDATES_PATH, dedupeCandidates(candidates));
  await appendJsonArray(SCRAPE_RUNS_PATH, [run]);
  await appendJsonArray(SOURCE_ERRORS_PATH, errors);

  console.log("Metadata scrape complete");
  console.log(`Enabled sources: ${sources.length}`);
  console.log(`Pages fetched: ${run.pagesFetched}`);
  console.log(`Candidates added this run: ${run.candidatesAdded}`);
  console.log(`Errors: ${run.errors}`);
  await finishScrapeStatus({
    lastAction: "metadata",
    processedPages: run.pagesFetched,
    downloadedImages: 0,
    errors: errors.slice(-10),
  });
}

main().catch(async (error) => {
  await finishScrapeStatus({
    lastAction: "metadata",
    errors: [{ at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error) }],
  });
  console.error("Metadata scrape failed:", error);
  process.exit(1);
});
