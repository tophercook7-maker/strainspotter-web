import { copyFile, mkdir, readFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { isAbsolute, join, parse } from "node:path";
import { DATA_PATHS, PROJECT_ROOT } from "./data-paths.mjs";

const INBOX_DIR = DATA_PATHS.inboxDir();
const REAL_DIR = DATA_PATHS.realDir();
const EVAL_DIR = DATA_PATHS.evalDir();
const REJECTED_DIR = DATA_PATHS.rejectedDir();
const GLOSSY_DIR = DATA_PATHS.glossyDir();
const REVIEWED_DIR = DATA_PATHS.reviewedDir();
const VAULT_INDEX_PATH = DATA_PATHS.vaultIndexPath();
const GLOSSY_REJECT_REASONS = new Set([
  "glossy catalog image",
  "studio lighting",
  "overprocessed / filtered",
  "generic frosty stock photo",
]);

function getManifestPath() {
  const index = process.argv.indexOf("--manifest");
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error("Usage: node scripts/review-dataset-manifest.mjs --manifest data/review-manifest.json");
  }
  const value = process.argv[index + 1];
  if (isAbsolute(value)) return value;
  if (value.startsWith("data/")) return join(DATA_PATHS.dataRoot(), value.replace(/^data\//, ""));
  return join(PROJECT_ROOT, value);
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
  await mkdir(GLOSSY_DIR, { recursive: true });
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

async function readVaultIndex() {
  if (!existsSync(VAULT_INDEX_PATH)) return new Map();
  const index = JSON.parse(await readFile(VAULT_INDEX_PATH, "utf8"));
  const rows = Array.isArray(index.items) ? index.items : [];
  return new Map(rows.map((item) => [item.filePath, item]));
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

  if (GLOSSY_REJECT_REASONS.has(String(item.rejectReason ?? "").toLowerCase())) {
    return GLOSSY_DIR;
  }

  return REJECTED_DIR;
}

function safeFileName(fileName) {
  return String(fileName ?? "")
    .replace(/[\\/]/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  await ensureDatasetFolders();

  const manifestPath = getManifestPath();
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.items)) {
    throw new Error("Review manifest must include an items array");
  }
  const vaultIndex = await readVaultIndex();

  const summary = {
    training: 0,
    eval: 0,
    rejected: 0,
    glossy: 0,
    missing: 0,
  };
  const missing = [];

  for (const item of manifest.items) {
    const rawFileName = String(item.fileName ?? "");
    const fileName = safeFileName(rawFileName);
    if (!fileName || fileName.includes("/") || fileName.includes("\\")) {
      console.warn(`Skipping invalid fileName in manifest: ${rawFileName}`);
      summary.missing += 1;
      missing.push(rawFileName || "(blank)");
      continue;
    }

    const vaultPath = typeof item.filePath === "string" ? item.filePath : null;
    const indexEntry = vaultPath ? vaultIndex.get(vaultPath) : null;
    const sourcePath = vaultPath && (indexEntry || existsSync(vaultPath)) ? vaultPath : join(INBOX_DIR, fileName);
    if (!existsSync(sourcePath)) {
      console.warn(`Missing source file: ${sourcePath}`);
      summary.missing += 1;
      missing.push(fileName);
      continue;
    }

    const destinationDir = destinationForItem(item);
    await mkdir(destinationDir, { recursive: true });
    const destinationPath = await uniqueDestinationPath(destinationDir, fileName);
    if (vaultPath) {
      await copyFile(sourcePath, destinationPath);
    } else {
      await rename(sourcePath, destinationPath);
    }

    if (item.approvedForTraining === true) summary.training += 1;
    else if (item.approvedForEval === true) summary.eval += 1;
    else if (destinationDir === GLOSSY_DIR) summary.glossy += 1;
    else summary.rejected += 1;
  }

  console.log("Dataset review manifest");
  console.log("=======================");
  console.log(`Moved to training: ${summary.training}`);
  console.log(`Moved to eval: ${summary.eval}`);
  console.log(`Moved to glossy quarantine: ${summary.glossy}`);
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
