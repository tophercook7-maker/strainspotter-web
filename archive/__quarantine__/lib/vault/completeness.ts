/**
 * Per-Strain Completeness Scoring
 * Fast filesystem-only checks for strain data completeness
 */

import fs from "fs";
import path from "path";
import { STRAINS_DIR, DATASETS_DIR, VAULT_RAW_ROOT } from "./config";

function safeCount(dir: string): number {
  try {
    if (!fs.existsSync(dir)) return 0;
    const entries = fs.readdirSync(dir);
    // Count only files, not directories
    return entries.filter((entry) => {
      const fullPath = path.join(dir, entry);
      try {
        return fs.statSync(fullPath).isFile();
      } catch {
        return false;
      }
    }).length;
  } catch {
    return 0;
  }
}

export interface StrainCompleteness {
  slug: string;
  score: number;
  rawCount: number;
  genCount: number;
  hasManifest: boolean;
  hasEmbedding: boolean;
  hasCluster: boolean;
  hasPublicImage: boolean;
  ocrStatus?: string; // "complete" | "empty" | "error"
  ocrConfidence?: number; // 0-100
  lastUpdated: string | null;
}

/**
 * Get completeness score for a single strain
 */
export function getStrainCompleteness(slug: string): StrainCompleteness {
  const base = path.join(STRAINS_DIR, slug);

  const rawDir = path.join(base, "raw");
  const genDir = path.join(base, "generated");
  const manifestPath = path.join(base, "manifest.json");

  const datasetBase = path.join(DATASETS_DIR, "strains", slug);
  const embeddingPath = path.join(datasetBase, "embedding.json");
  const clusterPath = path.join(datasetBase, "cluster.json");
  const publicImagePath = path.join(datasetBase, "public_image.png");

  const rawCount = safeCount(rawDir);
  const genCount = safeCount(genDir);

  const hasManifest = fs.existsSync(manifestPath);
  const hasEmbedding = fs.existsSync(embeddingPath);
  const hasCluster = fs.existsSync(clusterPath);
  const hasPublicImage = fs.existsSync(publicImagePath);

  // Read OCR data from manifest (if exists in raw root)
  let ocrStatus: string | undefined;
  let ocrConfidence: number | undefined;
  const rawManifestPath = path.join(VAULT_RAW_ROOT, slug, "manifest.json");
  if (fs.existsSync(rawManifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(rawManifestPath, "utf8"));
      if (manifest.ocr) {
        ocrStatus = manifest.ocr.status;
        ocrConfidence = manifest.ocr.confidence;
      }
    } catch (error) {
      // Ignore manifest parse errors
    }
  }

  // Score out of 100. Tune weights later.
  let score = 0;
  if (rawCount > 0) score += 25;
  if (genCount > 0) score += 25;
  if (hasManifest) score += 20;
  if (hasEmbedding) score += 20;
  if (hasPublicImage) score += 10;

  // last updated = max mtime of known key files/dirs
  const candidates = [
    rawDir,
    genDir,
    manifestPath,
    embeddingPath,
    publicImagePath,
  ].filter((p) => fs.existsSync(p));

  let lastUpdated: string | null = null;
  try {
    const mtimes = candidates.map((p) => {
      const stat = fs.statSync(p);
      return stat.isDirectory() ? stat.mtimeMs : stat.mtimeMs;
    });
    if (mtimes.length > 0) {
      lastUpdated = new Date(Math.max(...mtimes)).toISOString();
    }
  } catch (error) {
    console.error(`[vault/completeness] Error getting mtime for ${slug}:`, error);
  }

  return {
    slug,
    score,
    rawCount,
    genCount,
    hasManifest,
    hasEmbedding,
    hasCluster,
    hasPublicImage,
    ocrStatus,
    ocrConfidence,
    lastUpdated,
  };
}

/**
 * List completeness for all strains (paginated)
 */
export function listCompleteness(limit = 200, offset = 0) {
  try {
    if (!fs.existsSync(STRAINS_DIR)) {
      return {
        total: 0,
        items: [],
      };
    }

    const slugs = fs.readdirSync(STRAINS_DIR).filter((entry) => {
      const fullPath = path.join(STRAINS_DIR, entry);
      try {
        return fs.statSync(fullPath).isDirectory();
      } catch {
        return false;
      }
    });

    const page = slugs.slice(offset, offset + limit);
    const items = page.map(getStrainCompleteness);

    return {
      total: slugs.length,
      items,
    };
  } catch (error) {
    console.error("[vault/completeness] Error listing completeness:", error);
    return {
      total: 0,
      items: [],
    };
  }
}

/**
 * Get aggregate statistics
 */
export function getCompletenessStats() {
  try {
    const all = listCompleteness(10000, 0); // Get all for stats
    const items = all.items;

    if (items.length === 0) {
      return {
        total: 0,
        withRaw: 0,
        withGenerated: 0,
        withEmbedding: 0,
        avgScore: 0,
      };
    }

    const withRaw = items.filter((i) => i.rawCount > 0).length;
    const withGenerated = items.filter((i) => i.genCount > 0).length;
    const withEmbedding = items.filter((i) => i.hasEmbedding).length;
    const avgScore =
      items.reduce((sum, i) => sum + i.score, 0) / items.length;

    return {
      total: items.length,
      withRaw,
      withGenerated,
      withEmbedding,
      avgScore: Math.round(avgScore * 10) / 10,
    };
  } catch (error) {
    console.error("[vault/completeness] Error getting stats:", error);
    return {
      total: 0,
      withRaw: 0,
      withGenerated: 0,
      withEmbedding: 0,
      avgScore: 0,
    };
  }
}
