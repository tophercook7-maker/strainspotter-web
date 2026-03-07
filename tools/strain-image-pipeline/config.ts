import { existsSync } from "fs";

/**
 * Pipeline configuration. Uses /Volumes/TheVault if /Volumes/Vault is not mounted.
 */
const VAULT_ROOT = existsSync("/Volumes/Vault")
  ? "/Volumes/Vault/strainspotter-vault"
  : "/Volumes/TheVault/strainspotter-vault";

export const CONFIG = {
  VAULT_ROOT,
  MAX_IMAGES_PER_RUN: 500,
  MAX_IMAGES_PER_STRAIN: 20,
  MIN_RESOLUTION_PX: 512,
  BLUR_THRESHOLD: 100,
  PHASH_SIZE: 16,
  PHASH_THRESHOLD: 5,
} as const;

export const PATHS = {
  rawImages: (strainName: string) =>
    `${CONFIG.VAULT_ROOT}/raw_sources/images/${slugify(strainName)}`,
  rejected: `${CONFIG.VAULT_ROOT}/raw_sources/rejected`,
  candidateImages: (strainName: string) =>
    `${CONFIG.VAULT_ROOT}/staging/candidate_strain_images/${slugify(strainName)}`,
  metadataPath: (basePath: string, filename: string) =>
    `${basePath}/${filename.replace(/\.[^.]+$/, "")}.metadata.json`,
} as const;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}
