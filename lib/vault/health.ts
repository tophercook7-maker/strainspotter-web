/**
 * Vault Health Check Service
 * Verifies Vault directory structure and accessibility
 */

import fs from "fs";
import { STRAINS_DIR, DATASETS_DIR, VAULT_RAW_ROOT } from "./config";

export interface VaultHealth {
  strainsDir: boolean;
  datasetsDir: boolean;
  strainCount: number;
  timestamp: string;
}

export function checkVaultHealth(): VaultHealth {
  try {
    const strainsDir = fs.existsSync(STRAINS_DIR);
    const datasetsDir = fs.existsSync(DATASETS_DIR);
    const rawRoot = fs.existsSync(VAULT_RAW_ROOT);
    
    let strainCount = 0;
    
    // Count from processed location
    if (strainsDir) {
      try {
        const entries = fs.readdirSync(STRAINS_DIR);
        // Count only directories (strains)
        strainCount = entries.filter(entry => {
          const fullPath = `${STRAINS_DIR}/${entry}`;
          return fs.statSync(fullPath).isDirectory();
        }).length;
      } catch (err) {
        console.error('[vault/health] Error counting strains:', err);
      }
    }
    
    // Count from raw dataset location if processed location is empty
    if (strainCount === 0 && rawRoot) {
      try {
        const entries = fs.readdirSync(VAULT_RAW_ROOT);
        strainCount = entries.filter(entry => {
          const fullPath = `${VAULT_RAW_ROOT}/${entry}`;
          return fs.statSync(fullPath).isDirectory();
        }).length;
      } catch (err) {
        console.error('[vault/health] Error counting raw strains:', err);
      }
    }

    return {
      strainsDir: strainsDir || rawRoot, // Report true if either exists
      datasetsDir,
      strainCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[vault/health] Health check error:', error);
    return {
      strainsDir: false,
      datasetsDir: false,
      strainCount: 0,
      timestamp: new Date().toISOString(),
    };
  }
}
