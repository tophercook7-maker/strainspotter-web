// Phase 5.0.1 — Strain Fingerprint Model (LOCK)
// lib/scanner/strainFingerprintModel.ts

import type { CultivarReference } from "./cultivarLibrary";

/**
 * Phase 5.0.1 — Strain Fingerprint Model
 * 
 * One compact, comparable representation per strain.
 * Enables fast similarity math instead of ad-hoc logic.
 * 
 * All vectors are normalized to enable efficient comparison.
 */
export type StrainFingerprint = {
  canonicalName: string; // Normalized primary name
  aliases: string[]; // Normalized alias names
  geneticLineageVector: GeneticLineageVector;
  terpeneVector: TerpeneVector;
  effectVector: EffectVector;
  visualBaselineVector: VisualBaselineVector;
  growthTraitsVector: GrowthTraitsVector;
};

/**
 * Phase 5.0.1.1 — Genetic Lineage Vector
 * Normalized representation of genetics/lineage
 */
export type GeneticLineageVector = {
  parentNames: string[]; // Normalized parent names (sorted)
  type: "indica" | "sativa" | "hybrid" | "unknown"; // Normalized type
  lineageDepth: number; // How many generations back (0 = unknown, 1 = direct parents, 2+ = grandparents)
  hash: string; // Quick comparison hash: "parent1×parent2|type"
};

/**
 * Phase 5.0.1.2 — Terpene Vector
 * Normalized terpene profile representation
 */
export type TerpeneVector = {
  dominant: string[]; // Top 3 dominant terpenes (normalized, sorted)
  secondary: string[]; // Secondary terpenes (normalized, sorted)
  profile: Map<string, number>; // Terpene name → relative frequency (0-1)
  hash: string; // Quick comparison hash: "terpene1,terpene2,terpene3"
};

/**
 * Phase 5.0.1.3 — Effect Vector
 * Normalized effect profile representation
 */
export type EffectVector = {
  primary: string[]; // Primary effects (normalized, sorted)
  secondary: string[]; // Secondary effects (normalized, sorted)
  categories: {
    physical: number; // 0-1, physical effect strength
    mental: number; // 0-1, mental effect strength
    medical: number; // 0-1, medical application strength
  };
  hash: string; // Quick comparison hash: "effect1,effect2,effect3"
};

/**
 * Phase 5.0.1.4 — Visual Baseline Vector
 * Normalized visual characteristics representation
 */
export type VisualBaselineVector = {
  density: number; // 0-1, bud density (low=0, medium=0.5, high=1)
  trichome: number; // 0-1, trichome density (low=0, medium=0.5, high=1)
  color: {
    primary: "lime" | "forest" | "purple" | "frost" | "mixed" | "unknown";
    secondary: string[]; // Additional colors
  };
  structure: {
    leafShape: "narrow" | "broad" | "mixed" | "unknown";
    calyxShape: "round" | "elongated" | "mixed" | "unknown";
  };
  pistil: string[]; // Normalized pistil colors (sorted)
  hash: string; // Quick comparison hash: "density:trichome:color:leaf:pistils"
};

/**
 * Phase 5.0.1.5 — Growth Traits Vector
 * Normalized growth characteristics representation
 */
export type GrowthTraitsVector = {
  difficulty: number; // 0-1, growing difficulty (easy=0, medium=0.5, hard=1)
  floweringTime: number; // 0-1, normalized flowering time (fast=0, medium=0.5, slow=1)
  yield: number; // 0-1, normalized yield (low=0, medium=0.5, high=1)
  environment: {
    indoor: boolean;
    outdoor: boolean;
    greenhouse: boolean;
  };
  hash: string; // Quick comparison hash: "difficulty:flowering:yield:environment"
};

/**
 * Phase 5.0.1 — Normalize String
 * Converts to lowercase, trims, removes special chars
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Phase 5.0.1.1 — Generate Genetic Lineage Vector
 */
