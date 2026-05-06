/**
 * Routes REFERENCE_IMAGE_SEARCH_PROVIDER to the correct image search implementation.
 */

const { searchGoogleReferenceImages } = require("./googleImageSearchProvider.js");
const { searchBraveReferenceImages } = require("./braveImageSearchProvider.js");
const { searchSerpapiReferenceImages } = require("./serpapiImageSearchProvider.js");

const {
  canUseGoogleSearch,
  estimateGoogleSearchCost,
  getGoogleSearchUsage,
  recordGoogleSearchUsage,
  requiresGoogleCostConfirm,
  readDailyLimit: readGoogleDailyLimit,
  readMaxPerRun: readGoogleMaxPerRun,
  hasGoogleCredentials,
  isGoogleSearchProviderEnabled,
} = require("./googleSearchBudget.js");
const {
  canUseBraveSearch,
  estimateBraveSearchCost,
  getBraveSearchUsage,
  recordBraveSearchUsage,
  requiresBraveCostConfirm,
  readDailyLimit: readBraveDailyLimit,
  readMaxPerRun: readBraveMaxPerRun,
} = require("./braveSearchBudget.js");
const {
  canUseSerpapiSearch,
  estimateSerpapiSearchCost,
  getSerpapiSearchUsage,
  recordSerpapiSearchUsage,
  requiresSerpapiCostConfirm,
  readDailyLimit: readSerpapiDailyLimit,
  readMaxPerRun: readSerpapiMaxPerRun,
} = require("./serpapiSearchBudget.js");

const VALID = new Set(["off", "google", "brave", "serpapi"]);

function normalizeProvider(raw) {
  const p = String(raw || "off").toLowerCase();
  return VALID.has(p) ? p : "off";
}

function getReferenceImageSearchProvider() {
  return normalizeProvider(process.env.REFERENCE_IMAGE_SEARCH_PROVIDER);
}

function isExternalReferenceSearchActive() {
  return getReferenceImageSearchProvider() !== "off";
}

const { hasBraveCredentials, isBraveSearchProviderEnabled } = require("./braveSearchBudget.js");
const { hasSerpapiCredentials, isSerpapiSearchProviderEnabled } = require("./serpapiSearchBudget.js");

function externalSearchFallbackConfigured() {
  const p = getReferenceImageSearchProvider();
  if (p === "google") return isGoogleSearchProviderEnabled() && hasGoogleCredentials();
  if (p === "brave") return isBraveSearchProviderEnabled() && hasBraveCredentials();
  if (p === "serpapi") return isSerpapiSearchProviderEnabled() && hasSerpapiCredentials();
  return false;
}

/**
 * @param {string} strainName
 * @param {number} [limit]
 * @param {{ maxHttpQueries?: number }} [options]
 * @returns {Promise<{ results: Array<{ imageUrl: string; sourcePageUrl: string; title: string; snippet: string; sourceName: string }>; queriesExecuted: number; diagnostics: Record<string, unknown> }>}
 */
async function searchReferenceImages(strainName, limit = 10, options = {}) {
  const p = getReferenceImageSearchProvider();
  if (p === "google") {
    return searchGoogleReferenceImages(strainName, limit, options);
  }
  if (p === "brave") {
    return searchBraveReferenceImages(strainName, limit, options);
  }
  if (p === "serpapi") {
    return searchSerpapiReferenceImages(strainName, limit, options);
  }
  return {
    results: [],
    queriesExecuted: 0,
    diagnostics: {
      queriesTried: [],
      rawUrlsReturnedBeforeFiltering: 0,
      placeholdersSkipped: 0,
      errors: [],
      warnings: [],
      queryAttempts: [],
      providerEnabled: false,
      reason: "provider_off",
    },
  };
}

/**
 * @param {number} requestedQueries
 * @param {number} usedThisRun
 * @param {string} projectRoot
 */
function gateExternalReferenceSearch(requestedQueries, usedThisRun, projectRoot) {
  const p = getReferenceImageSearchProvider();
  if (p === "google") return canUseGoogleSearch(requestedQueries, usedThisRun, projectRoot);
  if (p === "brave") return canUseBraveSearch(requestedQueries, usedThisRun, projectRoot);
  if (p === "serpapi") return canUseSerpapiSearch(requestedQueries, usedThisRun, projectRoot);
  const req = Math.max(0, Number(requestedQueries) || 0);
  return {
    ok: true,
    allowedQueries: 0,
    requestedQueries: req,
    dailyUsed: 0,
    dailyLimit: 0,
    dailyRemaining: 0,
    runRemaining: 0,
    estimatedIncrementalCostUsd: 0,
    provider: "off",
    confirmRequired: false,
  };
}

