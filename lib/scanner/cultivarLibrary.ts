// lib/scanner/cultivarLibrary.ts
// Phase 2.3 Part F — Real Strain Database
// Phase 5.0.1 — UPDATED: Now loads from external database via dbLoader
// Canonical strain data model

import { getStrainDatabase, getStrainDatabaseSync } from "./dbLoader";

export type VisualProfile = {
  trichomeDensity: "low" | "medium" | "high";
  pistilColor: string[];
  budStructure: "low" | "medium" | "high";
  leafShape: "narrow" | "broad";
  colorProfile: string;
};

export type CultivarReference = {
  name: string;
  aliases: string[];
  genetics: string;
  type: "Indica" | "Sativa" | "Hybrid";
  dominantType: "Indica" | "Sativa" | "Hybrid"; // Keep for backward compat
  visualProfile: VisualProfile;
  morphology: {
    budDensity: "low" | "medium" | "high";
    leafShape: "narrow" | "broad";
    trichomeDensity: "low" | "medium" | "high";
    pistilColor: string[];
  }; // Keep for backward compat
  terpeneProfile: string[];
  commonTerpenes: string[]; // Keep for backward compat
  effects: string[];
  wikiSummary?: string;
  sources: string[];
  breederNotes?: string; // Optional breeder classification notes
  notes?: string; // Optional general notes
  breeder?: string; // Optional breeder name
};

/**
 * Phase 5.0.1 — FALLBACK: Legacy hardcoded strains
 * Only used if database loader fails (for development/testing)
 * 
 * WARNING: This is NOT the production database.
 * Production must load 35,000+ strains from lib/data/strains.json
 */
