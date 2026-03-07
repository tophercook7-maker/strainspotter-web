import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Pipeline configuration. Uses VAULT_ROOT env, or /Volumes/Vault|TheVault if mounted.
 * Fallback: ./vault-output in pipeline dir when volumes are not available.
 */
const VAULT_ROOT =
  process.env.VAULT_ROOT ??
  (existsSync("/Volumes/Vault")
    ? "/Volumes/Vault/strainspotter-vault"
    : existsSync("/Volumes/TheVault")
      ? "/Volumes/TheVault/strainspotter-vault"
      : join(__dirname, "vault-output"));

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
} as const;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}
