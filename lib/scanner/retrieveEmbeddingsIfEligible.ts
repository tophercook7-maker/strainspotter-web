import type { MultiImageEmbeddingResult } from "@/lib/scanner/embeddingService";
import { shouldRunEmbeddingRetrieval } from "@/lib/scanner/scanAnalysisSignals";

const EMPTY: MultiImageEmbeddingResult = {
  candidates: [],
  embeddingImageCount: 0,
  embeddingTopStrainMultiImageReinforced: false,
};

/**
 * Runs CLIP embedding retrieval only when the GPT analysis allows it.
 * Keeps a single choke point testable from negative-case suites.
 */
export async function retrieveEmbeddingsIfEligible(
  usableVisualSignal: boolean,
  preparedImages: string[],
  run: () => Promise<MultiImageEmbeddingResult>
): Promise<MultiImageEmbeddingResult> {
  if (!shouldRunEmbeddingRetrieval(usableVisualSignal, preparedImages.length)) {
    return EMPTY;
  }
  return run();
}
