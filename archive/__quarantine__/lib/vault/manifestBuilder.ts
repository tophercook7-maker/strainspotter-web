/**
 * Manifest Builder Service
 * Generates manifest.json files for strains in the Vault dataset
 * SAFE: Only reads images and writes manifest.json files
 */

import fs from "fs";
import path from "path";
import { VAULT_RAW_ROOT } from "./config";

/**
 * List image files in a directory
 */
function listImages(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  try {
    return fs.readdirSync(dir).filter((f) =>
      /\.(jpg|jpeg|png|webp)$/i.test(f)
    );
  } catch (error) {
    console.error(`[manifestBuilder] Error listing images in ${dir}:`, error);
    return [];
  }
}

export interface Manifest {
  strain: string;
  display_name: string;
  source_root: string;
  images: {
    buds: {
      count: number;
      files: string[];
    };
    packaging: {
      count: number;
      files: string[];
    };
  };
  totals: {
    image_count: number;
    has_buds: boolean;
    has_packaging: boolean;
  };
  status: {
    scraped: boolean;
    manifested: boolean;
    generated: boolean;
    embedded: boolean;
    clustered: boolean;
    public_safe: boolean;
  };
  timestamps: {
    first_seen: string;
    last_modified: string;
    manifest_created: string;
  };
  notes: {
    legal: string;
    comments: string;
  };
  version: number;
}

/**
 * Build manifest for a single strain
 * Returns null if strain doesn't exist or manifest already exists (idempotent)
 */
export function buildManifestForStrain(slug: string): Manifest | null {
  const base = path.join(VAULT_RAW_ROOT, slug);
  const manifestPath = path.join(base, "manifest.json");

  // Skip if strain directory doesn't exist
  if (!fs.existsSync(base)) {
    console.log(`[manifestBuilder] Skipping ${slug}: directory not found`);
    return null;
  }

  // Skip if manifest already exists (idempotent)
  if (fs.existsSync(manifestPath)) {
    console.log(`[manifestBuilder] Skipping ${slug}: manifest already exists`);
    return null;
  }

  const budsDir = path.join(base, "buds");
  const pkgDir = path.join(base, "packaging");

  const buds = listImages(budsDir).map((f) => `buds/${f}`);
  const packaging = listImages(pkgDir).map((f) => `packaging/${f}`);

  const now = new Date().toISOString();

  // Get last modified time from directory or files
  let lastModified = now;
  try {
    const stat = fs.statSync(base);
    lastModified = stat.mtime.toISOString();
  } catch (error) {
    // Use current time if stat fails
  }

  const manifest: Manifest = {
    strain: slug,
    display_name: slug.replace(/-/g, " ").replace(/\|/g, " | "),
    source_root: base,

    images: {
      buds: {
        count: buds.length,
        files: buds,
      },
      packaging: {
        count: packaging.length,
        files: packaging,
      },
    },

    totals: {
      image_count: buds.length + packaging.length,
      has_buds: buds.length > 0,
      has_packaging: packaging.length > 0,
    },

    status: {
      scraped: true,
      manifested: true,
      generated: false,
      embedded: false,
      clustered: false,
      public_safe: false,
    },

    timestamps: {
      first_seen: lastModified,
      last_modified: lastModified,
      manifest_created: now,
    },

    notes: {
      legal: "raw scraped images – internal use only",
      comments: "",
    },

    version: 1,
  };

  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`[manifestBuilder] Created manifest for ${slug}`);
    return manifest;
  } catch (error) {
    console.error(`[manifestBuilder] Error writing manifest for ${slug}:`, error);
    return null;
  }
}

/**
 * Build manifests for all strains (with optional limit)
 */
export function buildAllManifests(limit?: number): {
  total: number;
  created: number;
  skipped: number;
  errors: number;
} {
  if (!fs.existsSync(VAULT_RAW_ROOT)) {
    console.error(`[manifestBuilder] Vault root not found: ${VAULT_RAW_ROOT}`);
    return {
      total: 0,
      created: 0,
      skipped: 0,
      errors: 0,
    };
  }

  let slugs: string[];
  try {
    slugs = fs.readdirSync(VAULT_RAW_ROOT).filter((entry) => {
      const fullPath = path.join(VAULT_RAW_ROOT, entry);
      try {
        return fs.statSync(fullPath).isDirectory();
      } catch {
        return false;
      }
    });
  } catch (error) {
    console.error(`[manifestBuilder] Error reading vault root:`, error);
    return {
      total: 0,
      created: 0,
      skipped: 0,
      errors: 0,
    };
  }

  let processed = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`[manifestBuilder] Processing ${slugs.length} strains${limit ? ` (limit: ${limit})` : ""}`);

  for (const slug of slugs) {
    try {
      const result = buildManifestForStrain(slug);
      if (result) {
        created++;
      } else {
        skipped++;
      }
      processed++;

      if (limit && processed >= limit) {
        break;
      }

      // Log progress every 100 strains
      if (processed % 100 === 0) {
        console.log(`[manifestBuilder] Progress: ${processed}/${slugs.length} (${created} created, ${skipped} skipped)`);
      }
    } catch (error) {
      console.error(`[manifestBuilder] Error processing ${slug}:`, error);
      errors++;
      processed++;
    }
  }

  console.log(`[manifestBuilder] Complete: ${created} created, ${skipped} skipped, ${errors} errors`);

  return {
    total: slugs.length,
    created,
    skipped,
    errors,
  };
}

/**
 * Get manifest statistics
 */
export function getManifestStats(): {
  total: number;
  withManifest: number;
  withoutManifest: number;
  withImages: number;
} {
  if (!fs.existsSync(VAULT_RAW_ROOT)) {
    return {
      total: 0,
      withManifest: 0,
      withoutManifest: 0,
      withImages: 0,
    };
  }

  let slugs: string[];
  try {
    slugs = fs.readdirSync(VAULT_RAW_ROOT).filter((entry) => {
      const fullPath = path.join(VAULT_RAW_ROOT, entry);
      try {
        return fs.statSync(fullPath).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return {
      total: 0,
      withManifest: 0,
      withoutManifest: 0,
      withImages: 0,
    };
  }

  let withManifest = 0;
  let withImages = 0;

  for (const slug of slugs) {
    const base = path.join(VAULT_RAW_ROOT, slug);
    const manifestPath = path.join(base, "manifest.json");

    if (fs.existsSync(manifestPath)) {
      withManifest++;
    }

    const budsDir = path.join(base, "buds");
    const pkgDir = path.join(base, "packaging");
    const buds = listImages(budsDir);
    const packaging = listImages(pkgDir);

    if (buds.length > 0 || packaging.length > 0) {
      withImages++;
    }
  }

  return {
    total: slugs.length,
    withManifest,
    withoutManifest: slugs.length - withManifest,
    withImages,
  };
}
