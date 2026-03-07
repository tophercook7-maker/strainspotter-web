/**
 * Duplicate detection using perceptual hashing. Remove near-duplicates.
 */

import { readdir, readFile, unlink } from "fs/promises";
import { join } from "path";
import imageHash from "image-hash";
import { CONFIG, PATHS, slugify } from "./config.js";
import type { ImageMetadata } from "./types.js";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function phash(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    imageHash(path, CONFIG.PHASH_SIZE, true, (err, hash) => {
      if (err) reject(err);
      else resolve(hash ?? "");
    });
  });
}

function hammingDistance(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const x = parseInt(a[i] ?? "0", 16);
    const y = parseInt(b[i] ?? "0", 16);
    for (let j = 0; j < 4; j++) {
      if ((x & (1 << j)) !== (y & (1 << j))) d++;
    }
  }
  return d;
}

export interface DedupeStats {
  total: number;
  duplicatesRemoved: number;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export async function runDedupe(strainNames: string[]): Promise<DedupeStats> {
  const stats: DedupeStats = { total: 0, duplicatesRemoved: 0 };

  for (const name of strainNames) {
    const dir = PATHS.rawImages(name);
    let entries: { name: string }[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    const imageFiles = entries.filter(
      (e) => e.isFile() && IMAGE_EXTENSIONS.includes(extOf(e.name))
    );
    if (imageFiles.length <= 1) {
      stats.total += imageFiles.length;
      continue;
    }

    const hashes: { path: string; metaPath: string; hash: string }[] = [];
    for (const e of imageFiles) {
      const imagePath = join(dir, e.name);
      try {
        const hash = await phash(imagePath);
        const metaPath = imagePath.replace(/\.[^.]+$/, ".meta.json");
        hashes.push({ path: imagePath, metaPath, hash });
      } catch {
        // skip unreadable
      }
    }
    stats.total += hashes.length;

    const toRemove = new Set<string>();
    for (let i = 0; i < hashes.length; i++) {
      if (toRemove.has(hashes[i]!.path)) continue;
      for (let j = i + 1; j < hashes.length; j++) {
        if (toRemove.has(hashes[j]!.path)) continue;
        const d = hammingDistance(hashes[i]!.hash, hashes[j]!.hash);
        if (d <= CONFIG.PHASH_THRESHOLD) {
          toRemove.add(hashes[j]!.path);
          stats.duplicatesRemoved++;
        }
      }
    }

    for (const p of toRemove) {
      const metaPath = p.replace(/\.[^.]+$/, ".meta.json");
      await unlink(p).catch(() => {});
      await unlink(metaPath).catch(() => {});
    }
  }

  return stats;
}
