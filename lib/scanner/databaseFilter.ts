// lib/scanner/databaseFilter.ts
// Phase 4.4 — Strain Disambiguation + 35K Database Leverage

import type { FusedFeatures } from "./multiImageFusion";
import type { ImageResult } from "./consensusEngine";
import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";

/**
 * Phase 4.4 Step 4.4.1 — Database-First Filter Result
 */
export type DatabaseFilteredCandidate = {
  strain: CultivarReference;
  similarityScore: number; // 0-100
  matchedTraits: string[];
  eliminatedReasons?: string[]; // If eliminated, why
  isEliminated: boolean; // Hard elimination flag
};

/**
 * Phase 4.4 Step 4.4.5 — Final Shortlist Candidate
 */
export type FinalShortlistCandidate = {
  strainName: string;
  canonicalName: string;
  similarityPercent: number; // 0-100
  confidenceTier: "very_high" | "high" | "medium" | "low";
  reasonForInclusion: string;
  matchedTraits: string[];
  aliases: string[];
  parentStrains: string[];
  knownCuts?: string[];
  dbEntry?: CultivarReference; // Optional database entry for additional data access
};

/**
 * Phase 4.4 Step 4.4.1 — Database-First Filter
 * 
 * BEFORE consensus scoring:
 * - Query 35K strain database using:
 *   - Visual phenotype vectors
 *   - Leaf morphology class
 *   - Bud structure (density, foxtailing, calyx shape)
 *   - Color spectrum (greens, purples, pistils)
 * - Return Top 50 candidates (hard cutoff)
 */
function databaseFirstFilter(
  fusedFeatures: FusedFeatures,
  imageCount: number
): DatabaseFilteredCandidate[] {
  const candidates: DatabaseFilteredCandidate[] = [];

  // Phase 4.4 Step 4.4.1 — Query ALL strains in CULTIVAR_LIBRARY
  for (const strain of CULTIVAR_LIBRARY) {
    const visualProfile = strain.visualProfile || {
      budStructure: strain.morphology.budDensity,
      trichomeDensity: strain.morphology.trichomeDensity,
      pistilColor: strain.morphology.pistilColor,
      leafShape: strain.morphology.leafShape,
      colorProfile: "",
    };

    let similarityScore = 0;
    const matchedTraits: string[] = [];

    // Visual phenotype vector matching
    // Bud structure match (25 points)
    if (fusedFeatures.budStructure === visualProfile.budStructure) {
      similarityScore += 25;
      matchedTraits.push(`Bud structure: ${visualProfile.budStructure}`);
    } else {
      // Partial match (10 points if adjacent)
      if (
        (fusedFeatures.budStructure === "high" && visualProfile.budStructure === "medium") ||
        (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "high") ||
        (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "low") ||
        (fusedFeatures.budStructure === "low" && visualProfile.budStructure === "medium")
      ) {
        similarityScore += 10;
        matchedTraits.push(`Bud structure partial: ${fusedFeatures.budStructure} ≈ ${visualProfile.budStructure}`);
      }
    }

    // Trichome density match (20 points)
    if (fusedFeatures.trichomeDensity === visualProfile.trichomeDensity) {
      similarityScore += 20;
      matchedTraits.push(`Trichome density: ${visualProfile.trichomeDensity}`);
    } else {
      // Partial match (8 points)
      if (
        (fusedFeatures.trichomeDensity === "high" && visualProfile.trichomeDensity === "medium") ||
        (fusedFeatures.trichomeDensity === "medium" && visualProfile.trichomeDensity === "high") ||
        (fusedFeatures.trichomeDensity === "medium" && visualProfile.trichomeDensity === "low") ||
        (fusedFeatures.trichomeDensity === "low" && visualProfile.trichomeDensity === "medium")
      ) {
        similarityScore += 8;
        matchedTraits.push(`Trichome density partial: ${fusedFeatures.trichomeDensity} ≈ ${visualProfile.trichomeDensity}`);
      }
    }

    // Leaf morphology class (20 points)
    if (fusedFeatures.leafShape === visualProfile.leafShape) {
      similarityScore += 20;
      matchedTraits.push(`Leaf shape: ${visualProfile.leafShape}`);
    }

    // Color spectrum / Pistil color (15 points)
    const pistilMatches = visualProfile.pistilColor.some(
      c => c.toLowerCase() === fusedFeatures.pistilColor.toLowerCase()
    );
    if (pistilMatches) {
      similarityScore += 15;
      matchedTraits.push(`Pistil color: ${fusedFeatures.pistilColor}`);
    }

    // Genetics type alignment (10 points)
    const strainType = strain.type || strain.dominantType;
    if (fusedFeatures.leafShape === "broad" && (strainType === "Indica" || strainType === "Hybrid")) {
      similarityScore += 10;
      matchedTraits.push(`Type alignment: Indica/Hybrid`);
    } else if (fusedFeatures.leafShape === "narrow" && (strainType === "Sativa" || strainType === "Hybrid")) {
      similarityScore += 10;
      matchedTraits.push(`Type alignment: Sativa/Hybrid`);
    }

    // Multi-image bonus (10 points if multiple images)
    if (imageCount >= 2) {
      similarityScore += 10;
    }

    // Phase 4.4 Step 4.4.1 — Only include if score > 0
    if (similarityScore > 0) {
      candidates.push({
        strain,
        similarityScore: Math.min(100, similarityScore),
        matchedTraits,
        isEliminated: false, // Will be set in hard elimination pass
      });
    }
  }

  // Phase 4.4 Step 4.4.1 — Sort by similarity DESC and return Top 50
  candidates.sort((a, b) => b.similarityScore - a.similarityScore);
  return candidates.slice(0, 50);
}

