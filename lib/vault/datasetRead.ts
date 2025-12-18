/**
 * Dataset Read Helpers
 * Foundation for future matcher integration
 * (Not wired into user matching yet - this is foundation)
 */

import fs from "fs";
import path from "path";
import { DATASETS_DIR, VAULT_PROCESSED_ROOT, VAULT_RAW_ROOT } from "./config";

/**
 * Read embedding data for a strain
 */
export function readEmbedding(slug: string) {
  const p = path.join(DATASETS_DIR, "strains", slug, "embedding.json");
  if (!fs.existsSync(p)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (error) {
    console.error(`[vault/datasetRead] Error reading embedding for ${slug}:`, error);
    return null;
  }
}

/**
 * Check if a strain has a public image
 */
export function hasPublicImage(slug: string): boolean {
  const p = path.join(DATASETS_DIR, "strains", slug, "public_image.png");
  return fs.existsSync(p);
}

/**
 * Read cluster data for a strain
 */
export function readCluster(slug: string) {
  const p = path.join(DATASETS_DIR, "strains", slug, "cluster.json");
  if (!fs.existsSync(p)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (error) {
    console.error(`[vault/datasetRead] Error reading cluster for ${slug}:`, error);
    return null;
  }
}

/**
 * Get public image path (if exists)
 */
export function getPublicImagePath(slug: string): string | null {
  const p = path.join(DATASETS_DIR, "strains", slug, "public_image.png");
  return fs.existsSync(p) ? p : null;
}

/**
 * Read proxy public image from processed dataset
 */
export function readPublicImage(slug: string): string | null {
  const p = path.join(VAULT_PROCESSED_ROOT, "strains", slug, "public_image.jpg");
  return fs.existsSync(p) ? p : null;
}

/**
 * Read OCR text from manifest
 */
export function readOCRFromManifest(slug: string): string[] {
  const mp = path.join(VAULT_RAW_ROOT, slug, "manifest.json");
  if (!fs.existsSync(mp)) {
    return [];
  }
  try {
    const m = JSON.parse(fs.readFileSync(mp, "utf8"));
    return m?.ocr?.packaging_text || [];
  } catch (error) {
    console.error(`[vault/datasetRead] Error reading OCR from manifest for ${slug}:`, error);
    return [];
  }
}
