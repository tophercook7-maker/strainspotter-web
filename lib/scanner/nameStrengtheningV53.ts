// Phase 5.3 — NAME-FIRST STRENGTHENING & ALIAS MATCHING
// lib/scanner/nameStrengtheningV53.ts

import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";

/**
 * Phase 5.3 — Name Source Priority
 * 
 * 1. Direct database name match
 * 2. Alias / synonym match
 * 3. Lineage-derived inference
 * 4. Phenotype similarity fallback
 */
export type NameSource = "direct" | "alias" | "lineage" | "phenotype";

/**
 * Phase 5.3 — Name Candidate with Scoring
 */
export type NameCandidateV53 = {
  name: string;
  canonicalName: string; // Normalized canonical name
  score: number; // 0-100
  source: NameSource;
  frequency: number; // How many images mentioned this name
  databaseConfidence: number; // 0-1 (DB match strength)
  lineageOverlap: number; // 0-1 (lineage similarity)
  morphologySimilarity: number; // 0-1 (visual trait similarity)
  dbEntry?: CultivarReference; // Database entry if found
  isAlias: boolean; // True if matched via alias
};

/**
 * Phase 5.3 — Normalized Name Index
 * 
 * Maps lowercase + stripped names → canonical strain
 * Supports:
 * - Common aliases
 * - Breeder cuts (e.g. "GSC (Forum Cut)")
 * - Abbreviations (e.g. "GDP" → "Granddaddy Purple")
 */
let normalizedNameIndex: Map<string, CultivarReference> | null = null;

/**
 * Phase 5.3 — Build Normalized Name Index
 * 
 * Creates a map of all possible name variations → canonical strain
 */
function buildNormalizedNameIndex(): Map<string, CultivarReference> {
  if (normalizedNameIndex !== null) {
    return normalizedNameIndex;
  }

  const index = new Map<string, CultivarReference>();

  for (const strain of CULTIVAR_LIBRARY) {
    // Normalize function: lowercase, strip spaces, remove special chars
    const normalize = (s: string): string => {
      return s.toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9]/g, "");
    };

    // Add canonical name
    const canonicalKey = normalize(strain.name);
    if (!index.has(canonicalKey)) {
      index.set(canonicalKey, strain);
    }

    // Add all aliases
    for (const alias of strain.aliases || []) {
      const aliasKey = normalize(alias);
      if (!index.has(aliasKey)) {
        index.set(aliasKey, strain);
      }
    }

    // Add abbreviation patterns (e.g., "OG Kush" → "OGK", "OG")
    const words = strain.name.split(/\s+/);
    if (words.length > 1) {
      // First letter of each word
      const abbreviation = words.map(w => w[0]).join("").toLowerCase();
      const abbrevKey = normalize(abbreviation);
      if (!index.has(abbrevKey) && abbrevKey.length >= 2) {
        index.set(abbrevKey, strain);
      }
    }
  }

  normalizedNameIndex = index;
  return index;
}

/**
 * Phase 5.3 — Find Strain by Name or Alias
 * 
 * Priority:
 * 1. Direct database name match
 * 2. Alias / synonym match
 * 3. Lineage-derived inference (if name contains parent names)
 * 4. Phenotype similarity fallback (returns null, handled by caller)
 */
