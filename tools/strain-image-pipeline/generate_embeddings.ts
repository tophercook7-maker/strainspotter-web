#!/usr/bin/env node
/**
 * Generate embeddings for approved strain reference images.
 * Stores embedding records under embeddings/image_vectors/ with a manifest.
 * Supports mock mode (default) for end-to-end testing without an API.
 */

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, basename } from "path";
import { createHash } from "crypto";
import { CONFIG, PATHS } from "./config.js";
import type { ApprovedImageMetadata } from "./promote_approved.js";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const EMBEDDING_DIM = 384;
const MOCK_MODEL = "mock/0.1-deterministic";

export interface EmbeddingRecord {
  imageId: string;
  imagePath: string;
  strainSlug: string;
  strainName?: string;
  imageType: string;
  sourceUrl?: string;
  qualityScore?: number;
  approvalTimestamp?: string;
  embeddingModel: string;
  embeddingGeneratedAt: string;
  vector: number[];
}

export interface EmbeddingManifest {
  generatedAt: string;
  model: string;
  mode: "mock" | "real";
  entries: Array<{
    imageId: string;
    imagePath: string;
    strainSlug: string;
    imageType: string;
    embeddingFile: string;
    generatedAt: string;
  }>;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function mockEmbedding(imagePath: string): number[] {
  const hash = createHash("sha256").update(imagePath).digest("hex");
  const vector: number[] = [];
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const slice = hash.slice((i * 2) % 64, ((i * 2) % 64) + 4) || "0000";
    const val = parseInt(slice, 16) / 65535;
    vector.push(val * 2 - 1);
  }
  return vector;
}

async function scanApprovedImages(): Promise<Array<{ imagePath: string; metaPath: string }>> {
  const base = join(CONFIG.VAULT_ROOT, "approved", "strain_reference_images");
  const results: Array<{ imagePath: string; metaPath: string }> = [];

  let types: string[];
  try {
    types = await readdir(base);
  } catch {
    return [];
  }

  for (const imageType of types) {
    const typeDir = join(base, imageType);
    let strains: string[];
    try {
      strains = await readdir(typeDir);
    } catch {
      continue;
    }

    for (const strainSlug of strains) {
      const strainDir = join(typeDir, strainSlug);
      let files: string[];
      try {
        files = await readdir(strainDir);
      } catch {
        continue;
      }

      for (const f of files) {
        const ext = extOf(f);
        if (!IMAGE_EXTENSIONS.includes(ext)) continue;

        const imagePath = join(strainDir, f);
        const baseName = f.replace(/\.[^.]+$/, "");
        const metaPath = join(strainDir, `${baseName}.metadata.json`);
        results.push({ imagePath, metaPath });
      }
    }
  }

  return results;
}

async function loadManifest(): Promise<EmbeddingManifest> {
  try {
    const raw = await readFile(PATHS.embeddingManifest, "utf-8");
    return JSON.parse(raw) as EmbeddingManifest;
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      model: MOCK_MODEL,
      mode: "mock",
      entries: [],
    };
  }
}

function imageId(imagePath: string): string {
  return basename(imagePath).replace(/\.[^.]+$/, "");
}

export async function runGenerateEmbeddings(options?: {
  force?: boolean;
  mock?: boolean;
}): Promise<{ embedded: number; skipped: number; errors: string[] }> {
  const force = options?.force ?? process.env.FORCE_EMBEDDINGS === "1";
  const useMock = options?.mock ?? process.env.EMBEDDING_MODE !== "real";

  const images = await scanApprovedImages();
  const manifest = await loadManifest();
  const embeddedPaths = new Set(manifest.entries.map((e) => e.imagePath));

  await mkdir(PATHS.embeddingVectors, { recursive: true });

  let embedded = 0;
  let skipped = 0;
  const errors: string[] = [];
  const newEntries: EmbeddingManifest["entries"] = [];

  for (const { imagePath, metaPath } of images) {
    const id = imageId(imagePath);
    if (!force && embeddedPaths.has(imagePath)) {
      skipped++;
      continue;
    }

    let meta: Partial<ApprovedImageMetadata> = {};
    try {
      meta = JSON.parse(await readFile(metaPath, "utf-8")) as ApprovedImageMetadata;
    } catch {
      meta = { strainSlug: "unknown", imageType: "bud", imagePath };
    }

    const vector = mockEmbedding(imagePath);
    const record: EmbeddingRecord = {
      imageId: id,
      imagePath,
      strainSlug: meta.strainSlug ?? "unknown",
      strainName: meta.strainName,
      imageType: meta.imageType ?? "bud",
      sourceUrl: meta.sourceUrl,
      qualityScore: meta.qualityScore,
      approvalTimestamp: meta.approvalTimestamp,
      embeddingModel: MOCK_MODEL,
      embeddingGeneratedAt: new Date().toISOString(),
      vector,
    };

    const recordPath = join(PATHS.embeddingVectors, `${id}.embedding.json`);
    try {
      await writeFile(recordPath, JSON.stringify(record, null, 2), "utf-8");
    } catch (e) {
      errors.push(`Failed to write ${id}: ${String(e)}`);
      continue;
    }

    embedded++;
    embeddedPaths.add(imagePath);
    newEntries.push({
      imageId: id,
      imagePath,
      strainSlug: record.strainSlug,
      imageType: record.imageType,
      embeddingFile: recordPath,
      generatedAt: record.embeddingGeneratedAt,
    });
  }

  manifest.entries = [
    ...manifest.entries.filter((e) => !newEntries.some((n) => n.imagePath === e.imagePath)),
    ...newEntries,
  ];
  manifest.generatedAt = new Date().toISOString();
  manifest.model = MOCK_MODEL;
  manifest.mode = useMock ? "mock" : "real";

  await writeFile(PATHS.embeddingManifest, JSON.stringify(manifest, null, 2), "utf-8");

  return { embedded, skipped, errors };
}

async function main() {
  const result = await runGenerateEmbeddings();
  console.log(`[GenerateEmbeddings] embedded=${result.embedded} skipped=${result.skipped} mode=mock`);
  if (result.errors.length > 0) {
    result.errors.forEach((e) => console.error(e));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
