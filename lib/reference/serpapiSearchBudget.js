/**
 * SerpApi — local budget / cost guard for reference image search CLI tooling.
 */

const fs = require("node:fs");
const path = require("node:path");

const INCLUDED_QUERIES_PER_DAY_ESTIMATE = 100;
const COST_PER_1000_USD_ESTIMATE = 15;

function getSerpapiSearchUsagePath(projectRoot) {
  return path.join(projectRoot, "data", "scanner-training", "serpapi-search-usage.json");
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

function getSerpapiSearchUsage(projectRoot) {
  const today = todayLocalISODate();
  const p = getSerpapiSearchUsagePath(projectRoot);
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
  const p = getSerpapiSearchUsagePath(projectRoot);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(usage, null, 2), "utf8");
}

function isSerpapiSearchProviderEnabled() {
  return String(process.env.REFERENCE_IMAGE_SEARCH_PROVIDER || "off").toLowerCase() === "serpapi";
}

function hasSerpapiCredentials() {
  const key = process.env.SERPAPI_API_KEY;
  return Boolean(key && String(key).trim());
}

function requiresSerpapiCostConfirm() {
  const v = String(process.env.SERPAPI_REQUIRE_CONFIRM ?? "true").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function readDailyLimit() {
  const n = Number(process.env.SERPAPI_DAILY_LIMIT ?? 100);
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(10_000, Math.floor(n)));
}

function readMaxPerRun() {
  const n = Number(process.env.SERPAPI_MAX_QUERIES_PER_RUN ?? 25);
  if (!Number.isFinite(n)) return 25;
  return Math.max(0, Math.min(10_000, Math.floor(n)));
}

function estimateSerpapiSearchCost(queryCount, queriesAlreadyToday = 0) {
  const n = Math.max(0, Number(queryCount) || 0);
  const already = Math.max(0, Number(queriesAlreadyToday) || 0);
  const freeLeft = Math.max(0, INCLUDED_QUERIES_PER_DAY_ESTIMATE - already);
  const billable = Math.max(0, n - freeLeft);
  return Number(((billable / 1000) * COST_PER_1000_USD_ESTIMATE).toFixed(4));
}

function canUseSerpapiSearch(requestedQueries, usedThisRun, projectRoot) {
  const req = Math.max(0, Number(requestedQueries) || 0);
  const runUsed = Math.max(0, Number(usedThisRun) || 0);

  if (!isSerpapiSearchProviderEnabled()) {
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
      confirmRequired: requiresSerpapiCostConfirm(),
      reason: req === 0 ? undefined : "provider_not_serpapi",
    };
  }

  if (!hasSerpapiCredentials()) {
    return {
      ok: false,
      allowedQueries: 0,
      requestedQueries: req,
      dailyUsed: 0,
      dailyLimit: readDailyLimit(),
      dailyRemaining: 0,
      runRemaining: Math.max(0, readMaxPerRun() - runUsed),
      estimatedIncrementalCostUsd: 0,
      provider: "serpapi",
      confirmRequired: requiresSerpapiCostConfirm(),
      reason: "missing_credentials",
    };
  }

  const usage = getSerpapiSearchUsage(projectRoot);
  const dlim = readDailyLimit();
  const runLim = readMaxPerRun();
  const dailyUsed = usage.queriesUsed;
  const dailyRemaining = Math.max(0, dlim - dailyUsed);
  const runRemaining = Math.max(0, runLim - runUsed);
  const allowedQueries = Math.min(req, dailyRemaining, runRemaining);
  const ok = allowedQueries >= req;
  const estimatedIncrementalCostUsd = estimateSerpapiSearchCost(allowedQueries, dailyUsed);

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
    provider: "serpapi",
    confirmRequired: requiresSerpapiCostConfirm(),
    reason: ok ? undefined : "budget_cap",
  };
}

function recordSerpapiSearchUsage(projectRoot, queryCount, runId) {
  const n = Math.max(0, Number(queryCount) || 0);
  if (n === 0) return;

  const usage = getSerpapiSearchUsage(projectRoot);
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
  getSerpapiSearchUsagePath,
  getSerpapiSearchUsage,
  canUseSerpapiSearch,
  recordSerpapiSearchUsage,
  estimateSerpapiSearchCost,
  isSerpapiSearchProviderEnabled,
  hasSerpapiCredentials,
  requiresSerpapiCostConfirm,
  readDailyLimit,
  readMaxPerRun,
};