function generateGeneticLineageVector(strain: CultivarReference): GeneticLineageVector {
  const genetics = (strain.genetics || "").trim();
  const type = (strain.type || strain.dominantType || "hybrid").toLowerCase() as "indica" | "sativa" | "hybrid" | "unknown";
  
  // Extract parent names from genetics (format: "Parent1 × Parent2" or "Parent1 x Parent2")
  let parentNames: string[] = [];
  let lineageDepth = 0;
  
  if (genetics.length > 0) {
    const normalized = normalizeString(genetics);
    const parents = normalized
      .split(/[×x]/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    if (parents.length >= 2) {
      parentNames = parents.map(normalizeString).sort();
      lineageDepth = 1; // Direct parents known
    } else if (parents.length === 1) {
      parentNames = [normalizeString(parents[0])];
      lineageDepth = 0.5; // Partial lineage
    }
  }
  
  // Normalize type
  const normalizedType = type === "indica" || type === "sativa" || type === "hybrid" 
    ? type 
    : "unknown";
  
  // Create hash for quick comparison
  const hash = parentNames.length > 0 
    ? `${parentNames.join("×")}|${normalizedType}`
    : `unknown|${normalizedType}`;
  
  return {
    parentNames,
    type: normalizedType,
    lineageDepth,
    hash,
  };
}

/**
 * Phase 5.0.1.2 — Generate Terpene Vector
 */
function generateTerpeneVector(strain: CultivarReference): TerpeneVector {
  const terpenes = (strain.terpeneProfile || strain.commonTerpenes || [])
    .map(t => typeof t === "string" ? t : (t as any).name || "")
    .map(normalizeString)
    .filter(t => t.length > 0)
    .sort();
  
  // Dominant: top 3
  const dominant = terpenes.slice(0, 3);
  
  // Secondary: rest
  const secondary = terpenes.slice(3);
  
  // Profile: create frequency map (assume first terpenes are more dominant)
  const profile = new Map<string, number>();
  terpenes.forEach((terpene, index) => {
    // Higher index = lower frequency (simple heuristic)
    const frequency = Math.max(0.1, 1.0 - (index * 0.15));
    profile.set(terpene, frequency);
  });
  
  // Create hash for quick comparison
  const hash = dominant.length > 0 ? dominant.join(",") : "unknown";
  
  return {
    dominant,
    secondary,
    profile,
    hash,
  };
}

/**
 * Phase 5.0.1.3 — Generate Effect Vector
 */
function generateEffectVector(strain: CultivarReference): EffectVector {
  const effects = (strain.effects || [])
    .map(e => normalizeString(e))
    .filter(e => e.length > 0)
    .sort();
  
  // Primary: top 3-5 effects
  const primary = effects.slice(0, 5);
  
  // Secondary: rest
  const secondary = effects.slice(5);
  
  // Categorize effects
  const physicalKeywords = ["relax", "body", "sedat", "calm", "sleep", "pain", "muscle", "couch"];
  const mentalKeywords = ["euphor", "creativ", "focus", "energ", "uplift", "cerebral", "head"];
  const medicalKeywords = ["anxiet", "depress", "nausea", "appetite", "inflamm", "seizure", "ptsd"];
  
  let physical = 0;
  let mental = 0;
  let medical = 0;
  
  effects.forEach(effect => {
    const effectLower = effect.toLowerCase();
    if (physicalKeywords.some(kw => effectLower.includes(kw))) physical += 0.2;
    if (mentalKeywords.some(kw => effectLower.includes(kw))) mental += 0.2;
    if (medicalKeywords.some(kw => effectLower.includes(kw))) medical += 0.2;
  });
  
  // Normalize to 0-1
  physical = Math.min(1.0, physical);
  mental = Math.min(1.0, mental);
  medical = Math.min(1.0, medical);
  
  // Create hash for quick comparison
  const hash = primary.length > 0 ? primary.slice(0, 3).join(",") : "unknown";
  
  return {
    primary,
    secondary,
    categories: {
      physical,
      mental,
      medical,
    },
    hash,
  };
}

/**
 * Phase 5.0.1.4 — Generate Visual Baseline Vector
 */
function generateVisualBaselineVector(strain: CultivarReference): VisualBaselineVector {
  const visual = strain.visualProfile || {
    budStructure: strain.morphology.budDensity,
    trichomeDensity: strain.morphology.trichomeDensity,
    leafShape: strain.morphology.leafShape,
    pistilColor: strain.morphology.pistilColor,
    colorProfile: "",
  };
  
  // Normalize density (low=0, medium=0.5, high=1)
  const densityMap: Record<string, number> = {
    low: 0.33,
    medium: 0.67,
    high: 1.0,
  };
  const density = densityMap[(visual as any).budStructure?.toLowerCase() || (visual as any).budDensity?.toLowerCase() || "medium"] || 0.5;
  
  // Normalize trichome (low=0, medium=0.5, high=1)
  const trichome = densityMap[(visual as any).trichomeDensity?.toLowerCase() || "medium"] || 0.5;
  
  // Extract color
  const colorProfile = ((visual as any).colorProfile || "").toLowerCase();
  let primary: "lime" | "forest" | "purple" | "frost" | "mixed" | "unknown" = "unknown";
  const secondary: string[] = [];
  
  if (colorProfile.includes("lime") || colorProfile.includes("bright green") || colorProfile.includes("light green")) {
    primary = "lime";
  } else if (colorProfile.includes("forest") || colorProfile.includes("deep green") || colorProfile.includes("dark green")) {
    primary = "forest";
  } else if (colorProfile.includes("purple") || colorProfile.includes("violet")) {
    primary = "purple";
  } else if (colorProfile.includes("frost") || colorProfile.includes("white") || colorProfile.includes("silver")) {
    primary = "frost";
  } else if (colorProfile.includes("green")) {
    primary = "forest"; // Default green to forest
  }
  
  // Extract secondary colors
  if (colorProfile.includes("orange")) secondary.push("orange");
  if (colorProfile.includes("red")) secondary.push("red");
  if (colorProfile.includes("blue")) secondary.push("blue");
  if (colorProfile.includes("pink")) secondary.push("pink");
  if (colorProfile.includes("amber")) secondary.push("amber");
  if (colorProfile.includes("yellow")) secondary.push("yellow");
  
  // Normalize structure
  const leafShape = ((visual as any).leafShape || "broad").toLowerCase();
  const normalizedLeafShape: "narrow" | "broad" | "mixed" | "unknown" = 
    leafShape === "narrow" ? "narrow" :
    leafShape === "broad" ? "broad" :
    leafShape === "mixed" ? "mixed" : "unknown";
  
  // Calyx shape (infer from bud structure if not explicit)
  const calyxShape: "round" | "elongated" | "mixed" | "unknown" = 
    density >= 0.8 ? "round" : // Dense buds = round calyxes
    density <= 0.3 ? "elongated" : // Airy buds = elongated calyxes
    "mixed";
  
  // Normalize pistil colors
  const pistil = ((visual as any).pistilColor || [])
    .map((c: string) => normalizeString(c))
    .sort();
  
  // Create hash for quick comparison
  const hash = `${density.toFixed(1)}:${trichome.toFixed(1)}:${primary}:${normalizedLeafShape}:${pistil.join(",")}`;
  
  return {
    density,
    trichome,
    color: {
      primary,
      secondary,
    },
    structure: {
      leafShape: normalizedLeafShape,
      calyxShape,
    },
    pistil,
    hash,
  };
}

/**
 * Phase 5.0.1.5 — Generate Growth Traits Vector
 */
function generateGrowthTraitsVector(strain: CultivarReference): GrowthTraitsVector {
  // Extract from wikiSummary or notes if available
  const wikiSummary = (strain.wikiSummary || "").toLowerCase();
  const notes = ((strain.notes || "") + " " + (strain.breederNotes || "")).toLowerCase();
  const combined = wikiSummary + " " + notes;
  
  // Difficulty (easy=0, medium=0.5, hard=1)
  let difficulty = 0.5; // Default medium
  if (combined.includes("easy") || combined.includes("beginner") || combined.includes("forgiving")) {
    difficulty = 0.33;
  } else if (combined.includes("hard") || combined.includes("difficult") || combined.includes("challenging") || combined.includes("advanced")) {
    difficulty = 0.67;
  }
  
  // Flowering time (fast=0, medium=0.5, slow=1)
  let floweringTime = 0.5; // Default medium
  if (combined.includes("fast") || combined.includes("quick") || combined.includes("short")) {
    floweringTime = 0.33;
  } else if (combined.includes("slow") || combined.includes("long") || combined.includes("extended")) {
    floweringTime = 0.67;
  }
  
  // Yield (low=0, medium=0.5, high=1)
  let yield_ = 0.5; // Default medium
  if (combined.includes("high yield") || combined.includes("heavy yield") || combined.includes("abundant")) {
    yield_ = 0.67;
  } else if (combined.includes("low yield") || combined.includes("light yield") || combined.includes("modest")) {
    yield_ = 0.33;
  }
  
  // Environment (infer from type and notes)
  const isIndica = (strain.type || strain.dominantType || "").toLowerCase() === "indica";
  const isSativa = (strain.type || strain.dominantType || "").toLowerCase() === "sativa";
  
  const indoor = combined.includes("indoor") || !combined.includes("outdoor") || isIndica;
  const outdoor = combined.includes("outdoor") || isSativa;
  const greenhouse = combined.includes("greenhouse") || combined.includes("green house");
  
  // Create hash for quick comparison
  const hash = `${difficulty.toFixed(1)}:${floweringTime.toFixed(1)}:${yield_.toFixed(1)}:${indoor ? "i" : ""}${outdoor ? "o" : ""}${greenhouse ? "g" : ""}`;
  
  return {
    difficulty,
    floweringTime,
    yield: yield_,
    environment: {
      indoor,
      outdoor,
      greenhouse,
    },
    hash,
  };
}

/**
 * Phase 5.0.1 — Generate Strain Fingerprint
 * 
 * Creates a normalized, vector-based fingerprint for a strain.
 * This enables fast similarity calculations across the 35,000+ database.
 */
export function generateStrainFingerprint(strain: CultivarReference): StrainFingerprint {
  // Normalize canonical name
  const canonicalName = normalizeString(strain.name);
  
  // Normalize aliases
  const aliases = (strain.aliases || [])
    .map(a => normalizeString(a))
    .filter(a => a.length > 0 && a !== canonicalName); // Remove duplicates and empty
  
  // Generate vectors
  const geneticLineageVector = generateGeneticLineageVector(strain);
  const terpeneVector = generateTerpeneVector(strain);
  const effectVector = generateEffectVector(strain);
  const visualBaselineVector = generateVisualBaselineVector(strain);
  const growthTraitsVector = generateGrowthTraitsVector(strain);
  
  return {
    canonicalName,
    aliases,
    geneticLineageVector,
    terpeneVector,
    effectVector,
    visualBaselineVector,
    growthTraitsVector,
  };
}

/**
 * Phase 5.0.1 — Generate Fingerprints for All Strains
 * 
 * Pre-computes fingerprints for the entire database.
 * This should be called once at startup or lazily cached.
 */
export function generateAllStrainFingerprints(
  strains: CultivarReference[]
): Map<string, StrainFingerprint> {
  const fingerprintMap = new Map<string, StrainFingerprint>();
  
  for (const strain of strains) {
    const fingerprint = generateStrainFingerprint(strain);
    
    // Store by canonical name
    fingerprintMap.set(fingerprint.canonicalName, fingerprint);
    
    // Also store by aliases for fast lookup
    for (const alias of fingerprint.aliases) {
      if (!fingerprintMap.has(alias)) {
        fingerprintMap.set(alias, fingerprint);
      }
    }
  }
  
  return fingerprintMap;
}

/**
 * Phase 5.0.1 — Calculate Fingerprint Similarity
 * 
 * Fast similarity calculation between two fingerprints.
 * Returns 0-1 similarity score.
 */
export function calculateFingerprintSimilarity(
  fingerprint1: StrainFingerprint,
  fingerprint2: StrainFingerprint
): number {
  let totalSimilarity = 0;
  let weightSum = 0;
  
  // Genetic similarity (30% weight)
  const geneticSim = calculateGeneticSimilarity(
    fingerprint1.geneticLineageVector,
    fingerprint2.geneticLineageVector
  );
  totalSimilarity += geneticSim * 0.30;
  weightSum += 0.30;
  
  // Terpene similarity (20% weight)
  const terpeneSim = calculateTerpeneSimilarity(
    fingerprint1.terpeneVector,
    fingerprint2.terpeneVector
  );
  totalSimilarity += terpeneSim * 0.20;
  weightSum += 0.20;
  
  // Effect similarity (15% weight)
  const effectSim = calculateEffectSimilarity(
    fingerprint1.effectVector,
    fingerprint2.effectVector
  );
  totalSimilarity += effectSim * 0.15;
  weightSum += 0.15;
  
  // Visual similarity (25% weight)
  const visualSim = calculateVisualSimilarity(
    fingerprint1.visualBaselineVector,
    fingerprint2.visualBaselineVector
  );
  totalSimilarity += visualSim * 0.25;
  weightSum += 0.25;
  
  // Growth traits similarity (10% weight)
  const growthSim = calculateGrowthSimilarity(
    fingerprint1.growthTraitsVector,
    fingerprint2.growthTraitsVector
  );
  totalSimilarity += growthSim * 0.10;
  weightSum += 0.10;
  
  // Normalize by weight sum (should be 1.0, but handle edge cases)
  return weightSum > 0 ? totalSimilarity / weightSum : 0;
}

/**
 * Phase 5.0.1 — Calculate Genetic Similarity
 */
function calculateGeneticSimilarity(
  vec1: GeneticLineageVector,
  vec2: GeneticLineageVector
): number {
  // Type match (50% of genetic similarity)
  let similarity = vec1.type === vec2.type ? 0.5 : 0;
  
  // Parent overlap (50% of genetic similarity)
  if (vec1.parentNames.length > 0 && vec2.parentNames.length > 0) {
    const overlap = vec1.parentNames.filter(p1 => 
      vec2.parentNames.some(p2 => p1 === p2 || p1.includes(p2) || p2.includes(p1))
    ).length;
    const maxParents = Math.max(vec1.parentNames.length, vec2.parentNames.length);
    similarity += (overlap / maxParents) * 0.5;
  } else if (vec1.hash === vec2.hash) {
    // Exact hash match
    similarity = 1.0;
  }
  
  return Math.min(1.0, similarity);
}

/**
 * Phase 5.0.1 — Calculate Terpene Similarity
 */
function calculateTerpeneSimilarity(
  vec1: TerpeneVector,
  vec2: TerpeneVector
): number {
  // Dominant terpene overlap (60% of terpene similarity)
  const dominantOverlap = vec1.dominant.filter(t1 => vec2.dominant.includes(t1)).length;
  const dominantSim = dominantOverlap / Math.max(1, Math.max(vec1.dominant.length, vec2.dominant.length));
  
  // Profile overlap (40% of terpene similarity)
  let profileSim = 0;
  const allTerpenes = new Set([...vec1.profile.keys(), ...vec2.profile.keys()]);
  let totalDiff = 0;
  for (const terpene of allTerpenes) {
    const freq1 = vec1.profile.get(terpene) || 0;
    const freq2 = vec2.profile.get(terpene) || 0;
    totalDiff += Math.abs(freq1 - freq2);
  }
  profileSim = Math.max(0, 1.0 - (totalDiff / allTerpenes.size));
  
  return dominantSim * 0.6 + profileSim * 0.4;
}

/**
 * Phase 5.0.1 — Calculate Effect Similarity
 */
function calculateEffectSimilarity(
  vec1: EffectVector,
  vec2: EffectVector
): number {
  // Primary effect overlap (50% of effect similarity)
  const primaryOverlap = vec1.primary.filter(e1 => vec2.primary.includes(e1)).length;
  const primarySim = primaryOverlap / Math.max(1, Math.max(vec1.primary.length, vec2.primary.length));
  
  // Category similarity (50% of effect similarity)
  const categorySim = (
    (1 - Math.abs(vec1.categories.physical - vec2.categories.physical)) +
    (1 - Math.abs(vec1.categories.mental - vec2.categories.mental)) +
    (1 - Math.abs(vec1.categories.medical - vec2.categories.medical))
  ) / 3;
  
  return primarySim * 0.5 + categorySim * 0.5;
}

/**
 * Phase 5.0.1 — Calculate Visual Similarity
 */
function calculateVisualSimilarity(
  vec1: VisualBaselineVector,
  vec2: VisualBaselineVector
): number {
  // Density similarity (25%)
  const densitySim = 1 - Math.abs(vec1.density - vec2.density);
  
  // Trichome similarity (25%)
  const trichomeSim = 1 - Math.abs(vec1.trichome - vec2.trichome);
  
  // Color similarity (25%)
  const colorSim = vec1.color.primary === vec2.color.primary ? 1.0 : 
                   vec1.color.primary === "mixed" || vec2.color.primary === "mixed" ? 0.5 : 0;
  
  // Structure similarity (15%)
  const structureSim = (
    (vec1.structure.leafShape === vec2.structure.leafShape ? 1.0 : 0.5) +
    (vec1.structure.calyxShape === vec2.structure.calyxShape ? 1.0 : 0.5)
  ) / 2;
  
  // Pistil similarity (10%)
  const pistilOverlap = vec1.pistil.filter(p1 => vec2.pistil.includes(p1)).length;
  const pistilSim = pistilOverlap / Math.max(1, Math.max(vec1.pistil.length, vec2.pistil.length));
  
  return (
    densitySim * 0.25 +
    trichomeSim * 0.25 +
    colorSim * 0.25 +
    structureSim * 0.15 +
    pistilSim * 0.10
  );
}

/**
 * Phase 5.0.1 — Calculate Growth Similarity
 */
function calculateGrowthSimilarity(
  vec1: GrowthTraitsVector,
  vec2: GrowthTraitsVector
): number {
  // Difficulty similarity (30%)
  const difficultySim = 1 - Math.abs(vec1.difficulty - vec2.difficulty);
  
  // Flowering time similarity (30%)
  const floweringSim = 1 - Math.abs(vec1.floweringTime - vec2.floweringTime);
  
  // Yield similarity (20%)
  const yieldSim = 1 - Math.abs(vec1.yield - vec2.yield);
  
  // Environment overlap (20%)
  const envOverlap = (
    (vec1.environment.indoor === vec2.environment.indoor ? 1 : 0) +
    (vec1.environment.outdoor === vec2.environment.outdoor ? 1 : 0) +
    (vec1.environment.greenhouse === vec2.environment.greenhouse ? 1 : 0)
  ) / 3;
  
  return (
    difficultySim * 0.30 +
    floweringSim * 0.30 +
    yieldSim * 0.20 +
    envOverlap * 0.20
  );
}
