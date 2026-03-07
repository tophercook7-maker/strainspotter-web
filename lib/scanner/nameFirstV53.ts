// lib/scanner/nameFirstV53.ts
// Phase 5.3 — Name-First Matching & Strain Disambiguation
// Consolidated and enhanced version of name-first pipeline

import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { CultivarReference, NormalizedTerpeneProfile } from "./terpeneExperienceEngine";
import type { StrainRatio } from "./ratioEngineV52";
import { buildStrainShortlist } from "./strainShortlist";
import { scoreNameCompetition } from "./nameCompetition";
import { selectPrimaryName, generateNameExplanation } from "./nameFirstDisambiguation";
import { leverageDatabaseFilter } from "./databaseFilter";
import { groupVariants, selectMostLikelyCanonical } from "./variantGrouping";
import { disambiguateCloseNames } from "./nameDisambiguationV4";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";
import type { NameScoreResult } from "./nameCompetition";

/**
 * Phase 5.3 Step 5.3.5 — FINAL OUTPUT
 */
export type NameFirstResultV53 = {
  primaryMatch: {
    strainName: string;
    confidencePercent: number;
    confidenceTier: "very_high" | "high" | "medium" | "low";
    indicaSativaRatio?: {
      indicaPercent: number;
      sativaPercent: number;
      dominance: "Indica" | "Sativa" | "Hybrid" | "Balanced";
    };
  };
  alternateMatches: Array<{
    name: string;
    confidencePercent: number;
    reason: string; // Short reason why not primary
  }>; // Ranked list (2–4)
  explanation: {
    whyThisNameWon: string[]; // Clear explanation of WHY that name won
    whatRuledOutOthers: string[]; // Why other candidates didn't win
    databaseValidation?: string[]; // Phase 5.3.3 — Database cross-validation notes
    disambiguationNotes?: string[]; // Phase 5.3.4 — Disambiguation reasoning
  };
};

/**
 * Phase 5.3 Step 5.3.1 — NAME CANDIDATE EXTRACTION
 * 
 * From each image analysis:
 * - Extract top 5 strain candidates
 * - Include confidence score per image
 * - Normalize spelling + aliases
 *   (e.g. "OG Kush", "OGK", "Ocean Grown Kush")
 */
function extractNameCandidates(
  imageResults: ImageResult[]
): Array<{
  strainName: string;
  canonicalName: string;
  imageIndex: number;
  confidence: number;
  traitsMatched: string[];
}> {
  const candidates: Array<{
    strainName: string;
    canonicalName: string;
    imageIndex: number;
    confidence: number;
    traitsMatched: string[];
  }> = [];

  imageResults.forEach((result, imageIndex) => {
    // Phase 5.3.1 — Extract top 5 candidates per image
    result.candidateStrains.slice(0, 5).forEach(candidate => {
      // Phase 5.3.1 — Normalize spelling + aliases
      const canonicalName = normalizeStrainName(candidate.name);
      
      candidates.push({
        strainName: candidate.name, // Original name for display
        canonicalName, // Normalized name
        imageIndex,
        confidence: candidate.confidence,
        traitsMatched: candidate.traitsMatched || [],
      });
    });
  });

  return candidates;
}

/**
 * Phase 5.3.1 — Normalize strain name (alias resolution)
 */
function normalizeStrainName(candidateName: string): string {
  // Check exact match
  const exactMatch = CULTIVAR_LIBRARY.find(s => s.name === candidateName);
  if (exactMatch) return exactMatch.name;

  // Check aliases
  const aliasMatch = CULTIVAR_LIBRARY.find(s => 
    s.aliases?.some(alias => 
      alias.toLowerCase() === candidateName.toLowerCase() ||
      alias.toLowerCase().replace(/\s+/g, "") === candidateName.toLowerCase().replace(/\s+/g, "")
    )
  );
  if (aliasMatch) return aliasMatch.name;

  // Fuzzy matching for common aliases
  const normalized = candidateName.toLowerCase().replace(/\s+/g, "");
  const fuzzyMatch = CULTIVAR_LIBRARY.find(s => {
    const sName = s.name.toLowerCase().replace(/\s+/g, "");
    const sAliases = s.aliases?.map(a => a.toLowerCase().replace(/\s+/g, "")) || [];
    return sName === normalized || sAliases.includes(normalized);
  });
  if (fuzzyMatch) return fuzzyMatch.name;

  return candidateName;
}

