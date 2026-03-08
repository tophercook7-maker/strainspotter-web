import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Pipeline configuration.
 *
 * VAULT ROOT: One consistent external-drive location.
 * - Preferred: /Volumes/TheVault/strainspotter-vault (primary external drive)
 * - Fallback: /Volumes/Vault/strainspotter-vault (if TheVault not mounted)
 * - Env override: VAULT_ROOT (e.g. for CI or different mount)
 * - Last resort: ./vault-output in pipeline dir
 */
const PREFERRED_VAULT_ROOT = "/Volumes/TheVault/strainspotter-vault";
const FALLBACK_VAULT_ROOT = "/Volumes/Vault/strainspotter-vault";

const VAULT_ROOT =
  process.env.VAULT_ROOT ??
  (existsSync("/Volumes/TheVault")
    ? PREFERRED_VAULT_ROOT
    : existsSync("/Volumes/Vault")
      ? FALLBACK_VAULT_ROOT
      : join(__dirname, "vault-output"));

export const CONFIG = {
  VAULT_ROOT,
  MAX_IMAGES_PER_RUN: 500,
  MAX_IMAGES_PER_STRAIN: 20,
  MIN_RESOLUTION_PX: 512,
  /** Blur threshold (gradient magnitude). Calibrated for real cannabis imagery from Wikimedia Commons. */
  BLUR_THRESHOLD: 35,
  PHASH_SIZE: 16,
  PHASH_THRESHOLD: 5,
} as const;

export const PATHS = {
  rawImages: (strainName: string) =>
    `${CONFIG.VAULT_ROOT}/raw_sources/images/${slugify(strainName)}`,
  rawHtml: (strainName: string) =>
    `${CONFIG.VAULT_ROOT}/raw_sources/html/${slugify(strainName)}.html`,
  rawJson: (strainName: string) =>
    `${CONFIG.VAULT_ROOT}/raw_sources/json/${slugify(strainName)}.json`,
  rejected: `${CONFIG.VAULT_ROOT}/raw_sources/rejected`,
  candidateImages: (strainName: string) =>
    `${CONFIG.VAULT_ROOT}/staging/candidate_strain_images/${slugify(strainName)}`,
  metadataPath: (basePath: string, filename: string) =>
    `${basePath}/${filename.replace(/\.[^.]+$/, "")}.metadata.json`,
  logs: `${CONFIG.VAULT_ROOT}/logs`,
  fixtures: (filename: string) => join(__dirname, "fixtures", filename),
  /** Approved reference images: approved/strain_reference_images/{image_type}/{strain-slug}/ */
  approvedStrainImage: (strainSlug: string, imageType: string) =>
    `${CONFIG.VAULT_ROOT}/approved/strain_reference_images/${imageType}/${strainSlug}`,
  /** Embedding vectors and records for approved images */
  embeddingVectors: `${CONFIG.VAULT_ROOT}/embeddings/image_vectors`,
  embeddingManifest: `${CONFIG.VAULT_ROOT}/embeddings/image_vectors/manifest.json`,
} as const;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}