export function findStrainByNameOrAlias(
  candidateName: string
): { strain: CultivarReference; source: NameSource; isAlias: boolean } | null {
  const index = buildNormalizedNameIndex();
  
  const normalize = (s: string): string => {
    return s.toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const normalized = normalize(candidateName);

  // 1) Direct database name match
  const directMatch = CULTIVAR_LIBRARY.find(s => 
    normalize(s.name) === normalized || s.name.toLowerCase() === candidateName.toLowerCase()
  );
  if (directMatch) {
    return { strain: directMatch, source: "direct", isAlias: false };
  }

  // 2) Alias / synonym match
  const aliasMatch = index.get(normalized);
  if (aliasMatch) {
    // Check if it's actually an alias (not the canonical name)
    const isAlias = normalize(aliasMatch.name) !== normalized;
    return { strain: aliasMatch, source: "alias", isAlias };
  }

  // 3) Lineage-derived inference (check if name contains parent strain names)
  // This is a simple heuristic - could be enhanced
  for (const strain of CULTIVAR_LIBRARY) {
    if (strain.genetics) {
      const parents = strain.genetics.split(/[×x]/).map(p => p.trim().toLowerCase());
      const candidateLower = candidateName.toLowerCase();
      // Check if candidate name matches a parent name
      for (const parent of parents) {
        if (candidateLower.includes(parent) || parent.includes(candidateLower)) {
          return { strain, source: "lineage", isAlias: false };
        }
      }
    }
  }

  // 4) Phenotype similarity fallback - returns null (handled by caller)
  return null;
}

/**
 * Phase 5.3 — Score Name Candidate
 * 
 * Scores each candidate by:
 * - Frequency across images (0-40 points)
 * - Database confidence (0-30 points)
 * - Lineage overlap (0-15 points)
 * - Morphology similarity (0-15 points)
 */
export function scoreNameCandidateV53(args: {
  candidateName: string;
  frequency: number; // How many images mentioned this name
  maxFrequency: number; // Total number of images
  databaseMatch?: CultivarReference; // Database entry if found
  lineageOverlap?: number; // 0-1 (lineage similarity with observed traits)
  morphologySimilarity?: number; // 0-1 (visual trait similarity)
}): NameCandidateV53 {
  const {
    candidateName,
    frequency,
    maxFrequency,
    databaseMatch,
    lineageOverlap = 0.5,
    morphologySimilarity = 0.5,
  } = args;

  // Find strain by name or alias
  const matchResult = findStrainByNameOrAlias(candidateName);
  
  let canonicalName = candidateName;
  let source: NameSource = "phenotype";
  let isAlias = false;
  let dbEntry: CultivarReference | undefined = databaseMatch;

  if (matchResult) {
    canonicalName = matchResult.strain.name;
    source = matchResult.source;
    isAlias = matchResult.isAlias;
    dbEntry = matchResult.strain;
  } else if (databaseMatch) {
    canonicalName = databaseMatch.name;
    dbEntry = databaseMatch;
    source = "direct";
  }

  // Score calculation (0-100)
  let score = 0;

  // Frequency across images (0-40 points)
  const frequencyScore = (frequency / Math.max(1, maxFrequency)) * 40;
  score += frequencyScore;

  // Database confidence (0-30 points)
  let databaseConfidence = 0;
  if (dbEntry) {
    if (source === "direct") {
      databaseConfidence = 1.0;
    } else if (source === "alias") {
      databaseConfidence = 0.9;
    } else if (source === "lineage") {
      databaseConfidence = 0.7;
    } else {
      databaseConfidence = 0.5;
    }
  }
  score += databaseConfidence * 30;

  // Lineage overlap (0-15 points)
  score += lineageOverlap * 15;

  // Morphology similarity (0-15 points)
  score += morphologySimilarity * 15;

  // Round to integer
  score = Math.round(Math.min(100, Math.max(0, score)));

  return {
    name: candidateName,
    canonicalName,
    score,
    source,
    frequency,
    databaseConfidence,
    lineageOverlap,
    morphologySimilarity,
    dbEntry,
    isAlias,
  };
}

/**
 * Phase 5.3 — Strengthen Name Selection
 * 
 * Main function that:
 * 1. Collects name candidates from images
 * 2. Scores each candidate
 * 3. Returns top 3: primaryStrainName + alternateMatches[]
 * 4. Ensures guardrails (never "Unknown" or empty)
 */
export function strengthenNameSelectionV53(args: {
  perImageTopNames: string[]; // Top candidate per image
  imageCount: number;
  databaseCandidates?: CultivarReference[]; // Candidates from database filter
  observedLineage?: string; // Observed lineage/genetics (if any)
  observedMorphology?: any; // Observed visual traits (if any)
}): {
  primaryStrainName: string;
  alternateMatches: Array<{ name: string; score: number; source: NameSource }>;
  selectedSource: NameSource;
  selectedScore: number;
} {
  const {
    perImageTopNames,
    imageCount,
    databaseCandidates = [],
    observedLineage,
    observedMorphology,
  } = args;

  // Count frequency of each name across images
  const nameFrequency = new Map<string, number>();
  for (const name of perImageTopNames) {
    if (name && name.trim()) {
      const normalized = name.trim();
      nameFrequency.set(normalized, (nameFrequency.get(normalized) || 0) + 1);
    }
  }

  // Score all candidates
  const scoredCandidates: NameCandidateV53[] = [];

  // Score names from per-image results
  for (const [name, frequency] of nameFrequency.entries()) {
    // Find database match
    const dbMatch = databaseCandidates.find(c => 
      c.name.toLowerCase() === name.toLowerCase() ||
      c.aliases?.some(a => a.toLowerCase() === name.toLowerCase())
    ) || findStrainByNameOrAlias(name)?.strain;

    // Calculate lineage overlap (simple heuristic)
    let lineageOverlap = 0.5;
    if (dbMatch && observedLineage && dbMatch.genetics) {
      const dbLineage = dbMatch.genetics.toLowerCase();
      const observed = observedLineage.toLowerCase();
      // Simple overlap check
      if (dbLineage.includes(observed) || observed.includes(dbLineage)) {
        lineageOverlap = 0.9;
      } else {
        // Check for common parent names
        const dbParents = dbLineage.split(/[×x]/).map(p => p.trim());
        const observedParents = observed.split(/[×x]/).map(p => p.trim());
        const commonParents = dbParents.filter(p => observedParents.includes(p));
        if (commonParents.length > 0) {
          lineageOverlap = 0.7;
        }
      }
    }

    // Calculate morphology similarity (simple heuristic)
    let morphologySimilarity = 0.5;
    if (dbMatch && observedMorphology && dbMatch.visualProfile) {
      // Simple trait matching (could be enhanced)
      morphologySimilarity = 0.6; // Default moderate similarity
    }

    const scored = scoreNameCandidateV53({
      candidateName: name,
      frequency,
      maxFrequency: imageCount,
      databaseMatch: dbMatch,
      lineageOverlap,
      morphologySimilarity,
    });

    scoredCandidates.push(scored);
  }

  // Also score database candidates that weren't in per-image results
  for (const dbCandidate of databaseCandidates) {
    const alreadyScored = scoredCandidates.some(c => 
      c.canonicalName.toLowerCase() === dbCandidate.name.toLowerCase()
    );
    if (!alreadyScored) {
      const scored = scoreNameCandidateV53({
        candidateName: dbCandidate.name,
        frequency: 0, // Not in per-image results
        maxFrequency: imageCount,
        databaseMatch: dbCandidate,
        lineageOverlap: 0.5,
        morphologySimilarity: 0.5,
      });
      scoredCandidates.push(scored);
    }
  }

  // Sort by score (descending)
  scoredCandidates.sort((a, b) => b.score - a.score);

  // Select primary name (top candidate)
  let primaryStrainName: string;
  let selectedSource: NameSource = "phenotype";
  let selectedScore = 0;

  if (scoredCandidates.length > 0 && scoredCandidates[0].score >= 30) {
    // Use top candidate if score is reasonable
    primaryStrainName = scoredCandidates[0].canonicalName;
    selectedSource = scoredCandidates[0].source;
    selectedScore = scoredCandidates[0].score;
  } else {
    // Guardrails: Never show "Unknown" or empty
    // Pick best-known parent or sibling strain
    if (databaseCandidates.length > 0) {
      primaryStrainName = databaseCandidates[0].name;
      selectedSource = "direct";
      selectedScore = 40; // Default moderate score
    } else if (CULTIVAR_LIBRARY.length > 0) {
      // Fallback to first strain in database (shouldn't happen in production)
      primaryStrainName = CULTIVAR_LIBRARY[0].name;
      selectedSource = "direct";
      selectedScore = 30;
    } else {
      // Last resort fallback
      primaryStrainName = "Closest Known Cultivar";
      selectedSource = "phenotype";
      selectedScore = 25;
    }
  }

  // Select alternate matches (top 3, excluding primary)
  const alternateMatches = scoredCandidates
    .filter(c => c.canonicalName.toLowerCase() !== primaryStrainName.toLowerCase())
    .slice(0, 3)
    .map(c => ({
      name: c.canonicalName,
      score: c.score,
      source: c.source,
    }));

  return {
    primaryStrainName,
    alternateMatches,
    selectedSource,
    selectedScore,
  };
}