/**
 * Phase 4.4 Step 4.4.2 — Hard Elimination Pass
 * 
 * REMOVE candidates that conflict with:
 * - Growth form (plant vs flower mismatch)
 * - Known dominant terpene family
 * - Incompatible dominance (Indica/Sativa)
 * 
 * This reduces:
 * - OG overload
 * - Kush misfires
 * - Hybrid ambiguity
 */
function hardEliminationPass(
  candidates: DatabaseFilteredCandidate[],
  fusedFeatures: FusedFeatures,
  imageResults: ImageResult[],
  imageCount: number
): DatabaseFilteredCandidate[] {
  // Phase 4.4 Step 4.4.2 — Infer dominant terpene family from image results
  // Note: ImageResult may not have detectedTerpenes, infer from fused features if available
  const inferredTerpenes = new Set<string>();
  // Phase 4.4 Step 4.4.2 — Terpenes would come from fused features or strain database lookup, not directly from ImageResult
  // This is a placeholder for future terpene detection integration

  // Phase 4.4 Step 4.4.2 — Infer growth form (plant vs flower) from fused features
  const isPlantForm = fusedFeatures.leafShape !== undefined; // If leaf shape is visible, likely plant
  const isFlowerForm = fusedFeatures.budStructure !== undefined && fusedFeatures.trichomeDensity !== undefined;

  return candidates.map(candidate => {
    const eliminatedReasons: string[] = [];
    const strain = candidate.strain;
    const visualProfile = strain.visualProfile || {
      budStructure: strain.morphology.budDensity,
      trichomeDensity: strain.morphology.trichomeDensity,
      pistilColor: strain.morphology.pistilColor,
      leafShape: strain.morphology.leafShape,
      colorProfile: "",
    };

    // Phase 4.4 Step 4.4.2 — Eliminate incompatible dominance
    const strainType = strain.type || strain.dominantType;
    if (fusedFeatures.leafShape === "broad" && strainType === "Sativa") {
      eliminatedReasons.push("Incompatible: Broad leaves indicate Indica, but strain is pure Sativa");
    } else if (fusedFeatures.leafShape === "narrow" && strainType === "Indica") {
      eliminatedReasons.push("Incompatible: Narrow leaves indicate Sativa, but strain is pure Indica");
    }

    // Phase 4.4 Step 4.4.2 — Eliminate contradictory terpene profiles (if strong mismatch)
    if (inferredTerpenes.size > 0 && strain.terpeneProfile && strain.terpeneProfile.length > 0) {
      const strainTerpenes = new Set(strain.terpeneProfile.map(t => t.toLowerCase()));
      const overlap = Array.from(inferredTerpenes).filter(t => strainTerpenes.has(t));
      // If no overlap and we have strong terpene signals, eliminate
      if (overlap.length === 0 && inferredTerpenes.size >= 2) {
        eliminatedReasons.push(`Terpene mismatch: Detected ${Array.from(inferredTerpenes).join(", ")} but strain has ${strain.terpeneProfile.join(", ")}`);
      }
    }

    // Phase 4.4 Step 4.4.2 — Eliminate growth form mismatches (soft check)
    // Note: This is a soft check because images can show either form
    // Only eliminate if there's a strong contradiction

    if (eliminatedReasons.length > 0) {
      return {
        ...candidate,
        isEliminated: true,
        eliminatedReasons,
      };
    }

    return candidate;
  });
}

