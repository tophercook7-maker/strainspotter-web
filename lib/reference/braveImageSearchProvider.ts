/**
 * Brave Search image provider — types + thin Node entrypoint.
 */

export type BraveReferenceImageHit = {
  imageUrl: string;
  sourcePageUrl: string;
  title: string;
  snippet: string;
  sourceName: "brave-search";
};

export type BraveImageSearchDiagnostics = {
  queriesTried: string[];
  rawUrlsReturnedBeforeFiltering: number;
  placeholdersSkipped: number;
  errors: string[];
  warnings: string[];
  providerEnabled?: boolean;
  keyPresent?: boolean;
  queryAttempts?: unknown[];
};

export type BraveImageSearchResult = {
  results: BraveReferenceImageHit[];
  queriesExecuted: number;
  diagnostics?: BraveImageSearchDiagnostics | Record<string, unknown>;
};

/* eslint-disable @typescript-eslint/no-require-imports */
const impl = require("./braveImageSearchProvider.js") as {
  searchBraveReferenceImages: (
    strainName: string,
    limit?: number,
    options?: { maxHttpQueries?: number }
  ) => Promise<BraveImageSearchResult>;
};

export function searchBraveReferenceImages(
  strainName: string,
  limit = 10,
  options?: { maxHttpQueries?: number }
): Promise<BraveImageSearchResult> {
  return impl.searchBraveReferenceImages(strainName, limit, options ?? {});
}
