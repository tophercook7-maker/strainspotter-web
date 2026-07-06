import type { RetrievalCandidate } from "@/lib/scanner/retrievalTypes";
import { shouldRunEmbeddingRetrieval } from "@/lib/scanner/scanAnalysisSignals";

// Result shape for the (retired) embedding-retrieval choke point. The embedding
// implementation was removed — image embeddings proved at-chance for strain ID
// (ROADMAP Phase 1) and pulled a vulnerable @xenova/transformers → protobufjs
// chain. This guard remains as the tested gate that keeps embedding retrieval
// OFF for unusable images; callers inject their own `run`.
export type MultiImageEmbeddingResult = {
  candidates: RetrievalCandidate[];
  embeddingImageCount: number;
  embeddingTopStrainMultiImageReinforced: boolean;
};

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
