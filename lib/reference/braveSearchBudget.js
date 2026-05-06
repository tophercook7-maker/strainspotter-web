/**
 * Brave Search API — local budget / cost guard for CLI tooling.
 * Pricing varies by plan (free monthly credits, then paid). Estimates are conservative placeholders.
 */

const fs = require("node:fs");
const path = require("node:path");

/** Included queries per day for $0 cost estimate (adjust to match your Brave plan). */
const INCLUDED_QUERIES_PER_DAY_ESTIMATE = 100;
const COST_PER_1000_USD_ESTIMATE = 3;

function getBraveSearchUsagePath(projectRoot) {
  return path.join(projectRoot, "data", "scanner-training", "brave-search-usage.json");
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

function getBraveSearchUsage(projectRoot) {
  const today = todayLocalISODate();
  const p = getBraveSearchUsagePath(projectRoot);
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
  const p = getBraveSearchUsagePath(projectRoot);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(usage, null, 2), "utf8");
}

function isBraveSearchProviderEnabled() {
  return String(process.env.REFERENCE_IMAGE_SEARCH_PROVIDER || "off").toLowerCase() === "brave";
}

function hasBraveCredentials() {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  return Boolean(key && String(key).trim());
}

function requiresBraveCostConfirm() {
  const v = String(process.env.BRAVE_SEARCH_REQUIRE_CONFIRM ?? "true").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function readDailyLimit() {
  const n = Number(process.env.BRAVE_SEARCH_DAILY_LIMIT ?? 100);
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(10_000, Math.floor(n)));
}

function readMaxPerRun() {
  const n = Number(process.env.BRAVE_SEARCH_MAX_QUERIES_PER_RUN ?? 25);
  if (!Number.isFinite(n)) return 25;
  return Math.max(0, Math.min(10_000, Math.floor(n)));
}

/**
 * Estimated USD for incremental queries (after included tier).
 * @param {number} queryCount
 * @param {number} [queriesAlreadyToday]
 */
function estimateBraveSearchCost(queryCount, queriesAlreadyToday = 0) {
  const n = Math.max(0, Number(queryCount) || 0);
  const already = Math.max(0, Number(queriesAlreadyToday) || 0);
  const freeLeft = Math.max(0, INCLUDED_QUERIES_PER_DAY_ESTIMATE - already);
  const billable = Math.max(0, n - freeLeft);
  return Number(((billable / 1000) * COST_PER_1000_USD_ESTIMATE).toFixed(4));
}

function canUseBraveSearch(requestedQueries, usedThisRun, projectRoot) {
  const req = Math.max(0, Number(requestedQueries) || 0);
  const runUsed = Math.max(0, Number(usedThisRun) || 0);

  if (!isBraveSearchProviderEnabled()) {
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
      confirmRequired: requiresBraveCostConfirm(),
      reason: req === 0 ? undefined : "provider_not_brave",
    };
  }

  if (!hasBraveCredentials()) {
    return {
      ok: false,
      allowedQueries: 0,
      requestedQueries: req,
      dailyUsed: 0,
      dailyLimit: readDailyLimit(),
      dailyRemaining: 0,
      runRemaining: Math.max(0, readMaxPerRun() - runUsed),
      estimatedIncrementalCostUsd: 0,
      provider: "brave",
      confirmRequired: requiresBraveCostConfirm(),
      reason: "missing_credentials",
    };
  }

  const usage = getBraveSearchUsage(projectRoot);
  const dlim = readDailyLimit();
  const runLim = readMaxPerRun();
  const dailyUsed = usage.queriesUsed;
  const dailyRemaining = Math.max(0, dlim - dailyUsed);
  const runRemaining = Math.max(0, runLim - runUsed);
  const allowedQueries = Math.min(req, dailyRemaining, runRemaining);
  const ok = allowedQueries >= req;
  const estimatedIncrementalCostUsd = estimateBraveSearchCost(allowedQueries, dailyUsed);

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
    provider: "brave",
    confirmRequired: requiresBraveCostConfirm(),
    reason: ok ? undefined : "budget_cap",
  };
}

function recordBraveSearchUsage(projectRoot, queryCount, runId) {
  const n = Math.max(0, Number(queryCount) || 0);
  if (n === 0) return;

  const usage = getBraveSearchUsage(projectRoot);
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
  INCLUDED_QUERIES_PER_DAY_ESTIMATE,
  COST_PER_1000_USD_ESTIMATE,
  getBraveSearchUsagePath,
  getBraveSearchUsage,
  canUseBraveSearch,
  recordBraveSearchUsage,
  estimateBraveSearchCost,
  isBraveSearchProviderEnabled,
  hasBraveCredentials,
  requiresBraveCostConfirm,
  readDailyLimit,
  readMaxPerRun,
};