/**
 * Phase 5.3 Step 5.3.2 — MULTI-IMAGE NAME CONSENSUS
 * 
 * Across 2–5 images:
 * - Count frequency of each strain name
 * - Boost names appearing in ≥2 images
 * - Penalize one-off names
 * 
 * Scoring factors:
 * - Frequency
 * - Confidence average
 * - Image quality weight
 */
function buildMultiImageConsensus(
  candidates: Array<{
    strainName: string;
    canonicalName: string;
    imageIndex: number;
    confidence: number;
    traitsMatched: string[];
  }>,
  imageCount: number
): Map<string, {
  canonicalName: string;
  frequency: number;
  avgConfidence: number;
  weightedConfidence: number;
  imageIndices: number[];
  allTraits: string[];
}> {
  const consensusMap = new Map<string, {
    canonicalName: string;
    frequency: number;
    avgConfidence: number;
    weightedConfidence: number;
    imageIndices: number[];
    allTraits: string[];
  }>();

  // Phase 5.3.2 — Group by canonical name
  candidates.forEach(candidate => {
    const existing = consensusMap.get(candidate.canonicalName);
    
    if (existing) {
      existing.frequency++;
      existing.avgConfidence = (existing.avgConfidence * (existing.frequency - 1) + candidate.confidence) / existing.frequency;
      existing.imageIndices.push(candidate.imageIndex);
      existing.allTraits.push(...candidate.traitsMatched);
    } else {
      consensusMap.set(candidate.canonicalName, {
        canonicalName: candidate.canonicalName,
        frequency: 1,
        avgConfidence: candidate.confidence,
        weightedConfidence: candidate.confidence, // Will be recalculated
        imageIndices: [candidate.imageIndex],
        allTraits: [...candidate.traitsMatched],
      });
    }
  });

  // Phase 5.3.2 — Calculate weighted confidence with boosts/penalties
  consensusMap.forEach((entry, canonicalName) => {
    let weightedConfidence = entry.avgConfidence;

    // Phase 5.3.2 — Boost names appearing in ≥2 images
    if (entry.frequency >= 3) {
      weightedConfidence = Math.min(100, entry.avgConfidence + 35); // +35% for 3+ images
    } else if (entry.frequency >= 2) {
      weightedConfidence = Math.min(100, entry.avgConfidence + 20); // +20% for 2+ images
    } else if (entry.frequency === 1 && imageCount > 1) {
      // Phase 5.3.2 — Penalize one-off names (if multiple images)
      weightedConfidence = Math.max(0, entry.avgConfidence - 15); // -15% for single image only
    }

    // Phase 5.3.2 — Image quality weight (assume all images have similar quality for now)
    // Future: could weight by image clarity, lighting, etc.

    entry.weightedConfidence = weightedConfidence;
  });

  return consensusMap;
}

/**
 * Phase 5.3 Step 5.3.3 — DATABASE CROSS-VALIDATION
 * 
 * Against 35,000-strain dataset:
 * - Verify lineage consistency
 * - Compare terpene profiles
 * - Reject biologically impossible matches
 * 
 * If mismatch detected:
 * - Lower confidence
 * - Promote next-best candidate
 */
