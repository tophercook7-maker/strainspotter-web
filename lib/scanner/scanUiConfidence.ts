/** Match `matchConfidenceTier` in `app/garden/scanner/HybridScanResultSections.tsx` — single source for tests + guards. */
export const SCAN_DISPLAY_HIGH_CONFIDENCE_MIN = 70;

export function isBelowHighConfidenceDisplayTier(confidence: number): boolean {
  return !Number.isFinite(confidence) || confidence < SCAN_DISPLAY_HIGH_CONFIDENCE_MIN;
}
