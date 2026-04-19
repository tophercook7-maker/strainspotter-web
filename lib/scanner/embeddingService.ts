// lib/scanner/embeddingService.ts

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline, RawImage } from "@xenova/transformers";
import type { RetrievalCandidate } from "@/lib/scanner/retrievalTypes";
import {
  findNearestEmbeddedStrains,
  type StrainEmbeddingDataset,
} from "@/lib/scanner/embeddingDataset";
import { displayStrainNameForSlug } from "@/lib/scanner/strainSlug";

const MODEL_ID = "Xenova/clip-vit-base-patch32";
const DEFAULT_DATASET_PATH = "data/embeddings/strain-embeddings.json";

/** Drop very weak cosine neighbors so fusion is not dominated by noise. */
const MIN_EMBEDDING_SIMILARITY = 0.2;

/** Matches `reasons` text when `findNearestStrainsFromDataset` uses the mock path. */
export const EMBEDDING_DATASET_MOCK_REASON = "Mock fallback: embedding dataset missing or empty";

/** True when candidates came from CLIP + on-disk dataset (not the empty-dataset mock). */
export function embeddingCandidatesFromDataset(
  candidates: RetrievalCandidate[]
): boolean {
  if (candidates.length === 0) return false;
  return !(candidates[0]?.reasons ?? []).some((r) =>
    String(r).includes(EMBEDDING_DATASET_MOCK_REASON)
  );
}

/** `pipeline()` return type is too wide for strict calls; runtime is CLIP image-feature-extraction. */
let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline("image-feature-extraction", MODEL_ID);
  }
  return extractor;
}

function decodeDataUrl(image: string): Buffer {
  const base64 = image.replace(/^data:[^;]+;base64,/, "");
  return Buffer.from(base64, "base64");
}

async function imagePayloadToRawImage(image: string): Promise<RawImage> {
  const bytes = image.startsWith("data:")
    ? decodeDataUrl(image)
    : Buffer.from(image.replace(/\s/g, ""), "base64");

  const blob = new Blob([new Uint8Array(bytes)]);
  return await RawImage.fromBlob(blob);
}

export async function getImageEmbedding(image: string): Promise<number[]> {
  const model = await getExtractor();
  const rawImage = await imagePayloadToRawImage(image);

  const result = await model(rawImage, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(result.data as Float32Array);
}

async function loadStrainEmbeddingDataset(
  datasetPath = DEFAULT_DATASET_PATH
): Promise<StrainEmbeddingDataset | null> {
  try {
    const fullPath = join(process.cwd(), datasetPath);
    const raw = await readFile(fullPath, "utf8");
    return JSON.parse(raw) as StrainEmbeddingDataset;
  } catch {
    return null;
  }
}

export async function isEmbeddingDatasetAvailable(
  datasetPath = DEFAULT_DATASET_PATH
): Promise<boolean> {
  const dataset = await loadStrainEmbeddingDataset(datasetPath);
  return Boolean(dataset?.strains?.length);
}

export async function findNearestStrainsFromDataset(
  embedding: number[],
  datasetPath = DEFAULT_DATASET_PATH
): Promise<RetrievalCandidate[]> {
  const dataset = await loadStrainEmbeddingDataset(datasetPath);

  if (!dataset?.strains?.length) {
    return [
      {
        strainName: "Blue Dream",
        score: 0.6,
        source: "embedding",
        reasons: [EMBEDDING_DATASET_MOCK_REASON],
      },
      {
        strainName: "Sour Diesel",
        score: 0.55,
        source: "embedding",
        reasons: [EMBEDDING_DATASET_MOCK_REASON],
      },
    ];
  }

  const nearest = findNearestEmbeddedStrains(embedding, dataset, 12);
  const strong = nearest.filter((item) => item.score >= MIN_EMBEDDING_SIMILARITY);

  return strong.map((item) => ({
    strainName: displayStrainNameForSlug(item.strainName),
    score: item.score,
    source: "embedding",
    reasons: [
      `CLIP cosine similarity ${item.score.toFixed(3)} (dataset neighbors; weak matches filtered)`,
    ],
  }));
}
