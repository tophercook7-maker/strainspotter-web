#!/usr/bin/env npx tsx
/**
 * Build an index of strain image folders under StrainSpotter/datasets.
 * Scans /Volumes/TheVault/StrainSpotter/datasets for {Display Name|slug}/real/*.jpg
 *
 * Outputs:
 *   - image_folder_index.json (structured index)
 *   - image_index_summary.json (counts and distribution)
 *
 * Usage:
 *   npm run master-list:build-image-index
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAULT_ROOT =
  process.env.VAULT_ROOT ??
  (existsSync("/Volumes/TheVault/strainspotter-vault")
    ? "/Volumes/TheVault/strainspotter-vault"
    : join(__dirname, "../../vault-output"));

const MASTER_LIST_DIR = join(VAULT_ROOT, "master_list");
const DATASETS_ROOT =
  process.env.STRAINSPOTTER_DATASETS ?? "/Volumes/TheVault/StrainSpotter/datasets";

interface ImageFolderEntry {
  folderKey: string;
  displayName: string;
  slug: string;
  imageCount: number;
  examplePaths: string[];
}

function parseFolderName(folderName: string): { displayName: string; slug: string } {
  const parts = folderName.split("|");
  if (parts.length >= 2) {
    return {
      displayName: parts.slice(0, -1).join("|").trim(),
      slug: parts[parts.length - 1]!.trim(),
    };
  }
  return { displayName: folderName, slug: folderName.toLowerCase().replace(/\s+/g, "-") };
}

function countImages(realPath: string): { count: number; examples: string[] } {
  if (!existsSync(realPath)) return { count: 0, examples: [] };
  const files = readdirSync(realPath);
  const images = files.filter(
    (f) =>
      f.endsWith(".jpg") ||
      f.endsWith(".jpeg") ||
      f.endsWith(".png") ||
      f.endsWith(".webp")
  );
  const examples = images.slice(0, 3).map((f) => join(realPath, f));
  return { count: images.length, examples };
}

function main() {
  if (!existsSync(DATASETS_ROOT)) {
    console.error(`Datasets root not found: ${DATASETS_ROOT}`);
    process.exit(1);
  }

  const entries: ImageFolderEntry[] = [];
  const folders = readdirSync(DATASETS_ROOT, { withFileTypes: true }).filter((d) =>
    d.isDirectory()
  );

  for (const folder of folders) {
    const realPath = join(DATASETS_ROOT, folder.name, "real");
    const { count, examples } = countImages(realPath);
    const { displayName, slug } = parseFolderName(folder.name);
    entries.push({
      folderKey: folder.name,
      displayName,
      slug,
      imageCount: count,
      examplePaths: examples,
    });
  }

  const indexPath = join(MASTER_LIST_DIR, "image_folder_index.json");
  const summaryPath = join(MASTER_LIST_DIR, "image_index_summary.json");

  mkdirSync(MASTER_LIST_DIR, { recursive: true });
  writeFileSync(indexPath, JSON.stringify(entries, null, 2));

  const withImages = entries.filter((e) => e.imageCount > 0);
  const withoutImages = entries.filter((e) => e.imageCount === 0);
  const totalImages = entries.reduce((s, e) => s + e.imageCount, 0);

  const distribution: Record<string, number> = {};
  for (const e of withImages) {
    const bucket = e.imageCount <= 5 ? "1-5" : e.imageCount <= 20 ? "6-20" : "21+";
    distribution[bucket] = (distribution[bucket] ?? 0) + 1;
  }

  const summary = {
    generated_at: new Date().toISOString(),
    datasets_root: DATASETS_ROOT,
    total_strain_folders: entries.length,
    strains_with_images: withImages.length,
    strains_without_images: withoutImages.length,
    total_images: totalImages,
    image_count_distribution: distribution,
  };

  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`Wrote ${indexPath} (${entries.length} strain folders)`);
  console.log(`Wrote ${summaryPath}`);
  console.log(`  With images: ${withImages.length}, without: ${withoutImages.length}`);
  console.log(`  Total images: ${totalImages}`);
}

main();