const LEGACY_FALLBACK_STRAINS: CultivarReference[] = [
  {
    name: "Northern Lights",
    aliases: ["NL", "Northern Light"],
    genetics: "Afghan × Thai",
    type: "Indica",
    dominantType: "Indica",
    visualProfile: {
      trichomeDensity: "high",
      pistilColor: ["amber", "orange"],
      budStructure: "high",
      leafShape: "broad",
      colorProfile: "Deep green with amber pistils and heavy trichome coverage",
    },
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["amber", "orange"],
    },
    terpeneProfile: ["myrcene", "caryophyllene", "pinene"],
    commonTerpenes: ["myrcene", "caryophyllene", "pinene"],
    effects: ["relaxation", "sedation", "body calm", "sleep"],
    wikiSummary: "Northern Lights is a legendary indica-dominant hybrid known for its dense, resinous buds and powerful relaxing effects. Originating from the Pacific Northwest, it combines Afghan and Thai genetics.",
    sources: ["Leafly", "AllBud", "Wikipedia"],
  },
  {
    name: "Blue Dream",
    aliases: ["BD", "Blue Dream Haze"],
    genetics: "Blueberry × Haze",
    type: "Sativa",
    dominantType: "Sativa",
    visualProfile: {
      trichomeDensity: "medium",
      pistilColor: ["orange"],
      budStructure: "medium",
      leafShape: "narrow",
      colorProfile: "Light green with orange pistils, elongated structure",
    },
    morphology: {
      budDensity: "medium",
      leafShape: "narrow",
      trichomeDensity: "medium",
      pistilColor: ["orange"],
    },
    terpeneProfile: ["myrcene", "pinene", "caryophyllene"],
    commonTerpenes: ["myrcene", "pinene", "caryophyllene"],
    effects: ["euphoria", "creativity", "uplifted", "focused"],
    wikiSummary: "Blue Dream is a sativa-dominant hybrid that combines the relaxing body effects of Blueberry with the cerebral stimulation of Haze. Known for its balanced effects and sweet berry aroma.",
    sources: ["Leafly", "AllBud", "SeedFinder"],
  },
  {
    name: "OG Kush",
    aliases: ["OGK", "Kush", "OG"],
    genetics: "Hindu Kush × Chemdawg",
    type: "Hybrid",
    dominantType: "Hybrid",
    visualProfile: {
      trichomeDensity: "high",
      pistilColor: ["orange"],
      budStructure: "high",
      leafShape: "broad",
      colorProfile: "Dense, resinous buds with orange pistils and heavy trichome coverage",
    },
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange"],
    },
    terpeneProfile: ["myrcene", "limonene", "caryophyllene"],
    commonTerpenes: ["myrcene", "limonene", "caryophyllene"],
    effects: ["relaxation", "euphoria", "hunger", "calm"],
    wikiSummary: "OG Kush is a legendary hybrid strain that has become one of the most popular and influential cultivars in cannabis history. Known for its potent effects and distinctive aroma.",
    sources: ["Leafly", "AllBud", "Wikipedia"],
  },
  {
    name: "White Widow",
    aliases: ["WW"],
    genetics: "Brazilian × South Indian",
    type: "Hybrid",
    dominantType: "Hybrid",
    visualProfile: {
      trichomeDensity: "high",
      pistilColor: ["white", "orange"],
      budStructure: "high",
      leafShape: "broad",
      colorProfile: "Dense, compact buds with white and orange pistils, extremely high trichome coverage",
    },
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["white", "orange"],
    },
    terpeneProfile: ["myrcene", "pinene", "caryophyllene"],
    commonTerpenes: ["myrcene", "pinene", "caryophyllene"],
    effects: ["euphoria", "energy", "creativity", "uplifted"],
    wikiSummary: "White Widow is a balanced hybrid known for its extremely high trichome production, giving buds a white, frosty appearance. A classic strain with balanced effects.",
    sources: ["Leafly", "AllBud", "SeedFinder"],
  },
  {
    name: "Sour Diesel",
    aliases: ["Sour D", "Sour", "Sour Diesel"],
    genetics: "Chemdawg × Super Skunk",
    type: "Sativa",
    dominantType: "Sativa",
    visualProfile: {
      trichomeDensity: "medium",
      pistilColor: ["orange"],
      budStructure: "low",
      leafShape: "narrow",
      colorProfile: "Elongated, foxtailed structure with orange pistils",
    },
    morphology: {
      budDensity: "low",
      leafShape: "narrow",
      trichomeDensity: "medium",
      pistilColor: ["orange"],
    },
    terpeneProfile: ["limonene", "myrcene", "caryophyllene"],
    commonTerpenes: ["limonene", "myrcene", "caryophyllene"],
    effects: ["energy", "euphoria", "creativity", "uplifted"],
    wikiSummary: "Sour Diesel is a sativa-dominant strain known for its energizing and uplifting effects. Characterized by its diesel-like aroma and elongated bud structure.",
    sources: ["Leafly", "AllBud"],
  },
  {
    name: "Purple Haze",
    aliases: [],
    genetics: "Purple Thai × Haze",
    type: "Sativa",
    dominantType: "Sativa",
    visualProfile: {
      trichomeDensity: "low",
      pistilColor: ["orange"],
      budStructure: "low",
      leafShape: "narrow",
      colorProfile: "Elongated sativa structure with purple hues and orange pistils",
    },
    morphology: {
      budDensity: "low",
      leafShape: "narrow",
      trichomeDensity: "low",
      pistilColor: ["orange"],
    },
    terpeneProfile: ["myrcene", "pinene", "limonene"],
    commonTerpenes: ["myrcene", "pinene", "limonene"],
    effects: ["energy", "euphoria", "creativity", "uplifted"],
    wikiSummary: "Purple Haze is a classic sativa strain made famous by Jimi Hendrix. Known for its energizing effects and distinctive purple coloration.",
    sources: ["Leafly", "Wikipedia"],
  },
  {
    name: "Granddaddy Purple",
    aliases: ["GDP", "Granddaddy Purp"],
    genetics: "Purple Urkle × Big Bud",
    type: "Indica",
    dominantType: "Indica",
    visualProfile: {
      trichomeDensity: "high",
      pistilColor: ["orange", "amber"],
      budStructure: "high",
      leafShape: "broad",
      colorProfile: "Dense, purple-tinted buds with orange and amber pistils",
    },
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange", "amber"],
    },
    terpeneProfile: ["myrcene", "caryophyllene", "pinene"],
    commonTerpenes: ["myrcene", "caryophyllene", "pinene"],
    effects: ["relaxation", "sedation", "hunger", "sleep"],
    wikiSummary: "Granddaddy Purple is a potent indica known for its deep purple coloration and heavy sedative effects. A favorite for evening use.",
    sources: ["Leafly", "AllBud"],
  },
  {
    name: "Girl Scout Cookies",
    aliases: ["GSC", "Cookies", "GSCookies"],
    genetics: "OG Kush × Durban Poison",
    type: "Hybrid",
    dominantType: "Hybrid",
    visualProfile: {
      trichomeDensity: "high",
      pistilColor: ["orange"],
      budStructure: "high",
      leafShape: "broad",
      colorProfile: "Dense, chunky buds with heavy trichome coverage and orange pistils",
    },
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange"],
    },
    terpeneProfile: ["caryophyllene", "limonene", "myrcene"],
    commonTerpenes: ["caryophyllene", "limonene", "myrcene"],
    effects: ["euphoria", "relaxation", "creativity", "happiness"],
    wikiSummary: "Girl Scout Cookies is a hybrid strain that combines the best of OG Kush and Durban Poison. Known for its balanced effects and sweet, earthy flavor.",
    sources: ["Leafly", "AllBud", "SeedFinder"],
  },
  {
    name: "Jack Herer",
    aliases: ["Jack"],
    genetics: "Northern Lights × Haze × Skunk",
    type: "Sativa",
    dominantType: "Sativa",
    visualProfile: {
      trichomeDensity: "medium",
      pistilColor: ["orange"],
      budStructure: "low",
      leafShape: "narrow",
      colorProfile: "Elongated sativa structure with orange pistils",
    },
    morphology: {
      budDensity: "low",
      leafShape: "narrow",
      trichomeDensity: "medium",
      pistilColor: ["orange"],
    },
    terpeneProfile: ["pinene", "myrcene", "caryophyllene"],
    commonTerpenes: ["pinene", "myrcene", "caryophyllene"],
    effects: ["energy", "euphoria", "creativity", "focus"],
    wikiSummary: "Jack Herer is a sativa-dominant strain named after the cannabis activist. Known for its energizing and creative effects.",
    sources: ["Leafly", "Wikipedia"],
  },
  {
    name: "Gelato",
    aliases: ["Larry Bird"],
    genetics: "Sunset Sherbet × Thin Mint GSC",
    type: "Hybrid",
    dominantType: "Hybrid",
    visualProfile: {
      trichomeDensity: "high",
      pistilColor: ["orange"],
      budStructure: "high",
      leafShape: "broad",
      colorProfile: "Dense, resinous buds with heavy trichome coverage",
    },
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange"],
    },
    terpeneProfile: ["limonene", "caryophyllene", "myrcene"],
    commonTerpenes: ["limonene", "caryophyllene", "myrcene"],
    effects: ["euphoria", "relaxation", "creativity", "happiness"],
    wikiSummary: "Gelato is a hybrid strain known for its dessert-like flavor profile and balanced effects. A popular modern cultivar.",
    sources: ["Leafly", "AllBud"],
  },
  {
    name: "Wedding Cake",
    aliases: ["Pink Cookies"],
    genetics: "Triangle Kush × Animal Mints",
    type: "Hybrid",
    dominantType: "Hybrid",
    visualProfile: {
      trichomeDensity: "high",
      pistilColor: ["orange"],
      budStructure: "high",
      leafShape: "broad",
      colorProfile: "Dense, chunky buds with heavy resin production",
    },
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange"],
    },
    terpeneProfile: ["limonene", "caryophyllene", "myrcene"],
    commonTerpenes: ["limonene", "caryophyllene", "myrcene"],
    effects: ["relaxation", "euphoria", "happiness", "calm"],
    wikiSummary: "Wedding Cake is a hybrid strain known for its sweet, vanilla-like flavor and relaxing yet euphoric effects.",
    sources: ["Leafly", "AllBud"],
  },
  {
    name: "AK-47",
    aliases: [],
    genetics: "Colombian × Mexican × Thai × Afghan",
    type: "Hybrid",
    dominantType: "Hybrid",
    visualProfile: {
      trichomeDensity: "high",
      pistilColor: ["orange"],
      budStructure: "high",
      leafShape: "broad",
      colorProfile: "Dense buds with high trichome coverage and orange pistils",
    },
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange"],
    },
    terpeneProfile: ["myrcene", "pinene", "caryophyllene"],
    commonTerpenes: ["myrcene", "pinene", "caryophyllene"],
    effects: ["euphoria", "relaxation", "uplifted", "happiness"],
    wikiSummary: "AK-47 is a balanced hybrid known for its potent effects and complex genetic lineage combining landrace strains from multiple continents.",
    sources: ["Leafly", "SeedFinder"],
  },
  {
    name: "Skunk #1",
    aliases: ["Skunk"],
    genetics: "Afghan × Acapulco Gold × Colombian Gold",
    type: "Hybrid",
    dominantType: "Hybrid",
    visualProfile: {
      trichomeDensity: "medium",
      pistilColor: ["orange"],
      budStructure: "medium",
      leafShape: "broad",
      colorProfile: "Medium-density buds with balanced structure",
    },
    morphology: {
      budDensity: "medium",
      leafShape: "broad",
      trichomeDensity: "medium",
      pistilColor: ["orange"],
    },
    terpeneProfile: ["myrcene", "caryophyllene", "limonene"],
    commonTerpenes: ["myrcene", "caryophyllene", "limonene"],
    effects: ["euphoria", "relaxation", "happiness", "uplifted"],
    wikiSummary: "Skunk #1 is a foundational hybrid strain that has been used in breeding many modern cultivars. Known for its balanced effects.",
    sources: ["Leafly", "Wikipedia"],
  },
  {
    name: "Trainwreck",
    aliases: [],
    genetics: "Mexican × Thai × Afghani",
    type: "Sativa",
    dominantType: "Sativa",
    visualProfile: {
      trichomeDensity: "medium",
      pistilColor: ["orange"],
      budStructure: "low",
      leafShape: "narrow",
      colorProfile: "Elongated sativa structure with moderate trichome coverage",
    },
    morphology: {
      budDensity: "low",
      leafShape: "narrow",
      trichomeDensity: "medium",
      pistilColor: ["orange"],
    },
    terpeneProfile: ["pinene", "myrcene", "caryophyllene"],
    commonTerpenes: ["pinene", "myrcene", "caryophyllene"],
    effects: ["energy", "euphoria", "creativity", "uplifted"],
    wikiSummary: "Trainwreck is a sativa-dominant strain known for its energizing effects and complex genetic background.",
    sources: ["Leafly", "AllBud"],
  },
  {
    name: "Chemdawg",
    aliases: ["Chem"],
    genetics: "Unknown (legendary)",
    type: "Hybrid",
    dominantType: "Hybrid",
    visualProfile: {
      trichomeDensity: "high",
      pistilColor: ["orange"],
      budStructure: "high",
      leafShape: "broad",
      colorProfile: "Dense, resinous buds with heavy trichome production",
    },
    morphology: {
      budDensity: "high",
      leafShape: "broad",
      trichomeDensity: "high",
      pistilColor: ["orange"],
    },
    terpeneProfile: ["limonene", "myrcene", "caryophyllene"],
    commonTerpenes: ["limonene", "myrcene", "caryophyllene"],
    effects: ["euphoria", "relaxation", "creativity", "uplifted"],
    wikiSummary: "Chemdawg is a legendary hybrid strain with mysterious origins. Known for its potent effects and distinctive chemical aroma.",
    sources: ["Leafly", "AllBud"],
  },
];

