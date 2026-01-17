/**
 * Proxy Image Builder
 * Copies the best bud image as a public-safe proxy image
 */

import fs from "fs";
import path from "path";
import { pickBestImage } from "./imageHeuristic";
import { VAULT_RAW_ROOT, VAULT_PROCESSED_ROOT } from "./config";

/**
 * Build a proxy image for a strain by copying the best bud image
 * Returns the output path if successful, null otherwise
 */
export async function buildProxyImage(slug: string): Promise<string | null> {
  try {
    const rawBase = path.join(VAULT_RAW_ROOT, slug);
    const budsDir = path.join(rawBase, "buds");

    // Pick the best image from buds directory
    const bestImagePath = await pickBestImage(budsDir);
    if (!bestImagePath) {
      console.log(`[proxyImage] No images found for ${slug}`);
      return null;
    }

    // Create output directory structure
    const outDir = path.join(VAULT_PROCESSED_ROOT, "strains", slug);
    fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, "public_image.jpg");

    // Skip if already exists (idempotent)
    if (fs.existsSync(outPath)) {
      console.log(`[proxyImage] Proxy image already exists for ${slug}`);
      return outPath;
    }

    // Copy the best image to the processed location
    fs.copyFileSync(bestImagePath, outPath);
    console.log(`[proxyImage] Created proxy image for ${slug}: ${outPath}`);

    return outPath;
  } catch (error) {
    console.error(`[proxyImage] Error building proxy for ${slug}:`, error);
    return null;
  }
}
