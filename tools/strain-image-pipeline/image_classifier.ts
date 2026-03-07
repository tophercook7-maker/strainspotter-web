/**
 * Image classifier: detect bud, whole_plant, leaf, trichome, packaging.
 * Uses heuristics by default. Can be extended with OpenAI vision or local model.
 */

import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { CONFIG, PATHS, slugify } from "./config.js";
import type { ImageMetadata } from "./types.js";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
type ImageType = "bud" | "whole_plant" | "leaf" | "trichome" | "packaging";

/**
 * Heuristic classification based on filename and optional metadata.
 * Replace with OpenAI vision or local model for real classification.
 */
function classifyImage(
  _imagePath: string,
  filename: string,
  _metadata: Partial<ImageMetadata>
): ImageType {
  const lower = filename.toLowerCase();
  if (lower.includes("packaging") || lower.includes("label") || lower.includes("package"))
    return "packaging";
  if (lower.includes("trichome") || lower.includes("macro")) return "trichome";
  if (lower.includes("leaf") || lower.includes("leaves")) return "leaf";
  if (lower.includes("whole") || lower.includes("plant") || lower.includes("full"))
    return "whole_plant";
  return "bud"; // default for cannabis images
}

async function processStrainFolder(strainDir: string, strainName: string): Promise<number> {
  let count = 0;
  const entries = await readdir(strainDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    const ext = extOf(e.name);
    if (!IMAGE_EXTENSIONS.includes(ext)) continue;

    const imagePath = join(strainDir, e.name);
    const metaPath = imagePath.replace(/\.[^.]+$/, ".meta.json");

    let meta: Partial<ImageMetadata> = {};
    try {
      const raw = await readFile(metaPath, "utf-8");
      meta = JSON.parse(raw) as Partial<ImageMetadata>;
    } catch {
      meta = {};
    }

    const imageType = classifyImage(imagePath, e.name, meta);
    meta.image_type = imageType;
    meta.classified_at = new Date().toISOString();

    await writeFile(metaPath, JSON.stringify(meta, null, 2));
    count++;
  }
  return count;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export async function runClassifier(strainNames: string[]): Promise<number> {
  let total = 0;
  for (const name of strainNames) {
    const dir = PATHS.rawImages(name);
    try {
      const c = await processStrainFolder(dir, name);
      total += c;
    } catch {
      // skip missing folders
    }
  }
  return total;
}
