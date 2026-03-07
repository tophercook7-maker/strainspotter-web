/**
 * Review Queue Output — write candidate images and metadata to review_queue for human approval.
 */

import { mkdir, readdir, readFile, copyFile, writeFile } from "fs/promises";
import { join, basename } from "path";
import { CONFIG, PATHS, slugify } from "./config.js";

export interface ReviewCandidate {
  strainSlug: string;
  imagePath: string;
  imageType?: string;
  qualityScore?: number;
  sourceUrl?: string;
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

/**
 * Write candidates to review queue from staging. Copies images and writes manifest.
 */
export async function writeToReviewQueue(
  strainNames: string[]
): Promise<number> {
  const imagesDir = join(CONFIG.VAULT_ROOT, "review_queue", "images");
  await mkdir(imagesDir, { recursive: true });

  const candidates: ReviewCandidate[] = [];
  let copied = 0;

  for (const name of strainNames) {
    const dir = PATHS.candidateImages(name);
    let entries: { name: string }[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    const slug = slugify(name);
    for (const e of entries) {
      if (!e.isFile() || !IMAGE_EXTENSIONS.includes(extOf(e.name))) continue;

      const srcPath = join(dir, e.name);
      const metaPath = srcPath.replace(/\.[^.]+$/, ".meta.json");

      let meta: { source_url?: string; image_type?: string; quality_score?: number } = {};
      try {
        meta = JSON.parse(await readFile(metaPath, "utf-8")) as typeof meta;
      } catch {
        meta = {};
      }

      const destName = `${slug}_${basename(e.name)}`;
      const destPath = join(imagesDir, destName);
      try {
        await copyFile(srcPath, destPath);
        copied++;
      } catch {
        continue;
      }

      candidates.push({
        strainSlug: slug,
        imagePath: destPath,
        imageType: meta.image_type as ReviewCandidate["imageType"],
        qualityScore: meta.quality_score,
        sourceUrl: meta.source_url,
      });
    }
  }

  const manifestPath = join(CONFIG.VAULT_ROOT, "review_queue", "manifest.json");
  await mkdir(join(CONFIG.VAULT_ROOT, "review_queue"), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), candidates },
      null,
      2
    ),
    "utf-8"
  );

  return copied;
}
