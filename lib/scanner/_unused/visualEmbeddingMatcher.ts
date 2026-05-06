import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isScannerDebugMatching } from "@/lib/scanner/scannerMatchingEnv";
import {
  applyTrustToEmbeddingMatch,
  type MatchedReferenceImageRow,
} from "@/lib/scanner/referenceTrustWeighting";

export type EmbeddingMatch = {
  strainSlug: string;
  strainName: string;
  visualEmbeddingScore: number;
  matchedReferenceImages: MatchedReferenceImageRow[];
  bestSimilarity: number;
  averageTopSimilarity: number;
  /** Trust-weighted mean similarity (preferred for scoring vs raw cosine). */
  weightedAverageSimilarity?: number;
  trustedBestSimilarity?: number;
  referenceTrustScore?: number;
  trustedMatchCount?: number;
  needsReviewMatchCount?: number;
  variantMatchCount?: number;
  apiExactMatchCount?: number;
  needsReviewOnlyDominant?: boolean;
  matchTrustTier?: "trusted" | "exact" | "weak" | "needs_review";
  referenceTrustWarnings?: string[];
  referenceImageCount: number;
};

export type EmbeddingMatchResult = {
  embeddingIndexUsed: boolean;
  embeddingModel: string | null;
  /** Total rows in reference-embedding-index.json (when file exists). */
  embeddingImageCount: number;
  topEmbeddingMatches: EmbeddingMatch[];
  /**
   * Every strain group from the embedding index for this scan, sorted by coarse embedding score.
   * embedding_only mode should re-sort with embeddingOnlyRanking (trusted confirmations, etc.).
   */
  groupedEmbeddingMatchesAll?: EmbeddingMatch[];
  ambiguityWarning: string | null;
  error?: string;
  /** True iff a non-empty embedding vector was produced for the scan image. */
  scanEmbeddingGenerated?: boolean;
  scanEmbeddingError?: string | null;
  embeddingVectorLength?: number;
  embeddingDebug?: {
    scanEmbeddingGenerated: boolean;
    scanEmbeddingModel: string | null;
    scanEmbeddingNorm: number;
    scanEmbeddingPreview: number[];
    scanEmbeddingHashShort: string;
    scanEmbeddingError?: string | null;
    embeddingVectorLength: number;
    rawImageMatchesTop20: Array<{
      strainSlug: string;
      strainName: string;
      localPath: string;
      similarity: number;
    }>;
    groupedStrainMatchesTop10: EmbeddingMatch[];
  };
};

type EmbeddingIndexRecord = {
  strainSlug: string;
  strainName: string;
  localPath: string;
  imageUrl?: string;
  sourcePageUrl?: string;
  sourceName?: string;
  reviewStatus?: string;
  embedding: number[];
  embeddingModel: string;
  contentHash?: string;
};

type EmbeddingIndex = {
  embeddingModel?: string;
  records?: EmbeddingIndexRecord[];
};

let extractorPromise: Promise<any> | null = null;

export const DEFAULT_SCAN_EMBEDDING_MODEL =
  process.env.SCANNER_EMBEDDING_MODEL || "Xenova/clip-vit-base-patch32";

function embeddingIndexPath(): string {
  return path.join(
    process.cwd(),
    "data",
    "strain-reference-images",
    "reference-embedding-index.json"
  );
}

function loadEmbeddingIndex(): EmbeddingIndex | null {
  const indexPath = embeddingIndexPath();
  if (!fs.existsSync(indexPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8")) as EmbeddingIndex;
    if (!Array.isArray(parsed.records) || !parsed.records.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = import("@xenova/transformers").then(({ pipeline }) =>
      pipeline("image-feature-extraction", DEFAULT_SCAN_EMBEDDING_MODEL)
    );
  }
  return extractorPromise;
}

/** Align with scripts/build-reference-embedding-index.js for cosine parity with stored vectors. */
function normalizeVector(values: Iterable<number>): number[] {
  const vector = Array.from(values, Number);
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / norm).toFixed(8)));
}

function tensorToVector(output: any): number[] {
  const data = output?.data ?? output?.[0]?.data;
  if (!data) return [];
  return normalizeVector(data as Iterable<number>);
}

async function embedFilePath(filePath: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(filePath, { pooling: "mean", normalize: true });
  return tensorToVector(output);
}

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export type GenerateScanImageEmbeddingInput = {
  imageBase64?: string;
  imageBuffer?: Buffer;
  contentType?: string;
};

export type GenerateScanImageEmbeddingResult = {
  embedding: number[];
  model: string;
  error?: string;
};

/**
 * Embed a user scan image using the same CLIP pipeline + normalization as reference indexing.
 * Uses a temp file + filesystem path (same input style as build-reference-embedding-index.js);
 * data URLs are unreliable in Next.js server / webpack contexts.
 */