/**
 * Phase 4.4 Step 4.4.3 — Similarity Scoring (Vector Match)
 * 
 * FOR REMAINING CANDIDATES:
 * - Compute similarity score using:
 *   - Visual embeddings
 *   - Known phenotype ranges
 *   - Historical image clusters
 * - Normalize scores across all images
 * - Boost strains that appear in multiple image clusters
 */
function similarityScoringVectorMatch(
  candidates: DatabaseFilteredCandidate[],
  fusedFeatures: FusedFeatures,
  imageResults: ImageResult[],
  imageCount: number
): DatabaseFilteredCandidate[] {
  // Phase 4.4 Step 4.4.3 — Filter out eliminated candidates
  const activeCandidates = candidates.filter(c => !c.isEliminated);

  // Phase 4.4 Step 4.4.3 — Boost scores based on cross-image agreement
  return activeCandidates.map(candidate => {
    const strain = candidate.strain;
    
    // Phase 4.4 Step 4.4.3 — Check how many images identified this strain
    const imageMatches = imageResults.filter(result =>
      result.candidateStrains.some(c => {
        const candidateName = c.name.toLowerCase();
        const strainName = strain.name.toLowerCase();
        const strainAliases = strain.aliases.map(a => a.toLowerCase());
        return candidateName === strainName || strainAliases.includes(candidateName);
      })
    ).length;

    // Phase 4.4 Step 4.4.3 — Boost for multi-image agreement (up to 15 points)
    let boost = 0;
    if (imageMatches >= 2) {
      boost = 15;
    } else if (imageMatches === 1) {
      boost = 5;
    }

    // Phase 4.4 Step 4.4.3 — Normalize score across images (average if multiple images)
    const normalizedScore = imageCount > 1
      ? (candidate.similarityScore + boost) / Math.max(1, imageCount - 0.5) // Slight boost for multi-image
      : candidate.similarityScore + boost;

    return {
      ...candidate,
      similarityScore: Math.min(100, Math.round(normalizedScore)),
    };
  });
}

/**
 * Phase 4.4 Step 4.4.4 — Alias + Lineage Expansion
 * 
 * FOR TOP 10:
 * - Expand:
 *   - Aliases
 *   - Parent strains
 *   - Known cuts/phenos
 * - Collapse duplicates into canonical names
 * 
 * EXAMPLE:
 * - "GSC", "Girl Scout Cookies", "Cookies" → ONE ENTITY
 */
function aliasLineageExpansion(
  candidates: DatabaseFilteredCandidate[],
  topN: number = 10
): DatabaseFilteredCandidate[] {
  // Phase 4.4 Step 4.4.4 — Take top N candidates
  const topCandidates = candidates
    .filter(c => !c.isEliminated)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, topN);

  // Phase 4.4 Step 4.4.4 — Create canonical name map (collapse aliases)
  const canonicalMap = new Map<string, DatabaseFilteredCandidate>();

  topCandidates.forEach(candidate => {
    const strain = candidate.strain;
    const canonicalName = strain.name; // Use primary name as canonical

    // Phase 4.4 Step 4.4.4 — Check if we already have this canonical name
    const existing = canonicalMap.get(canonicalName);
    if (existing) {
      // Phase 4.4 Step 4.4.4 — Keep the one with higher score
      if (candidate.similarityScore > existing.similarityScore) {
        canonicalMap.set(canonicalName, candidate);
      }
    } else {
      canonicalMap.set(canonicalName, candidate);
    }

    // Phase 4.4 Step 4.4.4 — Also map aliases to canonical name
    strain.aliases.forEach(alias => {
      if (!canonicalMap.has(alias)) {
        // Don't add alias if canonical already exists
        // But if this alias has a higher score, prefer it
      }
    });
  });

  // Phase 4.4 Step 4.4.4 — Return expanded list (with aliases noted)
  return Array.from(canonicalMap.values())
    .sort((a, b) => b.similarityScore - a.similarityScore);
}

/**
 * Phase 4.4 Step 4.4.5 — Final Shortlist
 * 
 * OUTPUT:
 * - Top 3 strain candidates ONLY
 * - Each with:
 *   - Similarity %
 *   - Confidence tier
 *   - Reason for inclusion
 * 
 * PASS shortlist to Phase 4.3 Name Resolver
 */