/**
 * @param {string} projectRoot
 * @returns {{ dailyUsed: number; dailyLimit: number }}
 */
function getExternalSearchUsageSnapshot(projectRoot) {
  const p = getReferenceImageSearchProvider();
  if (p === "google") {
    return { dailyUsed: getGoogleSearchUsage(projectRoot).queriesUsed, dailyLimit: readGoogleDailyLimit() };
  }
  if (p === "brave") {
    return { dailyUsed: getBraveSearchUsage(projectRoot).queriesUsed, dailyLimit: readBraveDailyLimit() };
  }
  if (p === "serpapi") {
    return { dailyUsed: getSerpapiSearchUsage(projectRoot).queriesUsed, dailyLimit: readSerpapiDailyLimit() };
  }
  return { dailyUsed: 0, dailyLimit: 0 };
}

function readExternalMaxPerRun() {
  const p = getReferenceImageSearchProvider();
  if (p === "google") return readGoogleMaxPerRun();
  if (p === "brave") return readBraveMaxPerRun();
  if (p === "serpapi") return readSerpapiMaxPerRun();
  return 0;
}

/**
 * @param {number} queryCount
 * @param {number} dailyUsedBeforeRun
 */
function estimateExternalSearchRunCost(queryCount, dailyUsedBeforeRun) {
  const p = getReferenceImageSearchProvider();
  const n = Math.max(0, Number(queryCount) || 0);
  const d = Math.max(0, Number(dailyUsedBeforeRun) || 0);
  if (p === "google") return estimateGoogleSearchCost(n, d);
  if (p === "brave") return estimateBraveSearchCost(n, d);
  if (p === "serpapi") return estimateSerpapiSearchCost(n, d);
  return 0;
}

/**
 * @param {string} projectRoot
 * @param {number} queryCount
 * @param {string} runId
 */
function recordExternalSearchUsage(projectRoot, queryCount, runId) {
  const p = getReferenceImageSearchProvider();
  const n = Math.max(0, Number(queryCount) || 0);
  if (n === 0) return;
  if (p === "google") recordGoogleSearchUsage(projectRoot, n, runId);
  else if (p === "brave") recordBraveSearchUsage(projectRoot, n, runId);
  else if (p === "serpapi") recordSerpapiSearchUsage(projectRoot, n, runId);
}

function externalSearchRequiresCostConfirm() {
  const p = getReferenceImageSearchProvider();
  if (p === "google") return requiresGoogleCostConfirm();
  if (p === "brave") return requiresBraveCostConfirm();
  if (p === "serpapi") return requiresSerpapiCostConfirm();
  return false;
}

/**
 * @param {Record<string, unknown>} args from parseArgs
 * @param {boolean} dryRun
 */
function externalSearchCostAllowed(args, dryRun) {
  if (dryRun) return true;
  const p = getReferenceImageSearchProvider();
  const confirmSearch =
    args["confirm-search-cost"] === true || String(args["confirm-search-cost"] ?? "") === "true";
  if (confirmSearch) return true;
  if (p === "google") {
    return args["confirm-google-cost"] === true || String(args["confirm-google-cost"] ?? "") === "true";
  }
  if (p === "brave") {
    return args["confirm-brave-cost"] === true || String(args["confirm-brave-cost"] ?? "") === "true";
  }
  if (p === "serpapi") {
    return args["confirm-serpapi-cost"] === true || String(args["confirm-serpapi-cost"] ?? "") === "true";
  }
  return true;
}

module.exports = {
  getReferenceImageSearchProvider,
  isExternalReferenceSearchActive,
  externalSearchFallbackConfigured,
  searchReferenceImages,
  gateExternalReferenceSearch,
  getExternalSearchUsageSnapshot,
  readExternalMaxPerRun,
  estimateExternalSearchRunCost,
  recordExternalSearchUsage,
  externalSearchRequiresCostConfirm,
  externalSearchCostAllowed,
  VALID_PROVIDERS: [...VALID],
};
