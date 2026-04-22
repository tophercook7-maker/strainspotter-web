/**
 * Route helper: server-persisted scans use history detail; local-registry-only scans use /garden/saved-scan.
 */
export function savedScanResultsPath(scanId: string): string {
  if (scanId.startsWith("local:")) {
    return `/garden/saved-scan/${encodeURIComponent(scanId)}`;
  }
  return `/garden/history/${encodeURIComponent(scanId)}`;
}

/** Open compare flow with this scan as “A” (pick scan B next). */
export function compareScansPath(scanAId: string): string {
  return `/garden/scans/compare?a=${encodeURIComponent(scanAId)}`;
}
