#!/usr/bin/env node
/**
 * Offline CLIP embedding builder for labeled strain image folders.
 *
 * Usage:
 *   node scripts/build-embedding-dataset.mjs
 *   node scripts/build-embedding-dataset.mjs --dataset-root data/real --output data/embeddings/strain-embeddings.json
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { cwd } from "node:process";
import { pipeline, RawImage } from "@xenova/transformers";

const MODEL_ID = "Xenova/clip-vit-base-patch32";
const VERSION = 1;
const EMBEDDING_DECIMALS = 6;

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parseArgs() {
  const args = process.argv.slice(2);
  let datasetRoot = "data/real";
  let outputFile = "data/embeddings/strain-embeddings.json";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dataset-root" && args[i + 1]) {
      datasetRoot = args[++i];
    } else if (args[i] === "--output" && args[i + 1]) {
      outputFile = args[++i];
    }
  }
  return { datasetRoot, outputFile };
}

function isImageFile(fileName) {
  return IMAGE_EXTS.has(extname(fileName).toLowerCase());
}

/**
 * Recursively list image paths under a single strain folder (skips hidden entries).
 */
async function walkImagesForStrain(strainDir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(strainDir, { withFileTypes: true });
  } catch (e) {
    console.warn(`Cannot read directory ${strainDir}:`, e?.message ?? e);
    return out;
  }
  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;
    const full = join(strainDir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await walkImagesForStrain(full)));
    } else if (ent.isFile() && isImageFile(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

function averageEmbeddings(vectors) {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const sum = new Float64Array(dim);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  const n = vectors.length;
  return Array.from(sum, (s) => s / n);
}

function roundEmbedding(vec) {
  const f = 10 ** EMBEDDING_DECIMALS;
  return vec.map((x) => Math.round(Number(x) * f) / f);
}

async function listStrainFolders(datasetRootAbs) {
  let entries;
  try {
    entries = await readdir(datasetRootAbs, { withFileTypes: true });
  } catch (e) {
    console.error(`Dataset root not found or unreadable: ${datasetRootAbs}`);
    console.error(e?.message ?? e);
    process.exit(1);
  }
  const strains = [];
  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith(".")) continue;
    strains.push({
      slug: ent.name,
      path: join(datasetRootAbs, ent.name),
    });
  }
  return strains;
}

function toPosixRel(fromCwd, absPath) {
  return relative(fromCwd, absPath).split("\\").join("/");
}

async function main() {
  const { datasetRoot, outputFile } = parseArgs();
  const root = cwd();
  const datasetRootAbs = resolve(root, datasetRoot);
  const outputAbs = resolve(root, outputFile);

  console.log(`Dataset root (absolute): ${datasetRootAbs}`);
  console.log(`Output file: ${outputAbs}`);
  console.log(`Model: ${MODEL_ID}`);
  console.log("Loading pipeline (first run may download weights)...");

  const extractor = await pipeline("image-feature-extraction", MODEL_ID);

  const strainFolders = await listStrainFolders(datasetRootAbs);
  const strainsOut = [];

  for (const { slug, path: strainPath } of strainFolders) {
    const imagePaths = await walkImagesForStrain(strainPath);
    if (imagePaths.length === 0) {
      console.log(`[skip] empty strain folder: ${slug}`);
      continue;
    }

    console.log(`[strain] ${slug} — ${imagePaths.length} image(s) found`);

    const okEmbeddings = [];
    const imageRows = [];

    for (const imgPath of imagePaths) {
      try {
        const bytes = await readFile(imgPath);
        const image = await RawImage.fromBlob(new Blob([bytes]));
        const result = await extractor(image, {
          pooling: "mean",
          normalize: true,
        });
        const embedding = Array.from(result.data);
        okEmbeddings.push(embedding);
        imageRows.push({
          path: toPosixRel(root, imgPath),
          embedding,
        });
      } catch (err) {
        console.warn(
          `  [warn] skip ${toPosixRel(root, imgPath)}:`,
          err?.message ?? err
        );
      }
    }

    if (okEmbeddings.length === 0) {
      console.log(`[skip] ${slug} — all images failed`);
      continue;
    }

    const avgRaw = averageEmbeddings(okEmbeddings);

    strainsOut.push({
      strainName: slug,
      imageCount: okEmbeddings.length,
      averageEmbedding: roundEmbedding(avgRaw),
      images: imageRows.map((row) => ({
        path: row.path,
        embedding: roundEmbedding(row.embedding),
      })),
    });

    console.log(`  [ok] ${slug} — ${okEmbeddings.length} embedding(s) written`);
  }

  const datasetRootRel =
    toPosixRel(root, datasetRootAbs) || datasetRoot.replace(/\\/g, "/");

  const artifact = {
    version: VERSION,
    model: MODEL_ID,
    createdAt: new Date().toISOString(),
    datasetRoot: datasetRootRel,
    strains: strainsOut,
  };

  await mkdir(dirname(outputAbs), { recursive: true });
  await writeFile(outputAbs, JSON.stringify(artifact, null, 2), "utf8");

  console.log(`\nWrote ${strainsOut.length} strain(s) to ${toPosixRel(root, outputAbs)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
