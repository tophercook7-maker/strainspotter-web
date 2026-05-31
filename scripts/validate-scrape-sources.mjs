import {
  SOURCE_REGISTRY_PATH,
  isHttpUrl,
  readRegistry,
  robotsAllows,
  writeJson,
} from "./scrape-utils.mjs";
import { existsSync } from "node:fs";

const REPORT_PATH = "data/scrape/source-validation-report.json";
const REQUIRED_FIELDS = [
  "id",
  "name",
  "baseUrl",
  "sourceType",
  "allowedUse",
  "licenseNotes",
  "robotsPolicy",
  "rateLimitMs",
  "maxPagesPerRun",
  "selectors",
  "seedUrls",
];

function sourceStrategy(source) {
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
  if (source.type === "search-url-template" || source.searchUrlTemplate || source.search?.url) {
    return "search-url-template";
  }
  return "configured-pages";
}

function searchTemplate(source) {
  return source.endpoint || source.searchUrlTemplate || source.search?.url || "";
}

function isApiBackedSource(source) {
  const endpoint = searchTemplate(source);
  return (
    source.sourceType === "image-search-api" ||
    source.type === "image-search-api" ||
    source.provider === "brave" ||
    endpoint.startsWith("https://api.search.brave.com/")
  );
}

function riskyLicenseNotes(source) {
  const notes = String(source.licenseNotes ?? "").toLowerCase();
  return (
    !notes ||
    notes.includes("only enable if") ||
    notes.includes("only use if") ||
    notes.includes("permission/license/terms")
  );
}

function readinessForSource(source) {
  const strategy = sourceStrategy(source);
  const issues = [];
  const hasSeedUrls = Array.isArray(source.seedUrls) && source.seedUrls.length > 0;
  const hasDirectImages = Array.isArray(source.imageUrls) && source.imageUrls.length > 0;
  const hasLocalRoots = Array.isArray(source.localRoots) && source.localRoots.some((root) => existsSync(String(root)));
  const hasImageSelector = Boolean(source.selectors?.imageUrls || source.selectors?.image);
  const hasSearchTemplate = Boolean(searchTemplate(source));
  const hasApiKey = !source.apiKeyEnv || Boolean(process.env[source.apiKeyEnv]);
  const hasCx = !source.cxEnv || Boolean(process.env[source.cxEnv]);
  const hasLicenseNotes = Boolean(String(source.licenseNotes ?? "").trim());
  const hasRateLimit =
    strategy === "local-folder"
      ? Number.isFinite(Number(source.rateLimitMs ?? 0)) && Number(source.rateLimitMs ?? 0) >= 0
      : Number.isFinite(Number(source.rateLimitMs)) && Number(source.rateLimitMs) >= 1000;

  if (!source.id) issues.push("Missing source id");
  if (!source.name) issues.push("Missing source name");
  if (strategy !== "local-folder" && !isHttpUrl(source.baseUrl)) issues.push("baseUrl must be http(s)");
  if (String(source.baseUrl ?? "").includes("example.com")) issues.push("Replace example.com with a real allowed source");
  if (strategy !== "local-folder" && !isApiBackedSource(source) && source.robotsPolicy !== "respect") {
    issues.push("robotsPolicy must be respect");
  }
  if (!hasLicenseNotes) issues.push("Missing license notes");
  if (!hasRateLimit) issues.push(strategy === "local-folder" ? "Missing rate limit" : "Missing safe wait time");
  if (!hasImageSelector && !["direct-image-list", "local-folder", "image-search-json"].includes(strategy)) {
    issues.push("Missing image selector");
  }
  if (strategy === "local-folder" && !hasLocalRoots) issues.push("TheVault folder not found.");
  if (strategy === "configured-pages" && !hasSeedUrls) issues.push("Missing seed URLs");
  if (strategy === "rss-feed" && !hasSeedUrls) issues.push("Missing feed URLs");
  if (strategy === "search-url-template" && !hasSearchTemplate) issues.push("Missing search URL template");
  if (strategy === "image-search-json" && !hasSearchTemplate) issues.push("Missing search endpoint URL");
  if (strategy === "image-search-json" && !hasApiKey) issues.push(`Needs API key: ${source.apiKeyEnv}`);
  if (strategy === "image-search-json" && !hasCx) issues.push(`Needs search engine id: ${source.cxEnv}`);
  if (strategy === "direct-image-list" && !hasDirectImages) issues.push("Missing direct image URLs");
  if (riskyLicenseNotes(source) && source.enabled === true) {
    issues.push("License notes require review before enabling");
  }

  return {
    strategy,
    enabled: source.enabled === true,
    hasSeedUrls,
    hasDirectImages,
    hasLocalRoots,
    hasImageSelector,
    hasSearchTemplate,
    hasApiKey,
    hasCx,
    hasLicenseNotes,
    hasRateLimit,
    ready: source.enabled === true && issues.length === 0,
    issues,
  };
}

function missingSelectors(source) {
  const selectors = source.selectors ?? {};
  const strategy = sourceStrategy(source);
  const required =
    ["direct-image-list", "local-folder", "image-search-json"].includes(strategy)
      ? []
      : String(source.sourceType ?? "").includes("images")
        ? ["imageUrls"]
        : ["strainLinks", "name"];
  return required.filter((key) => !selectors[key]);
}

