/**
 * Generator Status Service
 * Monitors generator progress by checking generated directories
 */

import fs from "fs";
import path from "path";
import { STRAINS_DIR } from "./config";

export interface GeneratorStatus {
  generated: number;
  missing: number;
}

export function getGeneratorStatus(): GeneratorStatus {
  try {
    if (!fs.existsSync(STRAINS_DIR)) {
      return {
        generated: 0,
        missing: 0,
      };
    }

    const strains = fs.readdirSync(STRAINS_DIR);
    let generated = 0;

    for (const strain of strains) {
      const strainPath = path.join(STRAINS_DIR, strain);
      
      // Only check directories
      if (!fs.statSync(strainPath).isDirectory()) {
        continue;
      }

      const genDir = path.join(strainPath, "generated");
      if (
        fs.existsSync(genDir) &&
        fs.statSync(genDir).isDirectory() &&
        fs.readdirSync(genDir).length > 0
      ) {
        generated++;
      }
    }

    return {
      generated,
      missing: strains.length - generated,
    };
  } catch (error) {
    console.error('[vault/generatorStatus] Error getting generator status:', error);
    return {
      generated: 0,
      missing: 0,
    };
  }
}
