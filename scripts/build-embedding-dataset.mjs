// scripts/build-embedding-dataset.mjs

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve, extname, basename } from "node:path";
import { pipeline, RawImage } from "@xenova/transformers";

const MODEL_ID = "Xenova/clip-vit-base-patch32";
const DEFAULT_DATASET_ROOT = "data/real";
const DEFAULT_OUTPUT_PATH = "data/embeddings/strain-embeddings.json";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function getArgValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function isHiddenName(name) {
  return name.startsWith(".");
}

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(extname(fileName).toLowerCase());
}

async function walkImagesForStrain(strainDir) {
  const results = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (isHiddenName(entry.name)) continue;

      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && isImageFile(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  await walk(strainDir);
  return results;
}

function averageEmbeddings(vectors) {
  if (!vectors.length) return [];

  const length = vectors[0].length;
  const sums = new Array(length).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < length; i += 1) {
      sums[i] += Number(vector[i]) || 0;
    }
  }

  return sums.map((value) => value / vectors.length);
}

function roundEmbedding(vec) {
  return vec.map((x) => Math.round((Number(x) || 0) * 1e6) / 1e6);
}

const extractor = await pipeline("image-feature-extraction", MODEL_ID);

async function imagePathToRawImage(filePath) {
  const bytes = await readFile(filePath);
  const blob = new Blob([bytes]);
  return await RawImage.fromBlob(blob);
}

async function build() {
  const datasetRoot = resolve(getArgValue("--dataset-root", DEFAULT_DATASET_ROOT));
  const outputPath = resolve(getArgValue("--output", DEFAULT_OUTPUT_PATH));

  const strainEntries = await readdir(datasetRoot, { withFileTypes: true });
  const strains = [];

  for (const entry of strainEntries) {
    if (!entry.isDirectory()) continue;
    if (isHiddenName(entry.name)) continue;

    const strainName = basename(entry.name);
    const strainDir = join(datasetRoot, entry.name);

    const imagePaths = await walkImagesForStrain(strainDir);
    if (!imagePaths.length) {
      console.warn(`Skipping empty strain folder: ${strainName}`);
      continue;
    }

    console.log(`Embedding strain: ${strainName} (${imagePaths.length} images)`);

    const embeddedImages = [];

    for (const imagePath of imagePaths) {
      try {
        const rawImage = await imagePathToRawImage(imagePath);
        const result = await extractor(rawImage, {
          pooling: "mean",
          normalize: true,
        });

        const embedding = Array.from(result.data);
        embeddedImages.push({
          path: relative(process.cwd(), imagePath).replace(/\\/g, "/"),
          embedding: roundEmbedding(embedding),
        });
      } catch (error) {
        console.warn(`Failed embedding for ${imagePath}:`, error);
      }
    }

    if (!embeddedImages.length) {
      console.warn(`Skipping strain with no successful embeddings: ${strainName}`);
      continue;
    }

    const averageEmbedding = roundEmbedding(
      averageEmbeddings(embeddedImages.map((item) => item.embedding))
    );

    strains.push({
      strainName,
      imageCount: embeddedImages.length,
      averageEmbedding,
      images: embeddedImages,
    });
  }

  const artifact = {
    version: 1,
    model: MODEL_ID,
    createdAt: new Date().toISOString(),
    datasetRoot: relative(process.cwd(), datasetRoot).replace(/\\/g, "/"),
    strains,
  };

  await mkdir(join(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, JSON.stringify(artifact, null, 2), "utf8");

  console.log(`Wrote embedding dataset: ${outputPath}`);
  console.log(`Strains embedded: ${strains.length}`);
}

build().catch((error) => {
  console.error("Failed to build embedding dataset:", error);
  process.exit(1);
});
