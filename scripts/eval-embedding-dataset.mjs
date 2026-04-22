// scripts/eval-embedding-dataset.mjs
// Evaluate CLIP + nearest-strain retrieval against labeled folders under data/real/<strain>/

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { pipeline, RawImage } from "@xenova/transformers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

const MODEL_ID = "Xenova/clip-vit-base-patch32";
const DEFAULT_DATASET_JSON = "data/embeddings/strain-embeddings.json";
const DEFAULT_REAL_ROOT = "data/real";
const DEFAULT_REPORT = "data/embeddings/eval-report.json";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const BEST_IMAGE_SIM_WEIGHT = 0.7;
const AVERAGE_STRAIN_SIM_WEIGHT = 0.3;
const RETRIEVAL_TOP_K = 12;

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

function normStrainKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function clampSimilarity01(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = Number(a[i]) || 0;
    const bv = Number(b[i]) || 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function strainSimilarityToQuery(queryEmbedding, strain) {
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) return 0;
  const avgSim = cosineSimilarity(queryEmbedding, strain.averageEmbedding);
  const imgs = strain.images ?? [];
  let bestImageSim = -1;
  for (const img of imgs) {
    if (!Array.isArray(img.embedding) || img.embedding.length === 0) continue;
    if (img.embedding.length !== queryEmbedding.length) continue;
    const s = cosineSimilarity(queryEmbedding, img.embedding);
    if (s > bestImageSim) bestImageSim = s;
  }
  if (bestImageSim < 0) {
    return clampSimilarity01(avgSim);
  }
  return clampSimilarity01(
    BEST_IMAGE_SIM_WEIGHT * bestImageSim + AVERAGE_STRAIN_SIM_WEIGHT * avgSim
  );
}

