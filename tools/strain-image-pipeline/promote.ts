/**
 * Promote approved images from raw_sources to staging/candidate_strain_images/{strain-name}/
 */

import { readdir, rename, mkdir } from "fs/promises";
import { join } from "path";
import { CONFIG, PATHS, slugify } from "./config.js";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export async function runPromote(strainNames: string[]): Promise<number> {
  let promoted = 0;

  for (const name of strainNames) {
    const srcDir = PATHS.rawImages(name);
    const destDir = PATHS.candidateImages(name);
    await mkdir(destDir, { recursive: true });

    let entries: { name: string }[];
    try {
      entries = await readdir(srcDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const e of entries) {
      if (!e.isFile()) continue;
      const ext = extOf(e.name);
      if (!IMAGE_EXTENSIONS.includes(ext)) continue;

      const srcPath = join(srcDir, e.name);
      const metaPath = srcPath.replace(/\.[^.]+$/, ".meta.json");
      const destPath = join(destDir, e.name);
      const destMetaPath = join(destDir, e.name.replace(/\.[^.]+$/, ".meta.json"));

      try {
        await rename(srcPath, destPath);
        await rename(metaPath, destMetaPath);
        promoted++;
      } catch {
        // skip if already moved or locked
      }
    }
  }

  return promoted;
}
