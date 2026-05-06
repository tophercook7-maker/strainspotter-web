/**
 * Google Custom Search image provider (types + thin Node entrypoint).
 * Runtime implementation: `googleImageSearchProvider.js` (used by CLI scripts).
 */

export type GoogleReferenceImageHit = {
  imageUrl: string;
  sourcePageUrl: string;
  title: string;
  snippet: string;
  sourceName: "google-custom-search";
};

export type GoogleImageSearchDiagnostics = {
  queriesTried: string[];
  rawUrlsReturnedBeforeFiltering: number;
  placeholdersSkipped: number;
  errors: string[];
  warnings: string[];
  providerEnabled?: boolean;
  keyPresent?: boolean;
  cxPresent?: boolean;
  /** Per HTTP attempt (truncated payloads in errors only) */
  queryAttempts?: unknown[];
};

export type GoogleImageSearchResult = {
  results: GoogleReferenceImageHit[];
  queriesExecuted: number;
  diagnostics?: GoogleImageSearchDiagnostics | Record<string, unknown>;
};

/* eslint-disable @typescript-eslint/no-require-imports */
const impl = require("./googleImageSearchProvider.js") as {
  searchGoogleReferenceImages: (
    strainName: string,
    limit?: number,
    options?: { maxHttpQueries?: number }
  ) => Promise<GoogleImageSearchResult>;
};

export function searchGoogleReferenceImages(
  strainName: string,
  limit = 10,
  options?: { maxHttpQueries?: number }
): Promise<GoogleImageSearchResult> {
  return impl.searchGoogleReferenceImages(strainName, limit, options ?? {});
}
