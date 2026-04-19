import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RetrievalCandidate } from "@/lib/scanner/retrievalTypes";
import {
  findNearestEmbeddedStrains,
  type StrainEmbeddingDataset,
} from "@/lib/scanner/embeddingDataset";
import { displayStrainNameForSlug } from "@/lib/scanner/strainSlug";
import { pipeline, RawImage } from "@xenova/transformers";

const MODEL_ID = "Xenova/clip-vit-base-patch32";

let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline("image-feature-extraction", MODEL_ID);
  }
  return extractor;
}

/** Decode scan payload image string (data URL or raw base64) to a CLIP-ready `RawImage`. */
export async function imagePayloadToRawImage(image: string): Promise<
  InstanceType<typeof RawImage>
> {
  const trimmed = image.trim();
  if (trimmed.startsWith("data:")) {
    const comma = trimmed.indexOf(",");
    if (comma === -1) {
      throw new Error("Invalid data URL: missing payload");
    }
    const b64 = trimmed.slice(comma + 1).replace(/\s/g, "");
    const buf = Buffer.from(b64, "base64");
    return RawImage.fromBlob(new Blob([buf]));
  }
  const buf = Buffer.from(trimmed.replace(/\s/g, ""), "base64");
  return RawImage.fromBlob(new Blob([buf]));
}

/** CLIP embedding (L2-normalized 512-D) for the first image in the scan pipeline. */
export async function getImageEmbedding(image: string): Promise<number[]> {
  const model = await getExtractor();
  const raw = await imagePayloadToRawImage(image);
  const result = await model(raw, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(result.data);
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const mockEmbeddings = [
  { strainName: "Blue Dream", embedding: new Array(512).fill(0.2) },
  { strainName: "Sour Diesel", embedding: new Array(512).fill(0.15) },
];

async function findNearestStrainsMock(
  embedding: number[]
): Promise<RetrievalCandidate[]> {
  const results: RetrievalCandidate[] = [];
  for (const item of mockEmbeddings) {
    const similarity = cosineSimilarity(embedding, item.embedding);
    if (similarity > 0.5) {
      results.push({
        strainName: item.strainName,
        score: similarity,
        source: "embedding",
        reasons: ["Visual similarity (CLIP embedding — mock fallback)"],
      });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}

let datasetLoad: Promise<StrainEmbeddingDataset | null> | null = null;

async function loadStrainEmbeddingDataset(): Promise<StrainEmbeddingDataset | null> {
  if (!datasetLoad) {
    datasetLoad = (async () => {
      try {
        const filePath = join(
          process.cwd(),
          "data/embeddings/strain-embeddings.json"
        );
        const text = await readFile(filePath, "utf8");
        return JSON.parse(text) as StrainEmbeddingDataset;
      } catch {
        return null;
      }
    })();
  }
  return datasetLoad;
}

export async function isEmbeddingDatasetAvailable(): Promise<boolean> {
  const ds = await loadStrainEmbeddingDataset();
  return !!ds?.strains?.length;
}

/**
 * Nearest strains from `data/embeddings/strain-embeddings.json` (built offline).
 * Falls back to a small mock only when the artifact is missing or empty.
 */
export async function findNearestStrainsFromDataset(
  embedding: number[]
): Promise<RetrievalCandidate[]> {
  const dataset = await loadStrainEmbeddingDataset();
  if (!dataset?.strains?.length) {
    return findNearestStrainsMock(embedding);
  }

  const hits = findNearestEmbeddedStrains(embedding, dataset, 8);
  return hits.map((h) => ({
    strainName: displayStrainNameForSlug(h.strainName, h.strainName),
    score: h.score,
    source: "embedding",
    reasons: [
      `CLIP vs labeled dataset (${h.imageCount} reference images) · cosine ${h.score.toFixed(3)}`,
    ],
  }));
}
