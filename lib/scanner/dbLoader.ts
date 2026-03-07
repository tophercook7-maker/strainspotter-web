// lib/scanner/dbLoader.ts
// Phase 5.0.1 — Real Strain Database Loader
// P0 BLOCKER FIX: Load 35,000+ strain database

import type { CultivarReference } from "./cultivarLibrary";

const MIN_REQUIRED_STRAINS = 10000;

/** True when strain count is below minimum (dev only; production throws instead). */
let limitedStrainsMode = false;
let limitedStrainsWarnedOnce = false;

/**
 * Whether the scanner is running with a limited cultivar database (missing or &lt; 10k strains).
 * Only ever true in development; production throws before this can be set.
 */
export function getLimitedStrainsMode(): boolean {
  return limitedStrainsMode;
}

/**
 * Phase 5.0.1 — Load strain database from JSON file
 *
 * REQUIREMENTS:
 * - Production: hard fail if &lt; 10,000 strains
 * - Development: warn once, set limitedStrainsMode, scanner runs with limited matching
 * - Log on boot: STRAIN DB SIZE (once)
 */
export async function loadStrainDatabase(): Promise<CultivarReference[]> {
  try {
    // Phase 5.0.1 — Try to load from external JSON file
    let strains: CultivarReference[] = [];
    const possiblePaths = [
      "/data/strains.json",
      "/api/strains.json",
      "./data/strains.json",
    ];

    let loaded = false;
    for (const path of possiblePaths) {
      try {
        if (typeof window !== "undefined") {
          const response = await fetch(path);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              strains = normalizeStrainData(data);
              loaded = true;
              break;
            }
          }
        } else {
          try {
            const fs = await import("fs");
            const pathModule = await import("path");
            const filePath = pathModule.join(process.cwd(), "lib", "data", "strains.json");
            if (fs.existsSync(filePath)) {
              const fileContent = fs.readFileSync(filePath, "utf-8");
              const data = JSON.parse(fileContent);
              if (Array.isArray(data) && data.length > 0) {
                strains = normalizeStrainData(data);
                loaded = true;
                break;
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }

    if (!loaded) {
      strains = [];
    }

    const count = strains.length;
    const isProd = process.env.NODE_ENV === "production";

    if (count < MIN_REQUIRED_STRAINS) {
      if (isProd) {
        const errorMessage =
          `DB AUTHORITY — CRITICAL: Strain database has only ${count} strains. ` +
          `Minimum required: ${MIN_REQUIRED_STRAINS}. ` +
          `Scanner accuracy requires full database. ` +
          `Please ensure lib/data/strains.json contains 35,000+ strains.`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      // Development: set limited mode, warn once, do not throw
      limitedStrainsMode = true;
      if (!limitedStrainsWarnedOnce) {
        limitedStrainsWarnedOnce = true;
        console.warn(
          "[strain DB] Cultivar database is missing or has fewer than 10,000 strains. " +
            "Scanner will run in limited mode until lib/data/strains.json is imported. " +
            "Use npm run check:strains to verify production readiness."
        );
      }
      return strains;
    }

    limitedStrainsMode = false;
    console.log("STRAIN DB SIZE:", count);
    return strains;
  } catch (error) {
    console.error("Phase 5.0.1 — Failed to load strain database:", error);
    throw error;
  }
}

/**
 * Phase 5.0.1 — Normalize strain data from JSON
 * Ensures all required fields are present and properly formatted
 */
function normalizeStrainData(rawData: any[]): CultivarReference[] {
  return rawData
    .filter(item => item && item.name) // Filter out invalid entries
    .map(item => {
      // Normalize primary name
      const name = String(item.name || "").trim();
      if (!name) return null;
      
      // Normalize aliases
      const aliases = Array.isArray(item.aliases) 
        ? item.aliases.map((a: any) => String(a).trim()).filter(Boolean)
        : item.aliases 
          ? [String(item.aliases).trim()].filter(Boolean)
          : [];
      
      // Normalize genetics/lineage
      const genetics = String(item.genetics || item.lineage || "Unknown").trim();
      
      // Normalize type (Indica/Sativa/Hybrid)
      const typeRaw = String(item.type || item.dominantType || "Hybrid").trim();
      const type = ["Indica", "Sativa", "Hybrid"].includes(typeRaw) 
        ? (typeRaw as "Indica" | "Sativa" | "Hybrid")
        : "Hybrid";
      
      // Normalize indica/sativa ratio
      let indicaPercent: number | undefined = undefined;
      let sativaPercent: number | undefined = undefined;
      
      if (item.indicaPercent !== undefined && item.sativaPercent !== undefined) {
        // Direct ratio provided
        indicaPercent = Math.max(0, Math.min(100, Number(item.indicaPercent) || 0));
        sativaPercent = Math.max(0, Math.min(100, Number(item.sativaPercent) || 0));
      } else if (item.indica !== undefined && item.sativa !== undefined) {
        // Alternative field names
        indicaPercent = Math.max(0, Math.min(100, Number(item.indica) || 0));
        sativaPercent = Math.max(0, Math.min(100, Number(item.sativa) || 0));
      } else if (type === "Indica") {
        // Infer from type
        indicaPercent = 80;
        sativaPercent = 20;
      } else if (type === "Sativa") {
        // Infer from type
        indicaPercent = 20;
        sativaPercent = 80;
      } else {
        // Hybrid default
        indicaPercent = 50;
        sativaPercent = 50;
      }
      
      // Ensure percentages sum to 100
      const total = indicaPercent + sativaPercent;
      if (total > 0) {
        indicaPercent = Math.round((indicaPercent / total) * 100);
        sativaPercent = Math.round((sativaPercent / total) * 100);
      } else {
        indicaPercent = 50;
        sativaPercent = 50;
      }
      
      // Normalize visual profile
      const visualProfile = {
        trichomeDensity: normalizeDensity(item.visualProfile?.trichomeDensity || item.trichomeDensity || "medium"),
        pistilColor: Array.isArray(item.visualProfile?.pistilColor || item.pistilColor)
          ? (item.visualProfile?.pistilColor || item.pistilColor).map((c: any) => String(c).trim())
          : item.visualProfile?.pistilColor || item.pistilColor
          ? [String(item.visualProfile?.pistilColor || item.pistilColor).trim()]
          : ["orange"],
        budStructure: normalizeDensity(item.visualProfile?.budStructure || item.budStructure || "medium"),
        leafShape: normalizeLeafShape(item.visualProfile?.leafShape || item.leafShape || "broad"),
        colorProfile: String(item.visualProfile?.colorProfile || item.colorProfile || "Green with orange pistils").trim(),
      };
      
      // Normalize morphology (backward compat)
      const morphology = {
        budDensity: visualProfile.budStructure,
        leafShape: visualProfile.leafShape,
        trichomeDensity: visualProfile.trichomeDensity,
        pistilColor: visualProfile.pistilColor,
      };
      
      // Normalize terpene profile
      const terpeneProfile = Array.isArray(item.terpeneProfile || item.commonTerpenes)
        ? (item.terpeneProfile || item.commonTerpenes).map((t: any) => String(t).toLowerCase().trim())
        : item.terpeneProfile || item.commonTerpenes
        ? [String(item.terpeneProfile || item.commonTerpenes).toLowerCase().trim()]
        : [];
      
      // Normalize effects
      const effects = Array.isArray(item.effects)
        ? item.effects.map((e: any) => String(e).trim()).filter(Boolean)
        : item.effects
        ? [String(item.effects).trim()].filter(Boolean)
        : [];
      
      // Normalize sources
      const sources = Array.isArray(item.sources)
        ? item.sources.map((s: any) => String(s).trim()).filter(Boolean)
        : item.sources
        ? [String(item.sources).trim()].filter(Boolean)
        : ["Database"];
      
      const normalized: CultivarReference = {
        name,
        aliases,
        genetics,
        type,
        dominantType: type, // Backward compat
        visualProfile,
        morphology,
        terpeneProfile,
        commonTerpenes: terpeneProfile, // Backward compat
        effects,
        sources,
        // Add indica/sativa ratio (as any to extend type if needed)
        indicaPercent,
        sativaPercent,
      } as any;
      
      // Add optional wikiSummary only if it exists
      if (item.wikiSummary || item.summary || item.description) {
        normalized.wikiSummary = item.wikiSummary || item.summary || item.description || undefined;
      }
      
      return normalized;
    })
    .filter((item): item is CultivarReference => item !== null);
}

/**
 * Normalize density values (low/medium/high)
 */
function normalizeDensity(value: any): "low" | "medium" | "high" {
  const str = String(value || "medium").toLowerCase().trim();
  if (str.includes("high") || str.includes("heavy") || str.includes("dense")) return "high";
  if (str.includes("low") || str.includes("light") || str.includes("sparse")) return "low";
  return "medium";
}

/**
 * Normalize leaf shape (narrow/broad)
 */
function normalizeLeafShape(value: any): "narrow" | "broad" {
  const str = String(value || "broad").toLowerCase().trim();
  if (str.includes("narrow") || str.includes("thin") || str.includes("sativa")) return "narrow";
  return "broad";
}

/**
 * Phase 5.0.1 — Initialize database on module load
 * This will be called when the module is imported
 */
let cachedDatabase: CultivarReference[] | null = null;
let loadPromise: Promise<CultivarReference[]> | null = null;

export async function getStrainDatabase(): Promise<CultivarReference[]> {
  if (cachedDatabase) {
    return cachedDatabase;
  }
  
  if (loadPromise) {
    return loadPromise;
  }
  
  loadPromise = loadStrainDatabase()
    .then(db => {
      cachedDatabase = db;
      return db;
    })
    .catch(error => {
      loadPromise = null;
      throw error;
    });
  
  return loadPromise;
}

/**
 * Phase 5.0.1 — Synchronous getter (for backward compat)
 * WARNING: Will throw if database not loaded yet
 */
export function getStrainDatabaseSync(): CultivarReference[] {
  if (!cachedDatabase) {
    throw new Error(
      "Phase 5.0.1 — Database not loaded yet. Use getStrainDatabase() (async) or ensure database is loaded first."
    );
  }
  return cachedDatabase;
}
