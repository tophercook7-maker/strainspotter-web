import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { DATA_PATHS } from "./data-paths.mjs";

const OUTPUT_PATH = DATA_PATHS.vaultIndexPath();
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || !process.argv[index + 1]) return null;
  return process.argv[index + 1];
}

function isHiddenName(name) {
  return name.startsWith(".");
}

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(extname(fileName).toLowerCase());
}

function toStrainSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function guessStrainSlug(filePath, fileName) {
  const parentGuess = toStrainSlug(basename(filePath));
  if (
    parentGuess &&
    !["buds", "bud", "packaging", "images", "photos", "dataset", "inbox"].includes(parentGuess)
  ) {
    return parentGuess;
  }

  const grandParentGuess = toStrainSlug(basename(dirname(filePath)));
  if (grandParentGuess && !["images", "photos", "dataset", "inbox"].includes(grandParentGuess)) {
    return grandParentGuess;
  }

  const base = basename(fileName, extname(fileName));
  const firstSegment = base.split("__")[0]?.split(/[-_ ]\d/)[0] ?? base;
  return toStrainSlug(firstSegment);
}

async function walkImages(rootDir) {
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

      if (!entry.isFile() || !isImageFile(entry.name)) continue;

      const info = await stat(fullPath);
      results.push({
        filePath: fullPath,
        fileName: entry.name,
        extension: extname(entry.name).toLowerCase(),
        size: info.size,
        modifiedAt: info.mtime.toISOString(),
        guessedStrainSlug: guessStrainSlug(currentDir, entry.name),
        source: "vault",
      });
    }
  }

  await walk(rootDir);
  return results.sort((a, b) => a.filePath.localeCompare(b.filePath));
}

async function main() {
  const rootArg = getArgValue("--root");
  if (!rootArg) {
    throw new Error('Usage: node scripts/index-vault-dataset.mjs --root "/Volumes/Vault/path/to/dataset"');
  }

  const vaultRoot = resolve(rootArg);
  if (!existsSync(vaultRoot)) {
    throw new Error(`Vault root does not exist: ${vaultRoot}`);
  }

  const items = await walkImages(vaultRoot);
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    root: vaultRoot,
    totalImages: items.length,
    items,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const strains = new Set(items.map((item) => item.guessedStrainSlug).filter(Boolean));
  console.log("Vault dataset index");
  console.log("===================");
  console.log(`Root: ${vaultRoot}`);
  console.log(`Images indexed: ${items.length}`);
  console.log(`Guessed strains: ${strains.size}`);
  console.log(`Manifest written: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("Vault dataset indexing failed:", error);
  process.exit(1);
});
