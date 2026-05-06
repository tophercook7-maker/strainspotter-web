/**
 * Google Custom Search budget guard — types + Node runtime bindings.
 * @see SCANNER_GOOGLE_IMAGE_SEARCH_COSTS.md
 */

export type GoogleSearchUsageRun = {
  runId: string;
  at: string;
  queries: number;
};

export type GoogleSearchUsage = {
  date: string;
  queriesUsed: number;
  lastRunAt: string;
  runs: GoogleSearchUsageRun[];
};

export type CanUseGoogleSearchResult = {
  ok: boolean;
  allowedQueries: number;
  requestedQueries: number;
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  maxQueriesPerRun?: number;
  runQueriesUsed?: number;
  runRemaining: number;
  estimatedIncrementalCostUsd: number;
  provider?: string;
  confirmRequired?: boolean;
  reason?: string;
};

export const FREE_QUERIES_PER_DAY_GOOGLE = 100;
export const COST_PER_1000_USD = 5;

/* eslint-disable @typescript-eslint/no-require-imports */
const impl = require("./googleSearchBudget.js") as {
  getGoogleSearchUsagePath: (projectRoot: string) => string;
  getGoogleSearchUsage: (projectRoot: string) => GoogleSearchUsage;
  canUseGoogleSearch: (
    requestedQueries: number,
    usedThisRun: number,
    projectRoot: string
  ) => CanUseGoogleSearchResult;
  recordGoogleSearchUsage: (projectRoot: string, queryCount: number, runId: string) => void;
  estimateGoogleSearchCost: (queryCount: number, queriesAlreadyToday?: number) => number;
  isGoogleSearchProviderEnabled: () => boolean;
  hasGoogleCredentials: () => boolean;
  requiresGoogleCostConfirm: () => boolean;
  readDailyLimit: () => number;
  readMaxPerRun: () => number;
};

export function getGoogleSearchUsagePath(projectRoot: string): string {
  return impl.getGoogleSearchUsagePath(projectRoot);
}

export function getGoogleSearchUsage(projectRoot: string): GoogleSearchUsage {
  return impl.getGoogleSearchUsage(projectRoot);
}

/** @param projectRoot repo root (directory containing `data/scanner-training`) */
export function canUseGoogleSearch(
  requestedQueries: number,
  usedThisRun: number,
  projectRoot: string
): CanUseGoogleSearchResult {
  return impl.canUseGoogleSearch(requestedQueries, usedThisRun, projectRoot);
}

export function recordGoogleSearchUsage(projectRoot: string, queryCount: number, runId: string): void {
  impl.recordGoogleSearchUsage(projectRoot, queryCount, runId);
}

export function estimateGoogleSearchCost(queryCount: number, queriesAlreadyToday?: number): number {
  return impl.estimateGoogleSearchCost(queryCount, queriesAlreadyToday);
}

export function isGoogleSearchProviderEnabled(): boolean {
  return impl.isGoogleSearchProviderEnabled();
}

export function hasGoogleCredentials(): boolean {
  return impl.hasGoogleCredentials();
}

export function requiresGoogleCostConfirm(): boolean {
  return impl.requiresGoogleCostConfirm();
}

export function readDailyLimit(): number {
  return impl.readDailyLimit();
}

export function readMaxPerRun(): number {
  return impl.readMaxPerRun();
}
