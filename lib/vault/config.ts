/**
 * Vault Configuration
 * Single source of truth for Vault paths
 */

export const VAULT_ROOT =
  process.env.VAULT_ROOT || "/Volumes/Vault/strainspotter";

export const VAULT_RAW_ROOT =
  process.env.VAULT_RAW_ROOT ||
  "/Volumes/TheVault/StrainSpotter-Dataset";

export const VAULT_PROCESSED_ROOT =
  process.env.VAULT_PROCESSED_ROOT ||
  "/Volumes/TheVault/StrainSpotter-Datasets-Processed";

export const STRAINS_DIR = `${VAULT_ROOT}/strains`;
export const DATASETS_DIR = `${VAULT_ROOT}/datasets`;
export const LOGS_DIR = `${VAULT_ROOT}/logs`;
