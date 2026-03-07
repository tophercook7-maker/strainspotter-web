/**
 * Download pipeline: fetch images for strain names and save to raw_sources/images/{strain-name}/
 * Limit: 20 images per strain, 500 per run.
 */

import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { CONFIG, PATHS, slugify } from "./config.js";
import type { DownloadStats } from "./types.js";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const USER_AGENT =
  "StrainSpotterImagePipeline/1.0 (https://strainspotter.app; ingestion for reference images)";

export interface DownloadOptions {
  strainNames: string[];
  imageUrlsByStrain?: Record<string, string[]>;
  maxPerRun?: number;
  maxPerStrain?: number;
}

/**
 * Placeholder: returns mock URLs for testing. Replace with real image source (e.g. Google Custom Search API).
 */
async function getImageUrlsForStrain(
  strainName: string,
  maxCount: number
): Promise<string[]> {
  // In production: call Google Custom Search, Bing Image API, or read from config.
  // For now return empty so pipeline can run without external API.
  return [];
}

/**
 * Download a single image and save with metadata.
 */
async function downloadImage(
  url: string,
  imagePath: string,
  metaPath: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(imagePath, buffer);
    await writeFile(metaPath, JSON.stringify(metadata, null, 2));
    return true;
  } catch {
    return false;
  }
}

function getExtensionFromUrl(url: string): string | null {
  const u = url.split("?")[0];
  const ext = u.slice(u.lastIndexOf(".")).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext) ? ext : null;
}

/**
 * Main download entry. Uses imageUrlsByStrain if provided, else getImageUrlsForStrain.
 */
export async function runDownload(
  options: DownloadOptions
): Promise<DownloadStats> {
  const maxPerRun = options.maxPerRun ?? CONFIG.MAX_IMAGES_PER_RUN;
  const maxPerStrain = options.maxPerStrain ?? CONFIG.MAX_IMAGES_PER_STRAIN;
  const stats: DownloadStats = {
    strainsProcessed: 0,
    imagesDownloaded: 0,
    imagesRejected: 0,
    imagesPromoted: 0,
  };

  let totalDownloaded = 0;

  for (const strainName of options.strainNames) {
    if (totalDownloaded >= maxPerRun) break;

    const slug = slugify(strainName);
    const destDir = PATHS.rawImages(strainName);
    await mkdir(destDir, { recursive: true });

    let urls: string[];
    if (options.imageUrlsByStrain?.[strainName]) {
      urls = options.imageUrlsByStrain[strainName].slice(0, maxPerStrain);
    } else {
      urls = await getImageUrlsForStrain(strainName, maxPerStrain);
    }

    for (let i = 0; i < urls.length && totalDownloaded < maxPerRun; i++) {
      const url = urls[i];
      const baseName = `img_${Date.now()}_${i}`;
      const metaPath = join(destDir, `${baseName}.meta.json`);
      const metadata = {
        source_url: url,
        strain_name: strainName,
        downloaded_at: new Date().toISOString(),
      };
      const ext = getExtensionFromUrl(url) || ".jpg";
      const imagePath = join(destDir, `${baseName}${ext}`);
      const ok = await downloadImage(url, imagePath, metaPath, metadata);
      if (ok) {
        totalDownloaded++;
        stats.imagesDownloaded++;
      } else {
        stats.imagesRejected++;
      }
    }
    if (urls.length > 0) stats.strainsProcessed++;
  }

  return stats;
}
