import { mkdir, readFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, parse } from "node:path";

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data");
const INBOX_DIR = join(DATA_DIR, "inbox");
const REAL_DIR = join(DATA_DIR, "real");
const EVAL_DIR = join(DATA_DIR, "eval");
const REJECTED_DIR = join(DATA_DIR, "rejected");
const REVIEWED_DIR = join(DATA_DIR, "reviewed");

function getManifestPath() {
  const index = process.argv.indexOf("--manifest");
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error("Usage: node scripts/review-dataset-manifest.mjs --manifest data/review-manifest.json");
  }
  return join(ROOT, process.argv[index + 1]);
}

function toStrainSlug(strainName) {
  return String(strainName ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureDatasetFolders() {
  await mkdir(INBOX_DIR, { recursive: true });
  await mkdir(REAL_DIR, { recursive: true });
  await mkdir(EVAL_DIR, { recursive: true });
  await mkdir(REJECTED_DIR, { recursive: true });
  await mkdir(REVIEWED_DIR, { recursive: true });
}

async function uniqueDestinationPath(directory, fileName) {
  let destinationPath = join(directory, fileName);
  if (!existsSync(destinationPath)) return destinationPath;

  const parsed = parse(fileName);
  let index = 1;
  do {
    destinationPath = join(directory, `${parsed.name}-dup-${index}${parsed.ext}`);
    index += 1;
  } while (existsSync(destinationPath));

  return destinationPath;
}

function destinationForItem(item) {
  if (item.approvedForTraining === true) {
    const strainSlug = toStrainSlug(item.strainSlug);
    if (!strainSlug) throw new Error(`Missing strainSlug for ${item.fileName}`);
    return join(REAL_DIR, strainSlug);
  }

  if (item.approvedForEval === true) {
    const strainSlug = toStrainSlug(item.strainSlug);
    if (!strainSlug) throw new Error(`Missing strainSlug for ${item.fileName}`);
    return join(EVAL_DIR, strainSlug);
  }

  return REJECTED_DIR;
}

async function main() {
  await ensureDatasetFolders();

  const manifestPath = getManifestPath();
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.items)) {
    throw new Error("Review manifest must include an items array");
  }

  const summary = {
    training: 0,
    eval: 0,
    rejected: 0,
    missing: 0,
  };
  const missing = [];

  for (const item of manifest.items) {
    const fileName = String(item.fileName ?? "");
    if (!fileName || fileName.includes("/") || fileName.includes("\\")) {
      console.warn(`Skipping invalid fileName in manifest: ${fileName}`);
      summary.missing += 1;
      missing.push(fileName || "(blank)");
      continue;
    }

    const sourcePath = join(INBOX_DIR, fileName);
    if (!existsSync(sourcePath)) {
      console.warn(`Missing inbox file: ${fileName}`);
      summary.missing += 1;
      missing.push(fileName);
      continue;
    }

    const destinationDir = destinationForItem(item);
    await mkdir(destinationDir, { recursive: true });
    const destinationPath = await uniqueDestinationPath(destinationDir, fileName);
    await rename(sourcePath, destinationPath);

    if (item.approvedForTraining === true) summary.training += 1;
    else if (item.approvedForEval === true) summary.eval += 1;
    else summary.rejected += 1;
  }

  console.log("Dataset review manifest");
  console.log("=======================");
  console.log(`Moved to training: ${summary.training}`);
  console.log(`Moved to eval: ${summary.eval}`);
  console.log(`Rejected: ${summary.rejected}`);
  console.log(`Missing: ${summary.missing}`);

  if (missing.length) {
    console.log("\nMissing files:");
    for (const fileName of missing) console.log(`- ${fileName}`);
  }
}

main().catch((error) => {
  console.error("Dataset review failed:", error);
  process.exit(1);
});