/**
 * Phase 5.0.1 — CULTIVAR_LIBRARY: Now loads from external database
 * 
 * REQUIREMENTS:
 * - Must have 10,000+ strains (hard fail if < 10,000)
 * - Logs size on boot: "STRAIN DB SIZE: <count>"
 * - Normalizes: name, aliases, lineage, ratio, terpenes
 */
let cachedLibrary: CultivarReference[] | null = null;
let libraryLoadPromise: Promise<CultivarReference[]> | null = null;
let isInitialized = false;

/**
 * Phase 5.0.1 — Initialize database (call at app startup)
 * This should be called early in the application lifecycle
 */
export async function initializeCultivarLibrary(): Promise<void> {
  if (isInitialized && cachedLibrary) {
    return;
  }
  
  if (libraryLoadPromise) {
    await libraryLoadPromise;
    return;
  }
  
  libraryLoadPromise = (async () => {
    try {
      // Phase 5.0.1 — Try to load from external database
      const db = await getStrainDatabase();
      cachedLibrary = db;
      // Phase 5.0.1 — Update the exported CULTIVAR_LIBRARY array
      updateCultivarLibrary(db);
      isInitialized = true;
      console.log(`Phase 5.0.1 — ✓ Cultivar library initialized: ${db.length} strains`);
      return db;
    } catch (error) {
      // Phase 5.0.1 — If database load fails, use fallback (will fail validation)
      console.error("Phase 5.0.1 — Database load failed, using fallback (will fail validation):", error);
      cachedLibrary = LEGACY_FALLBACK_STRAINS;
      // Keep fallback in CULTIVAR_LIBRARY (already there)
      isInitialized = true;
      // Re-throw to trigger validation failure
      throw error;
    }
  })();
  
  await libraryLoadPromise;
}