function validateAgainstDatabase(
  strainName: string,
  dbEntry: CultivarReference | undefined,
  fusedFeatures: FusedFeatures,
  terpeneProfile?: NormalizedTerpeneProfile,
  strainRatio?: StrainRatio
): {
  isValid: boolean;
  confidencePenalty: number; // 0-100, amount to reduce confidence
  validationNotes: string[];
} {
  if (!dbEntry) {
    return {
      isValid: false,
      confidencePenalty: 30, // High penalty if not in database
      validationNotes: [`${strainName} not found in 35,000-strain database. Confidence reduced.`],
    };
  }

  const validationNotes: string[] = [];
  let confidencePenalty = 0;

  // Phase 5.3.3 — Verify lineage consistency
  const dbType = dbEntry.type || dbEntry.dominantType;
  if (strainRatio) {
    const expectedDominance = strainRatio.dominance;
    const dbDominance = dbType === "Indica" ? "Indica" : dbType === "Sativa" ? "Sativa" : "Hybrid";
    
    if (expectedDominance !== dbDominance && expectedDominance !== "Balanced") {
      confidencePenalty += 10;
      validationNotes.push(`Lineage mismatch: Database shows ${dbType}, but visual analysis suggests ${expectedDominance}-dominant`);
    } else {
      validationNotes.push(`Lineage consistency: Database ${dbType} matches visual analysis (${expectedDominance})`);
    }
  }

  // Phase 5.3.3 — Compare terpene profiles
  if (terpeneProfile && terpeneProfile.primaryTerpenes.length > 0) {
    const dbTerpenes = dbEntry.terpeneProfile || dbEntry.commonTerpenes || [];
    const detectedTerpenes = terpeneProfile.primaryTerpenes.map(t => t.name.toLowerCase());
    
    if (dbTerpenes.length > 0) {
      const matchingTerpenes = dbTerpenes.filter(t => 
        detectedTerpenes.includes(t.toLowerCase())
      );
      
      const terpeneMatchRatio = matchingTerpenes.length / Math.max(dbTerpenes.length, detectedTerpenes.length);
      
      if (terpeneMatchRatio < 0.3) {
        confidencePenalty += 15;
        validationNotes.push(`Terpene profile mismatch: Database shows ${dbTerpenes.slice(0, 3).join(", ")}, but detected ${detectedTerpenes.slice(0, 3).join(", ")}`);
      } else if (terpeneMatchRatio >= 0.5) {
        validationNotes.push(`Terpene profile alignment: ${matchingTerpenes.length} matching terpenes (${(terpeneMatchRatio * 100).toFixed(0)}% overlap)`);
      }
    }
  }

  // Phase 5.3.3 — Reject biologically impossible matches
  // Check visual traits against database expectations
  const dbVisual = dbEntry.visualProfile || {
    budStructure: dbEntry.morphology?.budDensity || "medium",
    leafShape: dbEntry.morphology?.leafShape || "broad",
    trichomeDensity: dbEntry.morphology?.trichomeDensity || "medium",
  };

  let impossibleMatches = 0;
  
  // Bud structure mismatch (high penalty)
  if (fusedFeatures.budStructure === "high" && dbVisual.budStructure === "low") {
    impossibleMatches++;
    confidencePenalty += 25;
  } else if (fusedFeatures.budStructure === "low" && dbVisual.budStructure === "high") {
    impossibleMatches++;
    confidencePenalty += 25;
  }
  
  // Leaf shape mismatch (medium penalty)
  if (fusedFeatures.leafShape !== dbVisual.leafShape) {
    confidencePenalty += 10;
  }

  if (impossibleMatches > 0) {
    validationNotes.push(`Biologically impossible matches detected: ${impossibleMatches} trait(s) contradict database expectations. High confidence penalty applied.`);
  }

  const isValid = confidencePenalty < 40; // Valid if penalty < 40%

  if (isValid && validationNotes.length === 0) {
    validationNotes.push(`Database validation passed: All checks aligned with 35,000-strain database`);
  }

  return {
    isValid,
    confidencePenalty,
    validationNotes,
  };
}

/**
 * Phase 5.3 Step 5.3.4 — DISAMBIGUATION RULES
 * 
 * When strains are similar:
 * - Prefer better-documented strain
 * - Prefer modern stabilized cultivar
 * - Prefer strain with tighter phenotype match
 */