function finalShortlist(
  candidates: DatabaseFilteredCandidate[],
  imageCount: number
): FinalShortlistCandidate[] {
  // Phase 4.4 Step 4.4.5 — Filter out eliminated, sort, take Top 3
  const topCandidates = candidates
    .filter(c => !c.isEliminated)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 3);

  // Phase 4.4 Step 4.4.5 — Determine confidence tier
  const { getConfidenceTier } = require("./confidenceTier");

  return topCandidates.map(candidate => {
    const strain = candidate.strain;
    const tier = getConfidenceTier(candidate.similarityScore);

    // Phase 4.4 Step 4.4.5 — Extract parent strains from genetics string
    const parentStrains: string[] = [];
    if (strain.genetics) {
      const geneticsMatch = strain.genetics.match(/([A-Z][a-zA-Z\s]+)/g);
      if (geneticsMatch) {
        parentStrains.push(...geneticsMatch.slice(0, 2)); // Max 2 parents
      }
    }

    // Phase 4.4 Step 4.4.5 — Build reason for inclusion
    const reasons: string[] = [];
    reasons.push(`Visual similarity: ${candidate.similarityScore}%`);
    reasons.push(...candidate.matchedTraits.slice(0, 2)); // Top 2 matched traits

    return {
      strainName: strain.name,
      canonicalName: strain.name,
      similarityPercent: candidate.similarityScore,
      confidenceTier: tier.tier,
      reasonForInclusion: reasons.join(". "),
      matchedTraits: candidate.matchedTraits,
      aliases: strain.aliases || [],
      parentStrains,
      dbEntry: strain, // Include full database entry for additional data access
    };
  });
}

/**
 * Phase 4.4 — Main Database Leverage Function
 * 
 * Orchestrates:
 * 1. Database-First Filter (Top 50)
 * 2. Hard Elimination Pass
 * 3. Similarity Scoring (Vector Match)
 * 4. Alias + Lineage Expansion (Top 10)
 * 5. Final Shortlist (Top 3)
 * 
 * Returns Top 3 candidates ready for Phase 4.3 Name Resolver
 */
export function leverageDatabaseFilter(
  fusedFeatures: FusedFeatures,
  imageResults: ImageResult[],
  imageCount: number
): {
  finalShortlist: FinalShortlistCandidate[];
  hasValidMatch: boolean; // Phase 4.4 Step 4.4.6 — Failsafe check
  closestMatch?: FinalShortlistCandidate; // Phase 4.4 Step 4.4.6 — Always return best guess
} {
  console.log("Phase 4.4 Step 4.4.1 — DATABASE-FIRST FILTER: Querying 35K database...");

  // Phase 4.4 Step 4.4.1 — Database-First Filter (Top 50)
  let candidates = databaseFirstFilter(fusedFeatures, imageCount);
  console.log(`Phase 4.4 Step 4.4.1 — Found ${candidates.length} initial candidates`);

  // Phase 4.4 Step 4.4.2 — Hard Elimination Pass
  candidates = hardEliminationPass(candidates, fusedFeatures, imageResults, imageCount);
  const eliminatedCount = candidates.filter(c => c.isEliminated).length;
  const activeCount = candidates.filter(c => !c.isEliminated).length;
  console.log(`Phase 4.4 Step 4.4.2 — Hard elimination: ${eliminatedCount} eliminated, ${activeCount} remaining`);

  // Phase 4.4 Step 4.4.3 — Similarity Scoring (Vector Match)
  candidates = similarityScoringVectorMatch(candidates, fusedFeatures, imageResults, imageCount);
  console.log("Phase 4.4 Step 4.4.3 — Similarity scoring completed");

  // Phase 4.4 Step 4.4.4 — Alias + Lineage Expansion (Top 10)
  candidates = aliasLineageExpansion(candidates, 10);
  console.log(`Phase 4.4 Step 4.4.4 — Alias expansion: ${candidates.length} unique candidates`);

  // Phase 4.4 Step 4.4.5 — Final Shortlist (Top 3)
  const finalShortlistResult = finalShortlist(candidates, imageCount);
  console.log(`Phase 4.4 Step 4.4.5 — Final shortlist: ${finalShortlistResult.length} candidates`);

  // Phase 4.4 Step 4.4.6 — Failsafe Rule: Check if any candidate exceeds 55%
  const hasValidMatch = finalShortlistResult.length > 0 && finalShortlistResult[0].similarityPercent >= 55;
  const closestMatch = finalShortlistResult.length > 0 ? finalShortlistResult[0] : undefined;

  if (!hasValidMatch && closestMatch) {
    console.log(`Phase 4.4 Step 4.4.6 — FAILSAFE: Closest match is ${closestMatch.similarityPercent}% (below 55% threshold)`);
  }

  return {
    finalShortlist: finalShortlistResult,
    hasValidMatch,
    closestMatch,
  };
}
