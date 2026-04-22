// lib/scanner/embeddingService.ts

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline, RawImage } from "@xenova/transformers";
import type { RetrievalCandidate } from "@/lib/scanner/retrievalTypes";
import {
  findNearestEmbeddedStrains,
  type StrainEmbeddingDataset,
} from "@/lib/scanner/embeddingDataset";
import {
  displayStrainNameForSlug,
  resolveStrainSlug,
} from "@/lib/scanner/strainSlug";

const MODEL_ID = "Xenova/clip-vit-base-patch32";
const DEFAULT_DATASET_PATH = "data/embeddings/strain-embeddings.json";

/** Drop very weak cosine neighbors so fusion is not dominated by noise. */
const MIN_EMBEDDING_SIMILARITY = 0.2;

/** After merging strains across images, keep this many for fusion (descending score). */
const MAX_MERGED_EMBEDDING_CANDIDATES = 36;

/** Conservative multi-image agreement boost on best per-strain score (0..1). */
const MULTI_IMAGE_BOOST_PER_EXTRA_PHOTO = 0.02;
const MULTI_IMAGE_BOOST_CAP = 0.06;

function mergeKeyForStrain(strainName: string): string {
  const trimmed = strainName.trim();
  return resolveStrainSlug(trimmed) || trimmed.toLowerCase();
}

/** Matches `reasons` text when `findNearestStrainsFromDataset` uses the mock path. */
export const EMBEDDING_DATASET_MOCK_REASON = "Mock fallback: embedding dataset missing or empty";

/** True when at least one candidate came from CLIP + on-disk dataset (not the mock path). */
export function embeddingCandidatesFromDataset(
  candidates: RetrievalCandidate[]
): boolean {
  if (candidates.length === 0) return false;
  return candidates.some(
    (c) =>
      !(c.reasons ?? []).some((r) =>
        String(r).includes(EMBEDDING_DATASET_MOCK_REASON)
      )
  );
}

export type MultiImageEmbeddingResult = {
  candidates: RetrievalCandidate[];
  /** Images for which embedding + retrieval succeeded (failed images skipped). */
  embeddingImageCount: number;
  /** True when the top merged embedding candidate was supported by ≥2 images. */
  embeddingTopStrainMultiImageReinforced: boolean;
};

/**
 * Per image: CLIP embedding → nearest strains. Merge by strain (slug), keep best raw
 * score per strain, count distinct supporting images, merge reasons, apply a small
 * multi-image boost (capped), sort descending. Scores stay in 0..1 before fusion.
 */
export async function findNearestStrainsFromImages(
  images: string[]
): Promise<MultiImageEmbeddingResult> {
  if (!Array.isArray(images) || images.length === 0) {
    return {
      candidates: [],
      embeddingImageCount: 0,
      embeddingTopStrainMultiImageReinforced: false,
    };
  }

  type Acc = {
    displayName: string;
    bestScore: number;
    imageIndices: Set<number>;
    reasons: string[];
  };

  const byKey = new Map<string, Acc>();
  let embeddingImageCount = 0;

  for (let i = 0; i < images.length; i += 1) {
    try {
      const embedding = await getImageEmbedding(images[i]!);
      const batch = await findNearestStrainsFromDataset(embedding);
      embeddingImageCount += 1;

      for (const c of batch) {
        const raw = Number(c.score);
        const score = Math.max(0, Math.min(1, Number.isFinite(raw) ? raw : 0));
        const key = mergeKeyForStrain(c.strainName);
        const nextReasons = (c.reasons ?? []).filter(
          (r): r is string => typeof r === "string" && r.trim().length > 0
        );

        const existing = byKey.get(key);
        if (!existing) {
          byKey.set(key, {
            displayName: c.strainName.trim(),
            bestScore: score,
            imageIndices: new Set([i]),
            reasons: [...nextReasons],
          });
        } else {
          if (score > existing.bestScore) {
            existing.bestScore = score;
            existing.displayName = c.strainName.trim();
          }
          existing.imageIndices.add(i);
          for (const r of nextReasons) {
            if (!existing.reasons.includes(r)) {
              existing.reasons.push(r);
            }
          }
        }
      }
    } catch {
      /* continue with remaining images */
    }
  }

  const rows: Array<{ candidate: RetrievalCandidate; supportCount: number }> = [];

  for (const acc of byKey.values()) {
    const n = acc.imageIndices.size;
    const boost = Math.min(
      MULTI_IMAGE_BOOST_CAP,
      Math.max(0, (n - 1) * MULTI_IMAGE_BOOST_PER_EXTRA_PHOTO)
    );
    const finalScore = Math.max(0, Math.min(1, acc.bestScore + boost));
    const extraReason =
      n > 1
        ? [`Multi-image support: ${n} photo(s) matched this strain (boost +${boost.toFixed(3)})`]
        : [];

    const candidate: RetrievalCandidate = {
      strainName: acc.displayName,
      score: finalScore,
      source: "embedding",
      reasons: [...acc.reasons, ...extraReason].slice(0, 12),
      metadataAgreement:
        embeddingImageCount > 0 ? n / embeddingImageCount : undefined,
    };
    rows.push({ candidate, supportCount: n });
  }

  rows.sort((a, b) => b.candidate.score - a.candidate.score);
  const sliced = rows.slice(0, MAX_MERGED_EMBEDDING_CANDIDATES);
  const candidates = sliced.map((r) => r.candidate);
  const embeddingTopStrainMultiImageReinforced =
    sliced.length > 0 && sliced[0]!.supportCount >= 2;

  return {
    candidates,
    embeddingImageCount,
    embeddingTopStrainMultiImageReinforced,
  };
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
      `CLIP similarity ${item.score.toFixed(3)} (0.7× best image + 0.3× strain avg; weak matches filtered)`,
    ],
  }));
}