export async function generateScanImageEmbedding(
  input: GenerateScanImageEmbeddingInput
): Promise<GenerateScanImageEmbeddingResult> {
  const model = DEFAULT_SCAN_EMBEDDING_MODEL;
  let buffer: Buffer | null = null;
  if (input.imageBuffer && input.imageBuffer.length > 0) {
    buffer = input.imageBuffer;
  } else if (input.imageBase64) {
    const raw = input.imageBase64.includes(",")
      ? input.imageBase64.slice(input.imageBase64.indexOf(",") + 1)
      : input.imageBase64;
    try {
      buffer = Buffer.from(raw.replace(/\s/g, ""), "base64");
    } catch {
      buffer = null;
    }
  }
  if (!buffer?.length) {
    return { embedding: [], model, error: "No image bytes provided for embedding." };
  }

  const ct = (input.contentType || "image/jpeg").toLowerCase();
  const ext = CONTENT_TYPE_TO_EXT[ct] || ".jpg";
  const tmpPath = path.join(tmpdir(), `strainspotter-scan-${randomUUID()}${ext}`);

  try {
    await writeFile(tmpPath, buffer);
    const embedding = await embedFilePath(tmpPath);
    if (!embedding.length) {
      return {
        embedding: [],
        model,
        error: "CLIP pipeline returned an empty embedding vector (check image format).",
      };
    }
    return { embedding, model };
  } catch (e) {
    return {
      embedding: [],
      model,
      error: `Scan embedding failed: ${String(e).slice(0, 400)}`,
    };
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

function l2Norm(values: number[]): number {
  return Math.sqrt(values.reduce((sum, v) => sum + v * v, 0)) || 0;
}

function shortHashFromEmbedding(vec: number[]): string {
  const sample = vec.slice(0, 64).map((v) => Number(v.toFixed(5))).join(",");
  return createHash("sha256")
    .update(`${vec.length}:${sample}`)
    .digest("hex")
    .slice(0, 12);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (!length) return 0;
  let dot = 0;
  for (let i = 0; i < length; i += 1) dot += a[i] * b[i];
  return dot;
}

export function getEmbeddingIndexImageCount(): number {
  const indexPath = embeddingIndexPath();
  if (!fs.existsSync(indexPath)) return 0;
  try {
    const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
      records?: unknown[];
    };
    return Array.isArray(parsed.records) ? parsed.records.length : 0;
  } catch {
    return 0;
  }
}

export function isEmbeddingIndexAvailable(): boolean {
  return Boolean(loadEmbeddingIndex());
}

export async function matchVisualEmbeddingFromBase64(input: {
  imageBase64?: string;
  imageBuffer?: Buffer;
  contentType?: string;
}): Promise<EmbeddingMatchResult> {
  const index = loadEmbeddingIndex();
  if (!index?.records?.length) {
    return {
      embeddingIndexUsed: false,
      embeddingModel: null,
      embeddingImageCount: getEmbeddingIndexImageCount(),
      topEmbeddingMatches: [],
      ambiguityWarning: null,
      scanEmbeddingGenerated: false,
      scanEmbeddingError: null,
      embeddingVectorLength: 0,
    };
  }

  const hasImage =
    Boolean(input.imageBuffer?.length) ||
    Boolean(input.imageBase64 && input.imageBase64.replace(/\s/g, "").length > 0);

  if (!hasImage) {
    return {
      embeddingIndexUsed: true,
      embeddingModel: index.embeddingModel ?? null,
      embeddingImageCount: index.records.length,
      topEmbeddingMatches: [],
      ambiguityWarning: null,
      scanEmbeddingGenerated: false,
      scanEmbeddingError: "No uploaded image was available for embedding comparison.",
      embeddingVectorLength: 0,
      error: "No uploaded image was available for embedding comparison.",
    };
  }

  const gen = await generateScanImageEmbedding({
    imageBase64: input.imageBase64,
    imageBuffer: input.imageBuffer,
    contentType: input.contentType,
  });

  const debugMatching = isScannerDebugMatching();
  const embedOk = gen.embedding.length > 0;

  if (!embedOk) {
    const errMsg =
      gen.error || "Scan image embedding failed; embedding comparison could not run.";
    const base: EmbeddingMatchResult = {
      embeddingIndexUsed: true,
      embeddingModel: index.embeddingModel ?? gen.model ?? DEFAULT_SCAN_EMBEDDING_MODEL,
      embeddingImageCount: index.records.length,
      topEmbeddingMatches: [],
      ambiguityWarning: null,
      scanEmbeddingGenerated: false,
      scanEmbeddingError: errMsg,
      embeddingVectorLength: 0,
      error: errMsg,
    };
    if (debugMatching) {
      base.embeddingDebug = {
        scanEmbeddingGenerated: false,
        scanEmbeddingModel: gen.model,
        scanEmbeddingNorm: 0,
        scanEmbeddingPreview: [],
        scanEmbeddingHashShort: "",
        scanEmbeddingError: errMsg,
        embeddingVectorLength: 0,
        rawImageMatchesTop20: [],
        groupedStrainMatchesTop10: [],
      };
    }
    return base;
  }

  const uploadedEmbedding = gen.embedding;
  const embedNorm = Number(l2Norm(uploadedEmbedding).toFixed(6));
  const embedPreview = uploadedEmbedding.slice(0, 5).map((v) => Number(v.toFixed(4)));
  const embedHashShort = shortHashFromEmbedding(uploadedEmbedding);
  const runtimeModel = gen.model;

  type RawSim = {
    strainSlug: string;
    strainName: string;
    localPath: string;
    similarity: number;
  };
  const rawSims: RawSim[] = [];

  const byStrain = new Map<
    string,
    {
      strainSlug: string;
      strainName: string;
      referenceImageCount: number;
      matches: EmbeddingMatch["matchedReferenceImages"];
    }
  >();

  let skippedEmptyRefEmbedding = 0;
  for (const record of index.records) {
    if (!Array.isArray(record.embedding) || !record.embedding.length) {
      skippedEmptyRefEmbedding += 1;
      continue;
    }
    const similarity = cosineSimilarity(uploadedEmbedding, record.embedding);
    if (debugMatching) {
      rawSims.push({
        strainSlug: record.strainSlug,
        strainName: record.strainName,
        localPath: record.localPath,
        similarity: Number(similarity.toFixed(4)),
      });
    }
    const current =
      byStrain.get(record.strainSlug) ??
      {
        strainSlug: record.strainSlug,
        strainName: record.strainName,
        referenceImageCount: 0,
        matches: [],
      };
    current.referenceImageCount += 1;
    current.matches.push({
      localPath: record.localPath,
      imageUrl: record.imageUrl,
      sourcePageUrl: record.sourcePageUrl,
      sourceName: record.sourceName || undefined,
      reviewStatus: record.reviewStatus || undefined,
      similarity: Number(similarity.toFixed(4)),
    });
    byStrain.set(record.strainSlug, current);
  }

  const rawImageMatchesTop20 = debugMatching
    ? [...rawSims].sort((a, b) => b.similarity - a.similarity).slice(0, 20)
    : [];

  const groupedSorted = [...byStrain.values()]
    .map((group) => {
      const ranked = group.matches
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
      return applyTrustToEmbeddingMatch({
        strainSlug: group.strainSlug,
        strainName: group.strainName,
        matchedReferenceImages: ranked,
        referenceImageCount: group.referenceImageCount,
      });
    })
    .sort((a, b) => {
      const ts = (b.referenceTrustScore ?? b.weightedAverageSimilarity ?? 0) -
        (a.referenceTrustScore ?? a.weightedAverageSimilarity ?? 0);
      if (ts !== 0) return ts;
      const wt =
        (b.weightedAverageSimilarity ?? 0) -
        (a.weightedAverageSimilarity ?? 0);
      if (wt !== 0) return wt;
      const tb =
        (b.trustedBestSimilarity ?? 0) - (a.trustedBestSimilarity ?? 0);
      if (tb !== 0) return tb;
      return (
        (b.bestSimilarity ?? 0) -
        (a.bestSimilarity ?? 0) ||
        b.visualEmbeddingScore - a.visualEmbeddingScore ||
        b.averageTopSimilarity - a.averageTopSimilarity ||
        b.referenceImageCount - a.referenceImageCount
      );
    });

  const groupedStrainMatchesTop10 = debugMatching ? groupedSorted.slice(0, 10) : [];

  const topEmbeddingMatches = groupedSorted.slice(0, 8);

  const first = topEmbeddingMatches[0];
  const second = topEmbeddingMatches[1];
  const ambiguityWarning =
    first && second
      ? ((first.weightedAverageSimilarity ?? first.averageTopSimilarity ?? 0) -
          (second.weightedAverageSimilarity ?? second.averageTopSimilarity ?? 0)) < 0.035
          ? "Embedding top matches are close; confidence reduced."
          : null
      : null;

  let metaError: string | undefined;
  if (topEmbeddingMatches.length === 0 && skippedEmptyRefEmbedding === index.records.length) {
    metaError =
      "Reference embedding index has no usable embedding vectors (all records missing embedding arrays). Re-run npm run references:embeddings.";
  }

  const result: EmbeddingMatchResult = {
    embeddingIndexUsed: true,
    embeddingModel: index.embeddingModel ?? runtimeModel,
    embeddingImageCount: index.records.length,
    topEmbeddingMatches,
    groupedEmbeddingMatchesAll: groupedSorted,
    ambiguityWarning,
    scanEmbeddingGenerated: true,
    scanEmbeddingError: null,
    embeddingVectorLength: uploadedEmbedding.length,
    ...(metaError ? { error: metaError } : {}),
    embeddingDebug: debugMatching
      ? {
          scanEmbeddingGenerated: true,
          scanEmbeddingModel: runtimeModel,
          scanEmbeddingNorm: embedNorm,
          scanEmbeddingPreview: embedPreview,
          scanEmbeddingHashShort: embedHashShort,
          scanEmbeddingError: null,
          embeddingVectorLength: uploadedEmbedding.length,
          rawImageMatchesTop20,
          groupedStrainMatchesTop10,
        }
      : undefined,
  };

  return result;
}