/**
 * Phase 5.0.1 — Synchronous getter (for backward compat)
 * Returns cached library or fallback if not loaded yet
 * 
 * WARNING: For production, ensure initializeCultivarLibrary() is called at app startup
 */
export function getCultivarLibrarySync(): CultivarReference[] {
  if (cachedLibrary) {
    return cachedLibrary;
  }
  
  try {
    const db = getStrainDatabaseSync();
    cachedLibrary = db;
    // Update the exported array
    updateCultivarLibrary(db);
    return db;
  } catch (error) {
    // If sync get fails, return fallback (but log warning)
    console.warn("Phase 5.0.1 — Database not loaded yet, using fallback. Call initializeCultivarLibrary() at app startup.");
    return LEGACY_FALLBACK_STRAINS;
  }
}

/**
 * Phase 5.0.1 — Backward compat: CULTIVAR_LIBRARY
 * 
 * OLD CODE: CULTIVAR_LIBRARY.find(...)
 * NEW CODE: Still works! Returns cached library or fallback
 * 
 * For production: Ensure initializeCultivarLibrary() is called at app startup
 * to load the full 35K database.
 * 
 * This array is populated after initialization.
 * Initially contains fallback strains, then gets replaced with full database.
 */
export const CULTIVAR_LIBRARY: CultivarReference[] = LEGACY_FALLBACK_STRAINS;

