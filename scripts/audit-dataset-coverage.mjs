import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data");
const REAL_DIR = join(DATA_DIR, "real");
const EVAL_DIR = join(DATA_DIR, "eval");
const TARGETS_PATH = join(DATA_DIR, "strain-targets.json");
const REPORT_PATH = join(DATA_DIR, "dataset-coverage-report.json");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function extnameLower(fileName) {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx).toLowerCase();
}

function isHiddenName(name) {
  return name.startsWith(".");
}

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(extnameLower(fileName));
}

async function listDirs(baseDir) {
  if (!existsSync(baseDir)) return [];
  const entries = await readdir(baseDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !isHiddenName(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function countImagesRecursive(dir) {
  if (!existsSync(dir)) return 0;

  let total = 0;
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (isHiddenName(entry.name)) continue;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      total += await countImagesRecursive(fullPath);
      continue;
    }

    if (!entry.isFile() || !isImageFile(entry.name)) continue;

    const info = await stat(fullPath);
    if (info.size > 0) total += 1;
  }

  return total;
}

async function countImagesByStrain(baseDir) {
  const counts = {};
  for (const slug of await listDirs(baseDir)) {
    counts[slug] = await countImagesRecursive(join(baseDir, slug));
  }
  return counts;
}

async function readTargets() {
  if (!existsSync(TARGETS_PATH)) return [];
  const rawTargets = JSON.parse(await readFile(TARGETS_PATH, "utf8"));
  if (!Array.isArray(rawTargets)) {
    throw new Error("data/strain-targets.json must be an array");
  }

  return rawTargets.map((target) => ({
    slug: String(target.slug),
    displayName: String(target.displayName ?? target.slug),
    priority: Number(target.priority ?? 1),
    targetTrainingImages: Number(target.targetTrainingImages ?? 25),
    targetEvalImages: Number(target.targetEvalImages ?? 5),
    cluster: String(target.cluster ?? "uncategorized"),
    notes: String(target.notes ?? ""),
  }));
}

function topByCoverage(rows, direction) {
  return [...rows]
    .sort((a, b) => {
      const delta =
        direction === "desc"
          ? b.trainingImages - a.trainingImages
          : a.trainingImages - b.trainingImages;
      return delta || a.slug.localeCompare(b.slug);
    })
    .slice(0, 10)
    .map((row) => ({
      slug: row.slug,
      trainingImages: row.trainingImages,
      evalImages: row.evalImages,
      targetTrainingImages: row.targetTrainingImages,
      targetEvalImages: row.targetEvalImages,
    }));
}

async function main() {
  const targets = await readTargets();
  const targetBySlug = new Map(targets.map((target) => [target.slug, target]));
  const trainCounts = await countImagesByStrain(REAL_DIR);
  const evalCounts = await countImagesByStrain(EVAL_DIR);

  const allSlugs = Array.from(
    new Set([
      ...targets.map((target) => target.slug),
      ...Object.keys(trainCounts),
      ...Object.keys(evalCounts),
    ])
  ).sort((a, b) => a.localeCompare(b));

  const byStrain = allSlugs.map((slug) => {
    const target = targetBySlug.get(slug) ?? null;
    const trainingImages = trainCounts[slug] ?? 0;
    const evalImages = evalCounts[slug] ?? 0;
    return {
      slug,
      displayName: target?.displayName ?? slug,
      priority: target?.priority ?? null,
      cluster: target?.cluster ?? null,
      targetTrainingImages: target?.targetTrainingImages ?? null,
      targetEvalImages: target?.targetEvalImages ?? null,
      trainingImages,
      evalImages,
      hasTrainingData: trainingImages > 0,
      hasEvalData: evalImages > 0,
      below5TrainingImages: trainingImages < 5,
      below10TrainingImages: trainingImages < 10,
      below25TrainingImages: trainingImages < 25,
      belowTrainingTarget:
        target?.targetTrainingImages != null
          ? trainingImages < target.targetTrainingImages
          : null,
      belowEvalTarget:
        target?.targetEvalImages != null
          ? evalImages < target.targetEvalImages
          : null,
    };
  });

  const trainingRows = byStrain.filter((row) => row.trainingImages > 0);
  const totalTrainingImages = byStrain.reduce(
    (sum, row) => sum + row.trainingImages,
    0
  );
  const totalEvalImages = byStrain.reduce((sum, row) => sum + row.evalImages, 0);

  const strainsWithFewerThan5Images = byStrain.filter(
    (row) => row.trainingImages < 5
  );
  const strainsWithFewerThan10Images = byStrain.filter(
    (row) => row.trainingImages < 10
  );
  const strainsWithFewerThan25Images = byStrain.filter(
    (row) => row.trainingImages < 25
  );
  const strainsMissingEvalData = byStrain.filter((row) => row.evalImages === 0);
  const targetStrainsMissingTrainingData = targets
    .filter((target) => (trainCounts[target.slug] ?? 0) === 0)
    .map((target) => target.slug);

  const top10BestCoveredStrains = topByCoverage(byStrain, "desc");
  const top10WeakestStrains = topByCoverage(byStrain, "asc");

  const report = {
    generatedAt: new Date().toISOString(),
    imageExtensions: Array.from(IMAGE_EXTENSIONS).sort(),
    targetCount: targets.length,
    totalTrainingStrains: trainingRows.length,
    totalTrainingImages,
    totalEvalImages,
    targetStrainsMissingTrainingData,
    strainsWithFewerThan5Images: strainsWithFewerThan5Images.map((row) => ({
      slug: row.slug,
      trainingImages: row.trainingImages,
    })),
    strainsWithFewerThan10Images: strainsWithFewerThan10Images.map((row) => ({
      slug: row.slug,
      trainingImages: row.trainingImages,
    })),
    strainsWithFewerThan25Images: strainsWithFewerThan25Images.map((row) => ({
      slug: row.slug,
      trainingImages: row.trainingImages,
    })),
    strainsMissingEvalData: strainsMissingEvalData.map((row) => row.slug),
    top10BestCoveredStrains,
    top10WeakestStrains,
    byStrain,
  };

  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log("Scanner dataset coverage");
  console.log("========================");
  console.log(`Target strains: ${targets.length}`);
  console.log(`Training strains: ${trainingRows.length}`);
  console.log(`Training images: ${totalTrainingImages}`);
  console.log(`Eval images: ${totalEvalImages}`);
  console.log(`Fewer than 5 training images: ${strainsWithFewerThan5Images.length}`);
  console.log(`Fewer than 10 training images: ${strainsWithFewerThan10Images.length}`);
  console.log(`Fewer than 25 training images: ${strainsWithFewerThan25Images.length}`);
  console.log(`Missing eval data: ${strainsMissingEvalData.length}`);
  console.log(`Report written: data/dataset-coverage-report.json`);

  if (top10BestCoveredStrains.length) {
    console.log("\nTop 10 best-covered strains:");
    for (const row of top10BestCoveredStrains) {
      console.log(`- ${row.slug}: ${row.trainingImages} train, ${row.evalImages} eval`);
    }
  }

  if (top10WeakestStrains.length) {
    console.log("\nTop 10 weakest strains:");
    for (const row of top10WeakestStrains) {
      console.log(`- ${row.slug}: ${row.trainingImages} train, ${row.evalImages} eval`);
    }
  }
}

main().catch((error) => {
  console.error("Dataset coverage audit failed:", error);
  process.exit(1);
});