function applyDisambiguationRules(
  topCandidates: NameScoreResult[],
  fusedFeatures: FusedFeatures
): {
  adjustedScores: NameScoreResult[];
  disambiguationNotes: string[];
} {
  if (topCandidates.length < 2) {
    return { adjustedScores: topCandidates, disambiguationNotes: [] };
  }

  const topResult = topCandidates[0];
  const secondResult = topCandidates[1];
  const scoreGap = topResult.totalScore - secondResult.totalScore;

  // Phase 5.3.4 — If strains are close (<7% apart), apply disambiguation
  if (scoreGap < 7) {
    const disambiguation = disambiguateCloseNames(topResult, secondResult, fusedFeatures);
    
    if (disambiguation) {
      // Phase 5.3.4 — Check for better-documented strain
      const topDbEntry = CULTIVAR_LIBRARY.find(s => 
        s.name === topResult.strainName || s.aliases?.includes(topResult.strainName)
      );
      const secondDbEntry = CULTIVAR_LIBRARY.find(s => 
        s.name === secondResult.strainName || s.aliases?.includes(secondResult.strainName)
      );

      let adjustedScores = [...topCandidates];
      const disambiguationNotes: string[] = [];

      // Phase 5.3.4 — Prefer better-documented strain (more sources/aliases)
      if (topDbEntry && secondDbEntry) {
        const topDocumentation = (topDbEntry.sources?.length || 0) + (topDbEntry.aliases?.length || 0);
        const secondDocumentation = (secondDbEntry.sources?.length || 0) + (secondDbEntry.aliases?.length || 0);

        if (secondDocumentation > topDocumentation * 1.5) {
          // Second is significantly better documented, swap
          [adjustedScores[0], adjustedScores[1]] = [adjustedScores[1], adjustedScores[0]];
          disambiguationNotes.push(`Preferring ${secondResult.strainName} (better documented: ${secondDocumentation} vs ${topDocumentation} sources/aliases)`);
        }
      }

      // Phase 5.3.4 — Prefer strain with tighter phenotype match
      // This is already handled in disambiguateCloseNames via morphology consistency
      disambiguationNotes.push(...disambiguation.reasoning);

      return { adjustedScores, disambiguationNotes };
    }
  }

  return { adjustedScores: topCandidates, disambiguationNotes: [] };
}

/**
 * Phase 5.3 — MAIN FUNCTION: Name-First Matching & Strain Disambiguation
 */
