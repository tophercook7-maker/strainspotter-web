// lib/scanner/nameFirstMatcherV5.ts
// Phase 5.0.2 — Name-First Matching (Database-First)
// STEP 1: Database name/alias matching BEFORE image analysis

import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";
import type { FusedFeatures } from "./multiImageFusion";

/**
 * Phase 5.0.2 — Name Candidate from Database
 * Initial candidates from database matching (name + aliases)
 * BEFORE image trait filtering
 */
export type NameCandidate = {
  name: string;
  aliases: string[];
  dbEntry: CultivarReference;
  initialScore: number; // 0-100, based on name/alias match only
  matchType: "exact_name" | "alias" | "fuzzy";
};

/**
 * Phase 5.0.2 — Database-First Name Matching
 * 
 * STEP 1: Query database for name/alias matches
 * Returns top candidates BEFORE image analysis
 * 
 * This runs FIRST in the pipeline, before image traits are analyzed
 */
export function getDatabaseNameCandidates(
  fusedFeatures: FusedFeatures,
  imageCount: number
): NameCandidate[] {
  const candidates: NameCandidate[] = [];
  const db = CULTIVAR_LIBRARY;
  
  // Phase 5.0.2 — Validate database size
  if (db.length < 10000) {
    const error = new Error(
      `Phase 5.0.2 — CRITICAL: Database has only ${db.length} strains. ` +
      `Minimum required: 10,000. Name-first matching requires full database.`
    );
    console.error(error.message);
    throw error;
  }
  
  // Phase 5.0.2 — Step 1: Database name matching
  // Score all strains based on visual profile similarity (basic match)
  for (const strain of db) {
    const visualProfile = strain.visualProfile || {
      budStructure: strain.morphology?.budDensity || "medium",
      trichomeDensity: strain.morphology?.trichomeDensity || "medium",
      pistilColor: strain.morphology?.pistilColor || ["orange"],
      leafShape: strain.morphology?.leafShape || "broad",
      colorProfile: "",
    };
    
    let initialScore = 0;
    let matchType: "exact_name" | "alias" | "fuzzy" = "fuzzy";
    
    // Basic visual profile matching (light scoring, will be refined by images)
    if (fusedFeatures.budStructure === visualProfile.budStructure) {
      initialScore += 10;
    }
    if (fusedFeatures.trichomeDensity === visualProfile.trichomeDensity) {
      initialScore += 10;
    }
    if (fusedFeatures.leafShape === visualProfile.leafShape) {
      initialScore += 10;
    }
    
    // All strains get initial score (will be narrowed by images)
    if (initialScore > 0 || db.length < 50000) {
      // If database is small, include all; if large, only include those with some match
      candidates.push({
        name: strain.name,
        aliases: Array.isArray(strain.aliases) ? strain.aliases : [],
        dbEntry: strain,
        initialScore,
        matchType,
      });
    }
  }
  
  // Phase 5.0.2 — Sort by initial score, return top 100 candidates
  // Images will narrow this down further
  candidates.sort((a, b) => b.initialScore - a.initialScore);
  const topCandidates = candidates.slice(0, 100);
  
  // Phase 5.0.2 — MANDATORY LOG
  console.log("NAME CANDIDATES:", topCandidates.length);
  console.log("TOP NAME MATCH:", topCandidates[0]?.name || "NONE");
  console.log("ALTERNATES:", topCandidates.slice(1, 4).map(c => c.name));
  
  // Phase 5.0.2 — FAIL HARD if no candidates
  if (topCandidates.length === 0) {
    const error = new Error(
      "Phase 5.0.2 — CRITICAL: No name candidates found from database. " +
      "Database may be empty or corrupted."
    );
    console.error(error.message);
    throw error;
  }
  
  return topCandidates;
}

/**
 * Phase 5.0.2 — Filter name candidates using image traits
 * 
 * STEP 3: Image analysis narrows the database candidates
 * Only scores/ranks within the provided candidate set
 */
export function narrowCandidatesWithImageTraits(
  candidates: NameCandidate[],
  imageTraits: {
    budStructure?: "low" | "medium" | "high";
    trichomeDensity?: "low" | "medium" | "high";
    leafShape?: "narrow" | "broad";
    pistilColor?: string;
  }
): NameCandidate[] {
  // Score each candidate based on image traits
  const scored = candidates.map(candidate => {
    const visualProfile = candidate.dbEntry.visualProfile || {
      budStructure: candidate.dbEntry.morphology?.budDensity || "medium",
      trichomeDensity: candidate.dbEntry.morphology?.trichomeDensity || "medium",
      pistilColor: candidate.dbEntry.morphology?.pistilColor || ["orange"],
      leafShape: candidate.dbEntry.morphology?.leafShape || "broad",
      colorProfile: "",
    };
    
    let imageScore = candidate.initialScore;
    
    // Refine score based on image traits
    if (imageTraits.budStructure && imageTraits.budStructure === visualProfile.budStructure) {
      imageScore += 15;
    }
    if (imageTraits.trichomeDensity && imageTraits.trichomeDensity === visualProfile.trichomeDensity) {
      imageScore += 15;
    }
    if (imageTraits.leafShape && imageTraits.leafShape === visualProfile.leafShape) {
      imageScore += 15;
    }
    if (imageTraits.pistilColor && visualProfile.pistilColor.includes(imageTraits.pistilColor)) {
      imageScore += 10;
    }
    
    return {
      ...candidate,
      initialScore: imageScore, // Updated score
    };
  });
  
  // Sort by refined score
  scored.sort((a, b) => b.initialScore - a.initialScore);
  
  return scored;
}
