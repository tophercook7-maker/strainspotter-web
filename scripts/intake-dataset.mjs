import { mkdir, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, parse } from "node:path";

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data");
const INBOX_DIR = join(DATA_DIR, "inbox");
const REAL_DIR = join(DATA_DIR, "real");
const REJECTED_DIR = join(DATA_DIR, "rejected");
const EVAL_DIR = join(DATA_DIR, "eval");
const REVIEWED_DIR = join(DATA_DIR, "reviewed");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const LABEL_PATTERN = /^([^_]+)__([^_]+)__([0-9]+)\.(jpg|jpeg|png|webp)$/i;

function extnameLower(fileName) {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx).toLowerCase();
}

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(extnameLower(fileName));
}

function toStrainSlug(strainName) {
  return strainName
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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

async function ensureDatasetFolders() {
  await mkdir(INBOX_DIR, { recursive: true });
  await mkdir(REAL_DIR, { recursive: true });
  await mkdir(EVAL_DIR, { recursive: true });
  await mkdir(REJECTED_DIR, { recursive: true });
  await mkdir(REVIEWED_DIR, { recursive: true });
}

async function main() {
  await ensureDatasetFolders();

  const entries = await readdir(INBOX_DIR, { withFileTypes: true });
  const movedByStrain = new Map();
  const affectedSources = new Map();
  const renamedDuplicates = [];
  const skippedInvalid = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith(".")) continue;

    if (!isImageFile(entry.name)) {
      skippedInvalid.push(entry.name);
      continue;
    }

    const match = entry.name.match(LABEL_PATTERN);
    if (!match) {
      skippedInvalid.push(entry.name);
      continue;
    }

    const strainSlug = toStrainSlug(match[1]);
    const sourceLabel = match[2].trim().toLowerCase();
    const extension = extname(entry.name).toLowerCase();
    if (!strainSlug || !sourceLabel || !IMAGE_EXTENSIONS.has(extension)) {
      skippedInvalid.push(entry.name);
      continue;
    }

    const sourcePath = join(INBOX_DIR, entry.name);
    const strainDir = join(REAL_DIR, strainSlug);
    await mkdir(strainDir, { recursive: true });

    const destinationPath = await uniqueDestinationPath(strainDir, entry.name);
    if (destinationPath !== join(strainDir, entry.name)) {
      renamedDuplicates.push(`${strainSlug}/${entry.name}`);
    }

    await rename(sourcePath, destinationPath);

    movedByStrain.set(strainSlug, (movedByStrain.get(strainSlug) ?? 0) + 1);
    const sourceCounts = affectedSources.get(strainSlug) ?? new Map();
    sourceCounts.set(sourceLabel, (sourceCounts.get(sourceLabel) ?? 0) + 1);
    affectedSources.set(strainSlug, sourceCounts);
  }

  console.log("Dataset intake");
  console.log("==============");

  const movedCount = [...movedByStrain.values()].reduce((sum, count) => sum + count, 0);
  const skippedCount = skippedInvalid.length;

  console.log(`Files moved: ${movedCount}`);
  console.log(`Files skipped: ${skippedCount}`);

  if (movedByStrain.size === 0) {
    console.log("No new images moved from data/inbox.");
  } else {
    console.log("\nStrains affected:");
    for (const [strainSlug, count] of [...movedByStrain.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    )) {
      const sourceCounts = affectedSources.get(strainSlug) ?? new Map();
      const sources = [...sourceCounts.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([source, sourceCount]) => `${source}:${sourceCount}`)
        .join(", ");
      console.log(
        `- ${strainSlug}: ${count} image${count === 1 ? "" : "s"}${sources ? ` (${sources})` : ""}`
      );
    }
  }

  if (renamedDuplicates.length) {
    console.log("\nDuplicate filenames safely renamed:");
    for (const item of renamedDuplicates) console.log(`- ${item}`);
  }

  if (skippedInvalid.length) {
    console.log("\nSkipped invalid filenames:");
    for (const fileName of skippedInvalid) console.log(`- ${fileName}`);
    console.log("\nExpected format: <strain-slug>__<source>__<number>.jpg");
    console.log("Examples: blackberry__user__001.jpg, purple-afghan__reddit__014.webp");
  }
}

main().catch((error) => {
  console.error("Dataset intake failed:", error);
  process.exit(1);
});