/**
 * Phase 5.0.1 — Update CULTIVAR_LIBRARY with loaded database
 * Called automatically after successful database load
 */
function updateCultivarLibrary(newLibrary: CultivarReference[]): void {
  // Clear existing array
  CULTIVAR_LIBRARY.length = 0;
  // Push all new entries
  CULTIVAR_LIBRARY.push(...newLibrary);
}

/**
 * DB AUTHORITY — Find strain by exact name match
 * 
 * @param name - Strain name (case-insensitive)
 * @returns CultivarReference or undefined if not found
 */
export function findByName(name: string): CultivarReference | undefined {
  const library = getCultivarLibrarySync();
  const normalizedName = name.toLowerCase().trim();
  return library.find(strain => 
    strain.name.toLowerCase().trim() === normalizedName
  );
}

/**
 * DB AUTHORITY — Find strain by alias match
 * 
 * @param alias - Alias name (case-insensitive)
 * @returns CultivarReference or undefined if not found
 */
export function findByAlias(alias: string): CultivarReference | undefined {
  const library = getCultivarLibrarySync();
  const normalizedAlias = alias.toLowerCase().trim();
  return library.find(strain => 
    strain.aliases.some(a => a.toLowerCase().trim() === normalizedAlias)
  );
}

/**
 * DB AUTHORITY — Find closest strain by visual traits
 * 
 * @param traits - Visual traits to match against
 * @param limit - Maximum number of results (default: 5)
 * @returns Array of CultivarReference sorted by similarity
 */
export function findClosestByTraits(traits: {
  leafShape?: "narrow" | "broad";
  budStructure?: "low" | "medium" | "high";
  trichomeDensity?: "low" | "medium" | "high";
  terpenes?: string[];
  type?: "Indica" | "Sativa" | "Hybrid";
}, limit: number = 5): CultivarReference[] {
  const library = getCultivarLibrarySync();
  
  // Score each strain based on trait matches
  const scored = library.map(strain => {
    let score = 0;
    
    // Leaf shape match
    if (traits.leafShape && strain.visualProfile.leafShape === traits.leafShape) {
      score += 3;
    }
    
    // Bud structure match
    if (traits.budStructure && strain.visualProfile.budStructure === traits.budStructure) {
      score += 3;
    }
    
    // Trichome density match
    if (traits.trichomeDensity && strain.visualProfile.trichomeDensity === traits.trichomeDensity) {
      score += 2;
    }
    
    // Type match
    if (traits.type && strain.type === traits.type) {
      score += 4;
    }
    
    // Terpene overlap
    if (traits.terpenes && traits.terpenes.length > 0 && strain.terpeneProfile.length > 0) {
      const matchingTerpenes = traits.terpenes.filter(t => 
        strain.terpeneProfile.some(st => st.toLowerCase().includes(t.toLowerCase()))
      );
      score += matchingTerpenes.length;
    }
    
    return { strain, score };
  });
  
  // Sort by score (descending) and return top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.strain);
}

/**
 * Phase 5.0.1 — Async getter for when you need to ensure database is loaded
 */
export async function getCultivarLibrary(): Promise<CultivarReference[]> {
  if (cachedLibrary) {
    return cachedLibrary;
  }
  
  if (libraryLoadPromise) {
    return libraryLoadPromise;
  }
  
  return initializeCultivarLibrary().then(() => cachedLibrary!);
}
