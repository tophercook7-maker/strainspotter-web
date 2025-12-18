/**
 * Scraper Status Service
 * Monitors scraper progress by checking manifest files
 */

import fs from "fs";
import path from "path";
import { STRAINS_DIR, VAULT_RAW_ROOT } from "./config";

export interface ScraperStatus {
  total: number;
  complete: number;
  pending: number;
}

export function getScraperStatus(): ScraperStatus {
  try {
    // Check raw dataset location first (where actual data is)
    let total = 0;
    let complete = 0;

    if (fs.existsSync(VAULT_RAW_ROOT)) {
      const strains = fs.readdirSync(VAULT_RAW_ROOT);
      for (const strain of strains) {
        const strainPath = path.join(VAULT_RAW_ROOT, strain);
        
        // Only check directories
        if (!fs.statSync(strainPath).isDirectory()) {
          continue;
        }

        total++;
        const manifest = path.join(strainPath, "manifest.json");
        if (fs.existsSync(manifest)) {
          complete++;
        }
      }
    } else if (fs.existsSync(STRAINS_DIR)) {
      // Fallback to processed location if raw doesn't exist
      const strains = fs.readdirSync(STRAINS_DIR);
      for (const strain of strains) {
        const strainPath = path.join(STRAINS_DIR, strain);
        
        // Only check directories
        if (!fs.statSync(strainPath).isDirectory()) {
          continue;
        }

        total++;
        const manifest = path.join(strainPath, "manifest.json");
        if (fs.existsSync(manifest)) {
          complete++;
        }
      }
    }

    return {
      total,
      complete,
      pending: total - complete,
    };
  } catch (error) {
    console.error('[vault/scraperStatus] Error getting scraper status:', error);
    return {
      total: 0,
      complete: 0,
      pending: 0,
    };
  }
}
