/**
 * Brave Search API budget guard — types + Node runtime bindings.
 * @see SCANNER_EXTERNAL_IMAGE_SEARCH_PROVIDERS.md
 */

export type BraveSearchUsageRun = {
  runId: string;
  at: string;
  queries: number;
};

export type BraveSearchUsage = {
  date: string;
  queriesUsed: number;
  lastRunAt: string;
  runs: BraveSearchUsageRun[];
};

export type CanUseBraveSearchResult = {
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

/* eslint-disable @typescript-eslint/no-require-imports */
const impl = require("./braveSearchBudget.js") as {
  getBraveSearchUsagePath: (projectRoot: string) => string;
  getBraveSearchUsage: (projectRoot: string) => BraveSearchUsage;
  canUseBraveSearch: (
    requestedQueries: number,
    usedThisRun: number,
    projectRoot: string
  ) => CanUseBraveSearchResult;
  recordBraveSearchUsage: (projectRoot: string, queryCount: number, runId: string) => void;
  estimateBraveSearchCost: (queryCount: number, queriesAlreadyToday?: number) => number;
  isBraveSearchProviderEnabled: () => boolean;
  hasBraveCredentials: () => boolean;
  requiresBraveCostConfirm: () => boolean;
  readDailyLimit: () => number;
  readMaxPerRun: () => number;
};

export function getBraveSearchUsagePath(projectRoot: string): string {
  return impl.getBraveSearchUsagePath(projectRoot);
}

export function getBraveSearchUsage(projectRoot: string): BraveSearchUsage {
  return impl.getBraveSearchUsage(projectRoot);
}

export function canUseBraveSearch(
  requestedQueries: number,
  usedThisRun: number,
  projectRoot: string
): CanUseBraveSearchResult {
  return impl.canUseBraveSearch(requestedQueries, usedThisRun, projectRoot);
}

export function recordBraveSearchUsage(projectRoot: string, queryCount: number, runId: string): void {
  impl.recordBraveSearchUsage(projectRoot, queryCount, runId);
}

export function estimateBraveSearchCost(queryCount: number, queriesAlreadyToday?: number): number {
  return impl.estimateBraveSearchCost(queryCount, queriesAlreadyToday);
}

export function isBraveSearchProviderEnabled(): boolean {
  return impl.isBraveSearchProviderEnabled();
}

export function hasBraveCredentials(): boolean {
  return impl.hasBraveCredentials();
}

export function requiresBraveCostConfirm(): boolean {
  return impl.requiresBraveCostConfirm();
}

export function readBraveDailyLimit(): number {
  return impl.readDailyLimit();
}

export function readBraveMaxPerRun(): number {
  return impl.readMaxPerRun();
}
