/**
 * Google Custom Search JSON API — local budget / cost guard for CLI tooling.
 * @see SCANNER_GOOGLE_IMAGE_SEARCH_COSTS.md
 */

const fs = require("node:fs");
const path = require("node:path");

const FREE_QUERIES_PER_DAY_GOOGLE = 100;
const COST_PER_1000_USD = 5;

function getGoogleSearchUsagePath(projectRoot) {
  return path.join(projectRoot, "data", "scanner-training", "google-search-usage.json");
}

function todayLocalISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyUsage(date) {
  return {
    date,
    queriesUsed: 0,
    lastRunAt: "",
    runs: [],
  };
}

/**
 * @param {string} projectRoot
 * @returns {{ date: string; queriesUsed: number; lastRunAt: string; runs: Array<{ runId: string; at: string; queries: number }> }}
 */
function getGoogleSearchUsage(projectRoot) {
  const today = todayLocalISODate();
  const p = getGoogleSearchUsagePath(projectRoot);
  if (!fs.existsSync(p)) {
    return emptyUsage(today);
  }
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    if (raw && typeof raw === "object" && raw.date === today) {
      return {
        date: String(raw.date),
        queriesUsed: Math.max(0, Number(raw.queriesUsed) || 0),
        lastRunAt: String(raw.lastRunAt || ""),
        runs: Array.isArray(raw.runs) ? raw.runs : [],
      };
    }
  } catch {
    /* fall through */
  }
  return emptyUsage(today);
}

function persistUsage(projectRoot, usage) {
  const p = getGoogleSearchUsagePath(projectRoot);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(usage, null, 2), "utf8");
}

function isGoogleSearchProviderEnabled() {
  return String(process.env.REFERENCE_IMAGE_SEARCH_PROVIDER || "off").toLowerCase() === "google";
}

function hasGoogleCredentials() {
  const key = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
  return Boolean(key && String(key).trim() && cx && String(cx).trim());
}

function requiresGoogleCostConfirm() {
  const v = String(process.env.GOOGLE_SEARCH_REQUIRE_CONFIRM ?? "true").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function readDailyLimit() {
  const n = Number(process.env.GOOGLE_SEARCH_DAILY_LIMIT ?? 100);
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(10_000, Math.floor(n)));
}

function readMaxPerRun() {
  const n = Number(process.env.GOOGLE_SEARCH_MAX_QUERIES_PER_RUN ?? 25);
  if (!Number.isFinite(n)) return 25;
  return Math.max(0, Math.min(10_000, Math.floor(n)));
}

/**
 * Estimated USD for `queryCount` additional API calls after `queriesAlreadyToday` were already made today.
 * Uses Google's 100 free queries/day then $5 / 1000.
 * @param {number} queryCount
 * @param {number} [queriesAlreadyToday]
 */
function estimateGoogleSearchCost(queryCount, queriesAlreadyToday = 0) {
  const n = Math.max(0, Number(queryCount) || 0);
  const already = Math.max(0, Number(queriesAlreadyToday) || 0);
  const freeLeft = Math.max(0, FREE_QUERIES_PER_DAY_GOOGLE - already);
  const billable = Math.max(0, n - freeLeft);
  return Number(((billable / 1000) * COST_PER_1000_USD).toFixed(4));
}

/**
 * @param {number} requestedQueries
 * @param {number} usedThisRun
 * @param {string} projectRoot
 */
function canUseGoogleSearch(requestedQueries, usedThisRun, projectRoot) {
  const req = Math.max(0, Number(requestedQueries) || 0);
  const runUsed = Math.max(0, Number(usedThisRun) || 0);

  if (!isGoogleSearchProviderEnabled()) {
    return {
      ok: req === 0,
      allowedQueries: 0,
      requestedQueries: req,
      dailyUsed: 0,
      dailyLimit: readDailyLimit(),
      dailyRemaining: 0,
      runRemaining: Math.max(0, readMaxPerRun() - runUsed),
      estimatedIncrementalCostUsd: 0,
      provider: process.env.REFERENCE_IMAGE_SEARCH_PROVIDER || "off",
      confirmRequired: requiresGoogleCostConfirm(),
      reason: req === 0 ? undefined : "provider_not_google",
    };
  }

  if (!hasGoogleCredentials()) {
    return {
      ok: false,
      allowedQueries: 0,
      requestedQueries: req,
      dailyUsed: 0,
      dailyLimit: readDailyLimit(),
      dailyRemaining: 0,
      runRemaining: Math.max(0, readMaxPerRun() - runUsed),
      estimatedIncrementalCostUsd: 0,
      provider: "google",
      confirmRequired: requiresGoogleCostConfirm(),
      reason: "missing_credentials",
    };
  }

  const usage = getGoogleSearchUsage(projectRoot);
  const dlim = readDailyLimit();
  const runLim = readMaxPerRun();
  const dailyUsed = usage.queriesUsed;
  const dailyRemaining = Math.max(0, dlim - dailyUsed);
  const runRemaining = Math.max(0, runLim - runUsed);
  const allowedQueries = Math.min(req, dailyRemaining, runRemaining);
  const ok = allowedQueries >= req;
  const estimatedIncrementalCostUsd = estimateGoogleSearchCost(allowedQueries, dailyUsed);

  return {
    ok,
    allowedQueries,
    requestedQueries: req,
    dailyUsed,
    dailyLimit: dlim,
    dailyRemaining,
    maxQueriesPerRun: runLim,
    runQueriesUsed: runUsed,
    runRemaining,
    estimatedIncrementalCostUsd,
    provider: "google",
    confirmRequired: requiresGoogleCostConfirm(),
    reason: ok ? undefined : "budget_cap",
  };
}

/**
 * @param {string} projectRoot
 * @param {number} queryCount
 * @param {string} runId
 */
function recordGoogleSearchUsage(projectRoot, queryCount, runId) {
  const n = Math.max(0, Number(queryCount) || 0);
  if (n === 0) return;

  const usage = getGoogleSearchUsage(projectRoot);
  usage.queriesUsed += n;
  usage.lastRunAt = new Date().toISOString();
  usage.runs.push({
    runId: String(runId || ""),
    at: usage.lastRunAt,
    queries: n,
  });
  persistUsage(projectRoot, usage);
}

module.exports = {
  FREE_QUERIES_PER_DAY_GOOGLE,
  COST_PER_1000_USD,
  getGoogleSearchUsagePath,
  getGoogleSearchUsage,
  canUseGoogleSearch,
  recordGoogleSearchUsage,
  estimateGoogleSearchCost,
  isGoogleSearchProviderEnabled,
  hasGoogleCredentials,
  requiresGoogleCostConfirm,
  readDailyLimit,
  readMaxPerRun,
};
