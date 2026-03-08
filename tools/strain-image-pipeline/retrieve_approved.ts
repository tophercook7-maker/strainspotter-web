#!/usr/bin/env node
/**
 * Retrieve approved strain images by embedding similarity.
 * Loads approved image embeddings and returns top matches for a query embedding.
 * Local-file based; not wired into production scanner yet.
 */

import { readFile } from "fs/promises";
import { createHash } from "crypto";
import { PATHS } from "./config.js";
import type { EmbeddingRecord } from "./generate_embeddings.js";

const EMBEDDING_DIM = 384;

export interface RetrievalCandidate {
  imageId: string;
  strainSlug: string;
  strainName?: string;
  imagePath: string;
  imageType: string;
  score: number;
}

/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    na += (a[i] ?? 0) ** 2;
    nb += (b[i] ?? 0) ** 2;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

/** Mock query embedding for testing (deterministic from a seed string) */
function mockQueryEmbedding(seed: string): number[] {
  const hash = createHash("sha256").update(seed).digest("hex");
  const vector: number[] = [];
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const slice = hash.slice((i * 2) % 64, ((i * 2) % 64) + 4) || "0000";
    const val = parseInt(slice, 16) / 65535;
    vector.push(val * 2 - 1);
  }
  return vector;
}

async function loadEmbeddingRecords(): Promise<EmbeddingRecord[]> {
  const manifestPath = PATHS.embeddingManifest;
  let manifest: { entries: Array<{ embeddingFile: string }> };
  try {
    const raw = await readFile(manifestPath, "utf-8");
    manifest = JSON.parse(raw);
  } catch {
    return [];
  }

  const records: EmbeddingRecord[] = [];
  for (const e of manifest.entries ?? []) {
    try {
      const raw = await readFile(e.embeddingFile, "utf-8");
      records.push(JSON.parse(raw) as EmbeddingRecord);
    } catch {
      continue;
    }
  }
  return records;
}

export async function retrieveApproved(
  queryEmbedding: number[],
  topK = 5
): Promise<RetrievalCandidate[]> {
  const records = await loadEmbeddingRecords();
  const scored = records.map((r) => ({
    ...r,
    score: cosineSimilarity(queryEmbedding, r.vector),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ vector: _, ...r }) => ({
    imageId: r.imageId,
    strainSlug: r.strainSlug,
    strainName: r.strainName,
    imagePath: r.imagePath,
    imageType: r.imageType,
    score: r.score,
  }));
}

async function main() {
  const seed = process.argv[2] ?? "blue-dream";
  const topK = parseInt(process.argv[3] ?? "5", 10);

  const queryVector = mockQueryEmbedding(seed);
  const candidates = await retrieveApproved(queryVector, topK);

  console.log(`[Retrieve] query seed="${seed}" topK=${topK}`);
  if (candidates.length === 0) {
    console.log("No embedding records found. Run: npm run generate-embeddings");
    return;
  }
  candidates.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.strainSlug} (${c.imageType}) score=${c.score.toFixed(4)}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