async function main() {
  const registry = await readRegistry();
  const enabled = [];
  const disabled = [];
  const issues = [];

  for (const source of registry.sources) {
    const sourceIssues = [];
    const readiness = readinessForSource(source);
    let robotsAllowed = null;
    for (const field of REQUIRED_FIELDS) {
      if (
        source[field] == null &&
        !(readiness.strategy === "local-folder" && ["baseUrl", "robotsPolicy", "selectors", "seedUrls"].includes(field)) &&
        !(readiness.strategy === "image-search-json" && ["selectors", "seedUrls", "robotsPolicy"].includes(field)) &&
        !(readiness.strategy !== "configured-pages" && field === "seedUrls") &&
        !(readiness.strategy === "direct-image-list" && field === "selectors")
      ) {
        sourceIssues.push(`Missing required field: ${field}`);
      }
    }

    if (readiness.strategy !== "local-folder" && !isHttpUrl(source.baseUrl)) sourceIssues.push("baseUrl must be http(s)");
    if (readiness.strategy !== "local-folder" && !isApiBackedSource(source) && source.robotsPolicy !== "respect") {
      sourceIssues.push("robotsPolicy must be respect");
    }
    if (
      !Number.isFinite(Number(source.rateLimitMs)) ||
      Number(source.rateLimitMs) < (readiness.strategy === "local-folder" ? 0 : 1000)
    ) {
      sourceIssues.push("rateLimitMs missing or below 1000ms");
    }
    if (!Number.isFinite(Number(source.maxPagesPerRun)) || Number(source.maxPagesPerRun) <= 0) {
      sourceIssues.push("maxPagesPerRun missing or invalid");
    }
    if (readiness.strategy === "configured-pages" && (!Array.isArray(source.seedUrls) || source.seedUrls.length === 0)) {
      sourceIssues.push("Missing seedUrls");
    }
    if (readiness.strategy === "rss-feed" && (!Array.isArray(source.seedUrls) || source.seedUrls.length === 0)) {
      sourceIssues.push("Missing feed URLs");
    }
    const selectorIssues = missingSelectors(source);
    for (const selector of selectorIssues) {
      sourceIssues.push(`Missing selector: ${selector}`);
    }
    if (source.enabled === true && riskyLicenseNotes(source)) {
      sourceIssues.push("Risky or non-confirming license notes");
    }
    for (const issue of readiness.issues) {
      if (!sourceIssues.includes(issue)) sourceIssues.push(issue);
    }

    if (source.enabled === true && readiness.strategy !== "local-folder" && !isApiBackedSource(source) && isHttpUrl(source.baseUrl)) {
      try {
        robotsAllowed = await robotsAllows(source.baseUrl, source);
        if (!robotsAllowed) sourceIssues.push("robots.txt does not allow baseUrl");
      } catch (error) {
        robotsAllowed = false;
        sourceIssues.push(`robots.txt check failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const row = {
      id: source.id,
      name: source.name,
      enabled: source.enabled === true,
      strategy: readiness.strategy,
      hasSeedUrls: readiness.hasSeedUrls,
      hasDirectImages: readiness.hasDirectImages,
      hasLocalRoots: readiness.hasLocalRoots,
      hasImageSelector: readiness.hasImageSelector,
      hasSearchTemplate: readiness.hasSearchTemplate,
      hasApiKey: readiness.hasApiKey,
      hasCx: readiness.hasCx,
      hasLicenseNotes: readiness.hasLicenseNotes,
      hasRateLimit: readiness.hasRateLimit,
      isApiBacked: isApiBackedSource(source),
      robotsAllowed,
      ready: readiness.ready && sourceIssues.length === 0,
      issues: sourceIssues,
    };
    if (source.enabled === true) enabled.push(row);
    else disabled.push(row);
    if (sourceIssues.length) issues.push(row);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    registryPath: SOURCE_REGISTRY_PATH,
    enabledSources: enabled,
    disabledSources: disabled,
    readyPhotoSources: enabled.filter((source) => source.ready).length,
    issueCount: issues.length,
    issues,
  };

  await writeJson(REPORT_PATH, report);

  console.log("Scrape source validation");
  console.log("========================");
  console.log(`Enabled sources: ${enabled.length}`);
  console.log(`Disabled sources: ${disabled.length}`);
  console.log(`Ready photo sources: ${report.readyPhotoSources} of ${registry.sources.length}`);
  console.log(`Sources with issues: ${issues.length}`);
  console.log(`Report written: ${REPORT_PATH}`);

  for (const issue of issues.slice(0, 10)) {
    console.log(`- ${issue.id ?? "(missing id)"}: ${issue.issues.join("; ")}`);
  }

  for (const source of [...enabled, ...disabled]) {
    console.log(
      `Source ${source.id}: enabled=${source.enabled ? "yes" : "no"}, strategy=${source.strategy}, apiBacked=${source.isApiBacked ? "yes" : "no"}, seedUrls=${source.hasSeedUrls ? "yes" : "no"}, localRoots=${source.hasLocalRoots ? "yes" : "no"}, directImages=${source.hasDirectImages ? "yes" : "no"}, imageSelector=${source.hasImageSelector ? "yes" : "no"}, searchTemplate=${source.hasSearchTemplate ? "yes" : "no"}, apiKey=${source.hasApiKey ? "yes" : "no"}, license=${source.hasLicenseNotes ? "yes" : "no"}, rateLimit=${source.hasRateLimit ? "yes" : "no"}, robots=${source.isApiBacked ? "skipped official API" : source.robotsAllowed == null ? "not checked" : source.robotsAllowed ? "allowed" : "blocked"}, ready=${source.ready ? "yes" : "no"}`
    );
  }
}

main().catch((error) => {
  console.error("Source validation failed:", error);
  process.exit(1);
});
