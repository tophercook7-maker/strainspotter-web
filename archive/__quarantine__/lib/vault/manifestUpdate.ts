/**
 * Manifest Update Service
 * Updates manifest.json with proxy image and OCR data
 */

import fs from "fs";
import path from "path";
import { VAULT_RAW_ROOT } from "./config";
import { buildProxyImage } from "./proxyImage";
import { extractTextFromImages } from "./ocr";

export interface Manifest {
  strain: string;
  display_name: string;
  source_root: string;
  images?: {
    buds?: {
      count: number;
      files: string[];
    };
    packaging?: {
      count: number;
      files: string[];
    };
  };
  representation?: {
    type: string;
    public_image: string | null;
    notes: string;
  };
  ocr?: {
    packaging_text: string[];
    image_count?: number;
    confidence?: number;
    status: string;
    updated_at: string;
  };
  status?: {
    scraped?: boolean;
    manifested?: boolean;
    generated?: boolean;
    embedded?: boolean;
    clustered?: boolean;
    public_safe?: boolean;
  };
  [key: string]: any;
}

/**
 * Update manifest with proxy image and OCR data
 * Returns updated manifest or null if manifest doesn't exist
 */
export async function updateManifestWithProxyAndOCR(
  slug: string,
  options?: { ocrOnly?: boolean }
): Promise<Manifest | null> {
  try {
    const base = path.join(VAULT_RAW_ROOT, slug);
    const manifestPath = path.join(base, "manifest.json");

    if (!fs.existsSync(manifestPath)) {
      console.log(`[manifestUpdate] No manifest found for ${slug}`);
      return null;
    }

    // Read existing manifest
    const manifest: Manifest = JSON.parse(
      fs.readFileSync(manifestPath, "utf8")
    );

    // Build proxy image (skip if ocrOnly)
    let proxyPath: string | null = null;
    if (!options?.ocrOnly) {
      proxyPath = await buildProxyImage(slug);
    } else {
      // Preserve existing proxy image path if ocrOnly
      proxyPath = manifest.representation?.public_image ? "public_image.jpg" : null;
    }

    // Extract OCR text from packaging images
    const packagingDir = path.join(base, "packaging");
    const ocrText = await extractTextFromImages(packagingDir);

    // Update manifest with representation data (if not ocrOnly or if proxy was created)
    if (!options?.ocrOnly || proxyPath) {
      manifest.representation = {
        type: "proxy",
        public_image: proxyPath ? "public_image.jpg" : null,
        notes:
          "Temporary proxy from best bud image; replace with AI-generated image later",
      };
    }

    // Update manifest with OCR data (with confidence signal)
    const hasValidText = ocrText.length > 0 && 
      ocrText.some((text) => text.trim().length > 0 && !text.includes("[OCR_ERROR]"));
    
    manifest.ocr = {
      packaging_text: ocrText,
      image_count: ocrText.length,
      confidence: Math.min(100, ocrText.length * 15), // 15 points per image, max 100
      status: hasValidText ? "complete" : ocrText.length > 0 ? "error" : "empty",
      updated_at: new Date().toISOString(),
    };

    // Update status
    if (!manifest.status) {
      manifest.status = {};
    }
    if (!options?.ocrOnly) {
      manifest.status.public_safe = !!proxyPath;
    }

    // Write updated manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`[manifestUpdate] Updated manifest for ${slug}${options?.ocrOnly ? " (OCR only)" : ""}`);

    return manifest;
  } catch (error) {
    console.error(
      `[manifestUpdate] Error updating manifest for ${slug}:`,
      error
    );
    return null;
  }
}
