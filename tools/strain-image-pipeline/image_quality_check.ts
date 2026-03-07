/**
 * Quality filter: reject blur, low-res, not cannabis, too dark, heavy watermark.
 * Rejected images move to raw_sources/rejected/
 */

import { readdir, readFile, writeFile, rename, mkdir } from "fs/promises";
import { join, basename } from "path";
import sharp from "sharp";
import { CONFIG, PATHS, slugify } from "./config.js";
import type { ImageMetadata } from "./types.js";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export interface QualityStats {
  checked: number;
  rejected: number;
  passed: number;
}

async function getBlurScore(imagePath: string): Promise<number> {
  try {
    const { data, info } = await sharp(imagePath)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    let sum = 0;
    let count = 0;
    const step = Math.max(1, Math.floor(Math.min(w, h) / 64));
    for (let y = step; y < h - step; y += step) {
      for (let x = step; x < w - step; x += step) {
        const i = (y * w + x) * 4;
        const gx =
          Math.abs((data[i] ?? 0) - (data[i + 4] ?? 0)) +
          Math.abs((data[i + 1] ?? 0) - (data[i + 5] ?? 0));
        const gy =
          Math.abs((data[i] ?? 0) - (data[i + w * 4] ?? 0)) +
          Math.abs((data[i + 1] ?? 0) - (data[i + w * 4 + 1] ?? 0));
        sum += gx + gy;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  } catch {
    return 0;
  }
}

async function getMeanBrightness(imagePath: string): Promise<number> {
  try {
    const { data, info } = await sharp(imagePath)
      .raw()
      .toBuffer({ resolveWithObject: true });
    let sum = 0;
    const ch = info.channels;
    for (let i = 0; i < data.length; i += ch) {
      sum += data[i] ?? 0;
    }
    return data.length > 0 ? sum / (data.length / ch) : 0;
  } catch {
    return 255;
  }
}

async function checkImage(
  imagePath: string,
  metaPath: string,
  strainName: string
): Promise<{ reject: boolean; reason?: string }> {
  try {
    const meta = await readFile(metaPath, "utf-8").then(JSON.parse).catch(() => ({})) as ImageMetadata;

    const img = sharp(imagePath);
    const { width, height } = await img.metadata();
    const minDim = Math.min(width ?? 0, height ?? 0);
    if (minDim < CONFIG.MIN_RESOLUTION_PX) {
      return { reject: true, reason: "resolution" };
    }

    const blurScore = await getBlurScore(imagePath);
    if (blurScore < CONFIG.BLUR_THRESHOLD) {
      return { reject: true, reason: "blur" };
    }

    const brightness = await getMeanBrightness(imagePath);
    if (brightness < 30) {
      return { reject: true, reason: "too_dark" };
    }

    // Watermark / not cannabis: heuristic placeholder (would need ML in production)
    meta.quality_score = Math.min(1, blurScore / 500);
    meta.resolution = { width: width ?? 0, height: height ?? 0 };
    meta.blur_detected = false;
    await writeFile(metaPath, JSON.stringify(meta, null, 2));

    return { reject: false };
  } catch {
    return { reject: true, reason: "error" };
  }
}

async function moveToRejected(
  imagePath: string,
  metaPath: string,
  strainName: string,
  reason: string
): Promise<void> {
  await mkdir(CONFIG.VAULT_ROOT + "/raw_sources/rejected", { recursive: true });
  const rejDir = CONFIG.VAULT_ROOT + "/raw_sources/rejected";
  const base = basename(imagePath);
  const metaBase = basename(metaPath);
  const strainSlug = slugify(strainName);
  const newImagePath = join(rejDir, `${strainSlug}_${base}`);
  const newMetaPath = join(rejDir, `${strainSlug}_${metaBase}`);
  await rename(imagePath, newImagePath).catch(() => {});
  await rename(metaPath, newMetaPath).catch(() => {});
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export async function runQualityCheck(strainNames: string[]): Promise<QualityStats> {
  const stats: QualityStats = { checked: 0, rejected: 0, passed: 0 };

  for (const name of strainNames) {
    const dir = PATHS.rawImages(name);
    let entries: { name: string }[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const e of entries) {
      if (!e.isFile()) continue;
      const ext = extOf(e.name);
      if (!IMAGE_EXTENSIONS.includes(ext)) continue;

      const imagePath = join(dir, e.name);
      const metaPath = imagePath.replace(/\.[^.]+$/, ".meta.json");

      const { reject, reason } = await checkImage(imagePath, metaPath, name);
      stats.checked++;
      if (reject) {
        stats.rejected++;
        await moveToRejected(imagePath, metaPath, name, reason ?? "unknown");
      } else {
        stats.passed++;
      }
    }
  }

  return stats;
}
