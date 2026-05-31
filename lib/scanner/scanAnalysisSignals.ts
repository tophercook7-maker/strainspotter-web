/**
 * Reads GPT scan JSON `imageSignals` — gates retrieval when the model says the frame is unusable.
 */

export function isUsableVisualSignal(analysis: Record<string, unknown>): boolean {
  const imageSignals =
    analysis.imageSignals && typeof analysis.imageSignals === "object"
      ? (analysis.imageSignals as Record<string, unknown>)
      : {};
  return imageSignals.usableVisualSignal !== false;
}

/** Mutates `analysis`: clears ranked matches when the model flags unusable signal (non-plant, extreme blur/dark). */
export function stripRankedMatchesIfUnusable(analysis: Record<string, unknown>): void {
  if (!isUsableVisualSignal(analysis)) {
    analysis.rankedMatches = [];
  }
}

/** Same cap as `/api/scan` when `usableVisualSignal` is false — keeps tests + route aligned. */
export const LEGACY_UNUSABLE_IDENTITY_CONFIDENCE_CAP = 12;

export function clampLegacyIdentityConfidenceWhenUnusable(prev: number): number {
  return Math.min(Number.isFinite(prev) ? prev : 0, LEGACY_UNUSABLE_IDENTITY_CONFIDENCE_CAP);
}

/** When false, embedding retrieval must not run (avoids spurious NN matches on garbage frames). */
export function shouldRunEmbeddingRetrieval(
  usableVisualSignal: boolean,
  preparedImageCount: number
): boolean {
  return usableVisualSignal && preparedImageCount > 0;
}