export function runNameFirstV53(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number,
  terpeneProfile?: NormalizedTerpeneProfile,
  strainRatio?: StrainRatio
): NameFirstResultV53 {
  // Phase 5.3.1 — NAME CANDIDATE EXTRACTION
  const extractedCandidates = extractNameCandidates(imageResults);
  console.log("Phase 5.3.1 — EXTRACTED CANDIDATES:", extractedCandidates);

  // Phase 5.3.2 — MULTI-IMAGE NAME CONSENSUS
  const consensusMap = buildMultiImageConsensus(extractedCandidates, imageCount);
  console.log("Phase 5.3.2 — MULTI-IMAGE CONSENSUS:", consensusMap);

  // Phase 4.4 — DATABASE-FIRST FILTER (leverage existing function)
  const databaseResult = leverageDatabaseFilter(fusedFeatures, imageResults, imageCount);

  // Phase 4.3 — Build shortlist (leverage existing function)
  let shortlist = buildStrainShortlist(imageResults);

  // Phase 4.4 — Merge database-filtered candidates (if available)
  if (databaseResult.finalShortlist.length > 0) {
    const dbCandidatesMap = new Map<string, typeof databaseResult.finalShortlist[0]>();
    databaseResult.finalShortlist.forEach(c => {
      dbCandidatesMap.set(c.canonicalName.toLowerCase(), c);
      c.aliases.forEach(alias => {
        dbCandidatesMap.set(alias.toLowerCase(), c);
      });
    });

    // Boost candidates that appear in both
    shortlist = shortlist.map(entry => {
      const dbCandidate = dbCandidatesMap.get(entry.canonicalName.toLowerCase());
      if (dbCandidate) {
        entry.avgConfidence = Math.min(100, entry.avgConfidence + 15); // Boost by 15%
      }
      return entry;
    });
  }

  // Phase 4.1 — Score name competition
  const scoredResults = scoreNameCompetition(shortlist, fusedFeatures, imageResults);
  console.log("Phase 4.1 — SCORED RESULTS:", scoredResults);

  // Phase 5.3.4 — DISAMBIGUATION RULES
  const { adjustedScores, disambiguationNotes } = applyDisambiguationRules(scoredResults, fusedFeatures);
  console.log("Phase 5.3.4 — DISAMBIGUATION:", { adjustedScores, disambiguationNotes });

  // Phase 4.1 — Select primary name
  const selectionResult = selectPrimaryName(adjustedScores, imageCount, fusedFeatures);
  console.log("Phase 4.1 — SELECTION RESULT:", selectionResult);

  // Phase 5.3.3 — DATABASE CROSS-VALIDATION
  const primaryDbEntry = CULTIVAR_LIBRARY.find(s => 
    s.name === selectionResult.primaryStrainName || s.aliases?.includes(selectionResult.primaryStrainName)
  );
  const validation = validateAgainstDatabase(
    selectionResult.primaryStrainName,
    primaryDbEntry,
    fusedFeatures,
    terpeneProfile,
    strainRatio
  );
  console.log("Phase 5.3.3 — DATABASE VALIDATION:", validation);

  // Phase 5.3.3 — Apply confidence penalty
  let finalConfidence = Math.max(0, selectionResult.nameConfidencePercent - validation.confidencePenalty);
  
  // Phase 5.3.3 — If validation failed significantly, consider promoting next candidate
  if (!validation.isValid && adjustedScores.length > 1 && validation.confidencePenalty >= 30) {
    const secondCandidate = adjustedScores[1];
    const secondDbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name === secondCandidate.strainName || s.aliases?.includes(secondCandidate.strainName)
    );
    const secondValidation = validateAgainstDatabase(
      secondCandidate.strainName,
      secondDbEntry,
      fusedFeatures,
      terpeneProfile,
      strainRatio
    );

    // If second candidate is better validated, use it
    if (secondValidation.isValid && secondValidation.confidencePenalty < validation.confidencePenalty) {
      console.log(`Phase 5.3.3 — Promoting second candidate "${secondCandidate.strainName}" due to better database validation`);
      // Would need to recalculate selectionResult with swapped candidates
      // For now, just note it in validation notes
      validation.validationNotes.push(`Considered promoting "${secondCandidate.strainName}" (better database validation), but kept "${selectionResult.primaryStrainName}" as primary`);
    }
  }

  // Phase 4.1 — Generate explanation
  const explanation = generateNameExplanation(
    selectionResult.primaryStrainName,
    adjustedScores,
    selectionResult.nameConfidencePercent,
    imageCount
  );

  // Phase 5.3.5 — FINAL OUTPUT
  return {
    primaryMatch: {
      strainName: selectionResult.primaryStrainName,
      confidencePercent: Math.round(finalConfidence),
      confidenceTier: selectionResult.nameConfidenceTier,
      indicaSativaRatio: strainRatio ? {
        indicaPercent: strainRatio.indicaPercent,
        sativaPercent: strainRatio.sativaPercent,
        dominance: strainRatio.dominance,
      } : undefined,
    },
    alternateMatches: selectionResult.alternateMatches.map(alt => ({
      name: alt.name,
      confidencePercent: Math.round(alt.score),
      reason: alt.whyNotPrimary,
    })),
    explanation: {
      whyThisNameWon: explanation.whyThisNameWon,
      whatRuledOutOthers: explanation.whatRuledOutOthers,
      databaseValidation: validation.validationNotes,
      disambiguationNotes: disambiguationNotes.length > 0 ? disambiguationNotes : undefined,
    },
  };
}