function findNearestEmbeddedStrains(embedding, dataset, topK) {
  if (!Array.isArray(dataset?.strains)) return [];
  if (!Array.isArray(embedding) || embedding.length === 0) return [];
  return dataset.strains
    .map((strain) => ({
      strainName: strain.strainName,
      score: strainSimilarityToQuery(embedding, strain),
      imageCount: strain.imageCount,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK));
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

async function countDiskImagesByStrain(realRoot) {
  const map = new Map();
  let entries;
  try {
    entries = await readdir(realRoot, { withFileTypes: true });
  } catch {
    return map;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || isHiddenName(entry.name)) continue;
    const strainDir = join(realRoot, entry.name);
    const paths = await walkImagesForStrain(strainDir);
    map.set(normStrainKey(entry.name), {
      folderName: entry.name,
      count: paths.length,
      paths,
    });
  }
  return map;
}

const extractor = await pipeline("image-feature-extraction", MODEL_ID);

async function imagePathToRawImage(filePath) {
  const bytes = await readFile(filePath);
  const blob = new Blob([bytes]);
  return await RawImage.fromBlob(blob);
}

async function embedImageFile(filePath) {
  const rawImage = await imagePathToRawImage(filePath);
  const result = await extractor(rawImage, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(result.data);
}

async function main() {
  const datasetJsonPath = resolve(
    PROJECT_ROOT,
    getArgValue("--dataset-json", DEFAULT_DATASET_JSON)
  );
  const realRoot = resolve(PROJECT_ROOT, getArgValue("--real-root", DEFAULT_REAL_ROOT));
  const reportPath = resolve(PROJECT_ROOT, getArgValue("--report", DEFAULT_REPORT));

  let datasetRaw;
  try {
    datasetRaw = await readFile(datasetJsonPath, "utf8");
  } catch (e) {
    console.error(`Cannot read embedding dataset: ${datasetJsonPath}`, e.message);
    process.exit(1);
  }

  const dataset = JSON.parse(datasetRaw);
  if (!dataset.strains?.length) {
    console.error("Dataset has no strains — run build:embeddings first.");
    process.exit(1);
  }

  const strainKeyToJson = new Map();
  for (const s of dataset.strains) {
    strainKeyToJson.set(normStrainKey(s.strainName), s);
  }

  const diskByStrain = await countDiskImagesByStrain(realRoot);
  const inconsistentImageCounts = [];
  for (const s of dataset.strains) {
    const k = normStrainKey(s.strainName);
    const disk = diskByStrain.get(k);
    const diskCount = disk ? disk.count : 0;
    if (disk && disk.count !== s.imageCount) {
      inconsistentImageCounts.push({
        strain: s.strainName,
        jsonImageCount: s.imageCount,
        diskImageCount: disk.count,
      });
    }
    if (!disk && s.imageCount > 0) {
      inconsistentImageCounts.push({
        strain: s.strainName,
        jsonImageCount: s.imageCount,
        diskImageCount: 0,
        note: "folder missing or empty under data/real",
      });
    }
  }

  let under5 = 0;
  let under10 = 0;
  let under20 = 0;
  const fewImageStrains = [];
  for (const s of dataset.strains) {
    const n = s.imageCount ?? 0;
    if (n < 5) {
      under5 += 1;
      fewImageStrains.push({ strain: s.strainName, imageCount: n, band: "<5" });
    }
    if (n < 10) under10 += 1;
    if (n < 20) under20 += 1;
  }

  const perStrainStats = new Map();
  function ensureStrainStats(key, displayName) {
    if (!perStrainStats.has(key)) {
      perStrainStats.set(key, {
        strain: displayName,
        tested: 0,
        top1Correct: 0,
        top3Hits: 0,
      });
    }
    return perStrainStats.get(key);
  }

  const confusionCases = [];
  const pairCounts = new Map();

  function recordPair(expectedKey, predictedKey) {
    const p = `${expectedKey}→${predictedKey}`;
    pairCounts.set(p, (pairCounts.get(p) || 0) + 1);
  }

  let totalImages = 0;
  let top1Correct = 0;
  let top3Hits = 0;

  for (const [strainKey, { folderName, paths }] of diskByStrain) {
    if (!paths.length) continue;
    const jsonStrain = strainKeyToJson.get(strainKey);
    if (!jsonStrain) {
      console.warn(`Skipping disk folder not in JSON: ${folderName}`);
      continue;
    }

    for (const imagePath of paths) {
      let embedding;
      try {
        embedding = await embedImageFile(imagePath);
      } catch (err) {
        console.warn(`Skip (embed failed): ${imagePath}`, err?.message || err);
        continue;
      }

      const ranked = findNearestEmbeddedStrains(
        embedding,
        dataset,
        RETRIEVAL_TOP_K
      );
      if (!ranked.length) continue;

      totalImages += 1;
      const top1 = ranked[0];
      const top3 = ranked.slice(0, 3).map((r) => normStrainKey(r.strainName));
      const pred1Key = normStrainKey(top1.strainName);

      const st = ensureStrainStats(strainKey, folderName);
      st.tested += 1;

      const ok1 = pred1Key === strainKey;
      const ok3 = top3.includes(strainKey);

      if (ok1) {
        top1Correct += 1;
        st.top1Correct += 1;
      }
      if (ok3) {
        top3Hits += 1;
        st.top3Hits += 1;
      }

      if (!ok1) {
        confusionCases.push({
          expected: folderName,
          predictedTop1: top1.strainName,
          predictedScore: Math.round(top1.score * 1000) / 1000,
          inTop3: ok3,
          imageRelative: imagePath.replace(PROJECT_ROOT + "/", "").replace(/\\/g, "/"),
        });
        recordPair(strainKey, pred1Key);
      }
    }
  }

  const perStrain = Array.from(perStrainStats.values())
    .filter((s) => s.tested > 0)
    .map((s) => ({
      strain: s.strain,
      imagesTested: s.tested,
      top1Accuracy: Math.round((s.top1Correct / s.tested) * 10000) / 10000,
      top3HitRate: Math.round((s.top3Hits / s.tested) * 10000) / 10000,
      correctTop1: s.top1Correct,
      top3Hits: s.top3Hits,
    }))
    .sort((a, b) => a.strain.localeCompare(b.strain));

  const weakestStrains = [...perStrain]
    .filter((s) => s.imagesTested >= 2)
    .sort((a, b) => a.top1Accuracy - b.top1Accuracy)
    .slice(0, 20);

  const frequentlyConfusedPairs = Array.from(pairCounts.entries())
    .map(([key, count]) => {
      const [from, to] = key.split("→");
      return {
        expectedKey: from,
        predictedKey: to,
        count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  const confusionStrainCounts = new Map();
  for (const c of confusionCases) {
    const k = normStrainKey(c.expected);
    confusionStrainCounts.set(k, (confusionStrainCounts.get(k) || 0) + 1);
  }
  const strainsOftenConfused = Array.from(confusionStrainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([key, count]) => ({
      strain: diskByStrain.get(key)?.folderName || key,
      misclassifiedImages: count,
    }));

  const top1Accuracy =
    totalImages > 0 ? Math.round((top1Correct / totalImages) * 10000) / 10000 : 0;
  const top3HitRate =
    totalImages > 0 ? Math.round((top3Hits / totalImages) * 10000) / 10000 : 0;

  const recommendations = [];
  if (under5 > 0) {
    recommendations.push(
      `${under5} strains have fewer than 5 images in the JSON — add more angles/lighting per cultivar.`
    );
  }
  if (inconsistentImageCounts.length > 0) {
    recommendations.push(
      `Resync disk vs JSON: ${inconsistentImageCounts.length} strains have mismatched image counts — rebuild the embedding artifact after fixing folders.`
    );
  }
  if (frequentlyConfusedPairs.length > 0) {
    recommendations.push(
      "Review top confused pairs in frequentlyConfusedPairs — consider more discriminative photos or merging visually indistinguishable labels."
    );
  }
  if (totalImages === 0) {
    recommendations.push(
      "No labeled images evaluated — ensure data/real/<strain>/ contains images and matches strain-embeddings.json."
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    model: MODEL_ID,
    datasetJsonPath: datasetJsonPath.replace(PROJECT_ROOT + "/", ""),
    realRoot: realRoot.replace(PROJECT_ROOT + "/", ""),
    retrievalTopK: RETRIEVAL_TOP_K,
    totals: {
      imagesTested: totalImages,
      top1Correct,
      top3Hits,
      top1Accuracy,
      top3HitRate,
    },
    datasetQuality: {
      strainCount: dataset.strains.length,
      strainsUnder5Images: under5,
      strainsUnder10Images: under10,
      strainsUnder20Images: under20,
      fewImageStrains: fewImageStrains.slice(0, 50),
      inconsistentImageCounts,
    },
    perStrain,
    weakestStrains,
    confusion: {
      casesSampled: confusionCases.length,
      cases: confusionCases.slice(0, 200),
      frequentlyConfusedPairs,
      strainsWithMostConfusions: strainsOftenConfused,
    },
    recommendations,
  };

  await mkdir(join(reportPath, ".."), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n=== Embedding dataset eval ===\n");
  console.log(`Dataset: ${datasetJsonPath}`);
  console.log(`Labeled images: ${realRoot}`);
  console.log(`Images tested: ${totalImages}`);
  console.log(`Top-1 accuracy: ${(top1Accuracy * 100).toFixed(2)}%`);
  console.log(`Top-3 hit rate: ${(top3HitRate * 100).toFixed(2)}%`);
  console.log(`Strains <5 / <10 / <20 images: ${under5} / ${under10} / ${under20}`);
  console.log(`JSON vs disk count mismatches: ${inconsistentImageCounts.length}`);
  console.log(`Confusion cases (sample): ${Math.min(10, confusionCases.length)} shown in console`);
  confusionCases.slice(0, 10).forEach((c) => {
    console.log(
      `  expected=${c.expected} predicted=${c.predictedTop1} top3=${c.inTop3} file=${c.imageRelative}`
    );
  });
  console.log(`\nFull report: ${reportPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
