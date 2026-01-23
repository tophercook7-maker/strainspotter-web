// lib/scanner/nameFirstPipeline.ts
// Phase 4.3 Step 4.3.1 — Name-First Pipeline
// Phase 5.3 — Name-First Matching & Strain Disambiguation (Enhanced)

import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NormalizedTerpeneProfile } from "./terpeneExperienceEngine";
import type { StrainRatio } from "./ratioEngineV52";
import { buildStrainShortlist } from "./strainShortlist";
import { scoreNameCompetition } from "./nameCompetition";
import { selectPrimaryName, generateNameExplanation } from "./nameFirstDisambiguation";
// Phase 4.4 — Database Leverage (runs FIRST, before shortlist)
import { leverageDatabaseFilter } from "./databaseFilter";
// Phase 4.7 Step 4.7.2 — Variant Grouping for disambiguation
import { groupVariants, selectMostLikelyCanonical, extractRootName } from "./variantGrouping";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 4.3 Step 4.3.1 — Name-First Pipeline Result
 * 
 * FLOW:
 * 1. Candidate Name Resolution (TOP) ← This function
 * 2. Confidence Assignment
 * 3. Evidence & Explanation
 * 4. Deep Wiki Report (Phase 4.2)
 */
export type NameFirstPipelineResult = {
  primaryStrainName: string;
  nameConfidencePercent: number;
  nameConfidenceTier: "very_high" | "high" | "medium" | "low";
  confidenceTierLabel?: string; // Optional confidence tier label for display
  alternateMatches: Array<{
    name: string;
    score: number;
    whyNotPrimary: string;
  }>; // 1–2 alternates (if confidence <95%)
  explanation: {
    whyThisNameWon: string[];
    whatRuledOutOthers: string[];
    varianceNotes: string[];
  };
  // Phase 4.7 Step 4.7.2 — Closely Related Variants (if ambiguous)
  closelyRelatedVariants?: Array<{
    name: string;
    canonicalName: string;
    whyNotPrimary: string;
  }>; // 2–3 variants if ambiguous (collapsed)
  isAmbiguous?: boolean; // If multiple variants could be correct
};

/**
 * Phase 5.3 Step 5.3.3 — DATABASE CROSS-VALIDATION
 * 
 * Against 35,000-strain dataset:
 * - Verify lineage consistency
 * - Compare terpene profiles
 * - Reject biologically impossible matches
 */
function validateNameAgainstDatabase(
  strainName: string,
  dbEntry: ReturnType<typeof CULTIVAR_LIBRARY.find> | undefined,
  fusedFeatures: FusedFeatures,
  terpeneProfile?: NormalizedTerpeneProfile,
  strainRatio?: StrainRatio
): {
  confidencePenalty: number;
  validationNotes: string[];
} {
  if (!dbEntry) {
    return {
      confidencePenalty: 20,
      validationNotes: [`${strainName} not found in 35,000-strain database. Confidence reduced.`],
    };
  }

  const validationNotes: string[] = [];
  let confidencePenalty = 0;

  // Phase 5.3.3 — Verify lineage consistency
  if (strainRatio) {
    const dbType = dbEntry.type || dbEntry.dominantType;
    const expectedDominance = strainRatio.dominance;
    const dbDominance = dbType === "Indica" ? "Indica" : dbType === "Sativa" ? "Sativa" : "Hybrid";
    
    if (expectedDominance !== dbDominance && expectedDominance !== "Balanced") {
      confidencePenalty += 8;
      validationNotes.push(`Lineage check: Database shows ${dbType}, visual suggests ${expectedDominance}`);
    } else {
      validationNotes.push(`Lineage validated: Database ${dbType} aligns with visual analysis`);
    }
  }

  // Phase 5.3.3 — Compare terpene profiles
  if (terpeneProfile && terpeneProfile.primaryTerpenes.length > 0) {
    const dbTerpenes = dbEntry.terpeneProfile || dbEntry.commonTerpenes || [];
    if (dbTerpenes.length > 0) {
      const detectedTerpenes = terpeneProfile.primaryTerpenes.map(t => t.name.toLowerCase());
      const matchingTerpenes = dbTerpenes.filter(t => 
        detectedTerpenes.includes(t.toLowerCase())
      );
      
      const matchRatio = matchingTerpenes.length / Math.max(dbTerpenes.length, detectedTerpenes.length);
      if (matchRatio < 0.3) {
        confidencePenalty += 12;
        validationNotes.push(`Terpene mismatch: Database shows ${dbTerpenes.slice(0, 3).join(", ")}, detected ${detectedTerpenes.slice(0, 3).join(", ")}`);
      } else if (matchRatio >= 0.5) {
        validationNotes.push(`Terpene alignment: ${matchingTerpenes.length} matching terpenes confirmed`);
      }
    }
  }

  // Phase 5.3.3 — Check visual trait consistency
  const dbVisual = dbEntry.visualProfile || {
    budStructure: dbEntry.morphology?.budDensity || "medium",
    leafShape: dbEntry.morphology?.leafShape || "broad",
    trichomeDensity: dbEntry.morphology?.trichomeDensity || "medium",
  };

  // Biologically impossible: high vs low bud structure
  if ((fusedFeatures.budStructure === "high" && dbVisual.budStructure === "low") ||
      (fusedFeatures.budStructure === "low" && dbVisual.budStructure === "high")) {
    confidencePenalty += 15;
    validationNotes.push(`Visual contradiction: Bud structure mismatch (${fusedFeatures.budStructure} vs ${dbVisual.budStructure})`);
  }

  if (confidencePenalty === 0 && validationNotes.length > 0) {
    validationNotes.unshift(`Database validation passed: All checks aligned`);
  }

  return { confidencePenalty, validationNotes };
}

/**
 * Phase 5.3 Step 5.3.4 — DISAMBIGUATION RULES (Enhanced)
 * 
 * When strains are similar:
 * - Prefer better-documented strain
 * - Prefer modern stabilized cultivar
 * - Prefer strain with tighter phenotype match
 */
function enhanceDisambiguationWithDocumentation(
  topCandidates: ReturnType<typeof scoreNameCompetition>,
  fusedFeatures: FusedFeatures
): ReturnType<typeof scoreNameCompetition> {
  if (topCandidates.length < 2) return topCandidates;

  const topResult = topCandidates[0];
  const secondResult = topCandidates[1];
  const scoreGap = topResult.totalScore - secondResult.totalScore;

  // Phase 5.3.4 — Only apply if strains are close (<7% apart)
  if (scoreGap >= 7) return topCandidates;

  const topDbEntry = CULTIVAR_LIBRARY.find(s => 
    s.name === topResult.strainName || s.aliases?.includes(topResult.strainName)
  );
  const secondDbEntry = CULTIVAR_LIBRARY.find(s => 
    s.name === secondResult.strainName || s.aliases?.includes(secondResult.strainName)
  );

  if (!topDbEntry || !secondDbEntry) return topCandidates;

  // Phase 5.3.4 — Prefer better-documented strain (more sources/aliases)
  const topDocumentation = (topDbEntry.sources?.length || 0) + (topDbEntry.aliases?.length || 0);
  const secondDocumentation = (secondDbEntry.sources?.length || 0) + (secondDbEntry.aliases?.length || 0);

  if (secondDocumentation > topDocumentation * 1.5 && scoreGap < 5) {
    // Second is significantly better documented and very close in score, swap
    console.log(`Phase 5.3.4 — Preferring better-documented "${secondResult.strainName}" (${secondDocumentation} vs ${topDocumentation} sources/aliases)`);
    const adjusted = [...topCandidates];
    [adjusted[0], adjusted[1]] = [adjusted[1], adjusted[0]];
    return adjusted;
  }

  return topCandidates;
}

/**
 * Phase 4.3 Step 4.3.1 — Name-First Pipeline
 * Phase 4.7 Step 4.7.1 — NAME-FIRST MATCHING PIPELINE ORDER (LOCKED)
 * Phase 5.3 — Name-First Matching & Strain Disambiguation (Enhanced)
 * 
 * PIPELINE ORDER (LOCK THIS):
 * 1. IMAGE → visual trait extraction ✓ (done in analyzePerImageV3)
 * 2. VISUAL TRAITS → candidate strain shortlist (top 10–20) ✓ (buildStrainShortlist)
 * 3. DATABASE FILTER → remove impossible matches ✓ (leverageDatabaseFilter)
 * 4. NAME RESOLUTION → pick BEST NAME FIRST ✓ (this function)
 * 5. THEN build:
 *    - confidence %
 *    - ratio
 *    - wiki depth
 *    - AI synthesis
 * 
 * RULE:
 * - UI NEVER shows "analysis" without a NAME.
 * - UI MUST show a strain name immediately once resolved
 * - Everything else supports or challenges that name
 * - Phase 5.3: Same image set = same name (consistency guaranteed)
 */
export function runNameFirstPipeline(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number,
  terpeneProfile?: NormalizedTerpeneProfile, // Phase 5.3.3 — For database cross-validation
  strainRatio?: StrainRatio // Phase 5.3.3 — For database cross-validation
): NameFirstPipelineResult {
  // PHASE A FINALIZATION — Validate database is loaded (never throw, proceed with fallback)
  if (CULTIVAR_LIBRARY.length < 10000) {
    console.warn(`PHASE A FINALIZATION: Database has only ${CULTIVAR_LIBRARY.length} strains (minimum 10,000 recommended). Proceeding with limited database.`);
    // Continue with available database - don't throw
  }
  
  // Phase 5.0.2 — STEP 1: DATABASE NAME MATCH (runs FIRST)
  // Phase 4.4 Step 4.4.1 — DATABASE-FIRST FILTER (runs BEFORE consensus scoring)
  // Query 35K database using visual phenotype vectors, return Top 50 candidates
  // Then: Hard elimination → Similarity scoring → Alias expansion → Final shortlist (Top 3)
  console.log("Phase 5.0.2 — STEP 1: DATABASE NAME MATCH (querying", CULTIVAR_LIBRARY.length, "strains)");
  const databaseResult = leverageDatabaseFilter(fusedFeatures, imageResults, imageCount);
  console.log("Phase 5.0.2 — STEP 1 COMPLETE: Database filter found", databaseResult.finalShortlist.length, "candidates");
  console.log("Phase 4.4 — DATABASE FILTER RESULT:", databaseResult);

  // Phase 4.4 Step 4.4.6 — FAILSAFE RULE: If no valid match, still proceed with closest guess
  if (!databaseResult.hasValidMatch && databaseResult.closestMatch) {
    console.log(`Phase 4.4 Step 4.4.6 — FAILSAFE: Using closest match "${databaseResult.closestMatch.strainName}" (${databaseResult.closestMatch.similarityPercent}% confidence, below 55% threshold)`);
    // Continue with closest match but will mark as low confidence
  }

  // Phase 5.0.2 — STEP 2: ALIAS / SLANG MATCH (after database filter)
  // Phase 4.3 Step 4.3.2 — Build Candidate Name Pool (now uses database-filtered results)
  // Convert database-filtered shortlist to ImageResult format for compatibility
  // If database filter found candidates, prioritize them; otherwise fall back to per-image analysis
  console.log("Phase 5.0.2 — STEP 2: ALIAS / SLANG MATCH (building shortlist)");
  let shortlist = buildStrainShortlist(imageResults);
  console.log("Phase 5.0.2 — STEP 2 COMPLETE: Shortlist has", shortlist.length, "candidates");
  console.log("Phase 4.3 Step 4.3.2 — Shortlist (before database merge):", shortlist);

  // Phase 5.0.4.2 — DATABASE DISAMBIGUATION: Merge aliases, penalize generic names, boost well-documented strains
  // Phase 4.4 Step 4.4.5 — Merge database-filtered candidates into shortlist
  // Boost candidates that appear in both database filter AND per-image analysis
  console.log("Phase 5.0.4.2 — DATABASE DISAMBIGUATION: Merging aliases and applying boosts/penalties");
  
  if (databaseResult.finalShortlist.length > 0) {
    // Phase 5.0.4.2 — Create alias map for disambiguation
    const aliasMap = new Map<string, string>(); // alias → canonical name
    databaseResult.finalShortlist.forEach(c => {
      c.aliases.forEach(alias => {
        aliasMap.set(alias.toLowerCase(), c.canonicalName);
      });
      aliasMap.set(c.strainName.toLowerCase(), c.canonicalName);
    });
    console.log("Phase 5.0.4.2 — Alias map created:", Array.from(aliasMap.entries()).slice(0, 5));

    // Create a map of database-filtered candidates
    const dbCandidatesMap = new Map<string, typeof databaseResult.finalShortlist[0]>();
    databaseResult.finalShortlist.forEach(c => {
      dbCandidatesMap.set(c.canonicalName.toLowerCase(), c);
      // Also map aliases
      c.aliases.forEach(alias => {
        dbCandidatesMap.set(alias.toLowerCase(), c);
      });
    });

    // Phase 5.0.4.2 — Penalize generic names unless supported by multiple signals
    const genericNames = ["Hybrid", "Indica", "Sativa", "Kush", "Haze", "Diesel"];
    const isGeneric = (name: string): boolean => {
      const nameLower = name.toLowerCase();
      return genericNames.some(g => nameLower.includes(g.toLowerCase())) && 
             !nameLower.includes(" ") && // Single word generic
             nameLower.length < 10; // Short generic name
    };

    // Boost shortlist entries that match database-filtered candidates
    shortlist = shortlist.map(entry => {
      const canonicalLower = entry.canonicalName.toLowerCase();
      const dbCandidate = dbCandidatesMap.get(canonicalLower);
      
      if (dbCandidate) {
        // Phase 5.0.4.2 — Check if generic name
        const isGenericName = isGeneric(entry.name);
        if (isGenericName && entry.appearancesAcrossImages < 2) {
          // Phase 5.0.4.2 — Penalize generic names without multi-image support
          const penalizedScore = Math.max(50, entry.avgConfidence - 15);
          console.log(`Phase 5.0.4.2 — PENALIZING generic name "${entry.name}": ${entry.avgConfidence}% → ${penalizedScore}% (single image, generic)`);
          return {
            ...entry,
            avgConfidence: penalizedScore,
            maxConfidence: Math.max(entry.maxConfidence - 10, 50),
          };
        }
        
        // Phase 5.0.4.2 — Boost strains with full lineage
        const hasFullLineage = dbCandidate.dbEntry?.genetics && dbCandidate.dbEntry.genetics.includes("×");
        // Phase 5.0.4.2 — Boost strains with terpene agreement (if terpene profile available)
        const hasTerpeneData = dbCandidate.dbEntry?.terpeneProfile && dbCandidate.dbEntry.terpeneProfile.length > 0;
        // Phase 5.0.4.2 — Boost multi-image confirmation
        const hasMultiImageConfirmation = entry.appearancesAcrossImages >= 2;
        
        let boostAmount = 0;
        const boostReasons: string[] = [];
        
        if (hasFullLineage) {
          boostAmount += 5;
          boostReasons.push("full lineage");
        }
        if (hasTerpeneData) {
          boostAmount += 5;
          boostReasons.push("terpene data");
        }
        if (hasMultiImageConfirmation) {
          boostAmount += 10;
          boostReasons.push("multi-image confirmation");
        }
        
        if (boostAmount > 0) {
          const boostedScore = Math.min(100, entry.avgConfidence + boostAmount);
          console.log(`Phase 5.0.4.2 — BOOSTING "${entry.name}": ${entry.avgConfidence}% → ${boostedScore}% (${boostReasons.join(", ")})`);
          return {
            ...entry,
            avgConfidence: boostedScore,
            maxConfidence: Math.min(100, entry.maxConfidence + boostAmount),
          };
        }
        
        // Phase 4.4 — Boost score for database-filtered match (default boost)
        const boostedScore = Math.round((entry.avgConfidence + dbCandidate.similarityPercent) / 2);
        console.log(`Phase 4.4 — BOOSTING "${entry.name}": ${entry.avgConfidence}% → ${boostedScore}% (database match)`);
        return {
          ...entry,
          avgConfidence: Math.min(100, boostedScore),
          maxConfidence: Math.max(entry.maxConfidence, dbCandidate.similarityPercent),
        };
      }
      return entry;
    });

    // Phase 4.4 — Add database-only candidates if they're not in shortlist
    databaseResult.finalShortlist.forEach(dbCandidate => {
      const existsInShortlist = shortlist.some(
        s => s.canonicalName.toLowerCase() === dbCandidate.canonicalName.toLowerCase()
      );
      
      if (!existsInShortlist && shortlist.length < 10) {
        // Add as new entry with database similarity as confidence
        shortlist.push({
          name: dbCandidate.strainName,
          canonicalName: dbCandidate.canonicalName,
          appearancesAcrossImages: 1, // Database match counts as 1 appearance
          avgConfidence: dbCandidate.similarityPercent,
          maxConfidence: dbCandidate.similarityPercent,
          perImageTraits: new Map([[0, dbCandidate.matchedTraits]]), // Map image 0 to traits
          imageIndices: [0], // Placeholder index
        });
        console.log(`Phase 4.4 — ADDED database candidate "${dbCandidate.strainName}" to shortlist`);
      }
    });

    // Phase 4.3 Step 4.3.2 — Re-sort shortlist after database merge
    shortlist.sort((a, b) => {
      if (b.avgConfidence !== a.avgConfidence) {
        return b.avgConfidence - a.avgConfidence;
      }
      return b.appearancesAcrossImages - a.appearancesAcrossImages;
    });

    console.log("Phase 4.4 — SHORTLIST AFTER DATABASE MERGE:", shortlist.slice(0, 5));
    console.log("Phase 5.0.4.2 — DATABASE DISAMBIGUATION COMPLETE: Applied boosts/penalties to", shortlist.length, "candidates");
  }

  // Phase 4.7 Step 4.7.2 — DISAMBIGUATION LOGIC: Group variants after database merge
  // Group similar strain names (e.g., "Blue Dream", "Blue Dream #1", "Blue Dream Haze")
  const variantGroups = groupVariants(shortlist);
  console.log("Phase 4.7 Step 4.7.2 — Variant Groups:", variantGroups.slice(0, 5));
  
  // Phase 4.7 Step 4.7.2 — Select most likely canonical name from variant groups
  const variantSelection = selectMostLikelyCanonical(variantGroups, fusedFeatures);
  console.log("Phase 4.7 Step 4.7.2 — Variant Selection:", variantSelection);
  
  // Phase 4.7 Step 4.7.2 — Boost canonical name if it matches variant selection
  if (variantSelection.canonicalName) {
    shortlist = shortlist.map(entry => {
      const entryRoot = extractRootName(entry.name);
      const variantRoot = extractRootName(variantSelection.primaryName);
      if (entryRoot.toLowerCase() === variantRoot.toLowerCase() &&
          entry.canonicalName.toLowerCase() === variantSelection.canonicalName.toLowerCase()) {
        // Boost canonical name by 10% (prefer canonical over variants)
        console.log(`Phase 4.7 Step 4.7.2 — BOOSTING canonical variant "${entry.canonicalName}" (+10%)`);
        return {
          ...entry,
          avgConfidence: Math.min(100, entry.avgConfidence + 10),
          maxConfidence: Math.min(100, entry.maxConfidence + 10),
        };
      }
      return entry;
    });
    
    // Re-sort after boosting
    shortlist.sort((a, b) => {
      if (b.avgConfidence !== a.avgConfidence) {
        return b.avgConfidence - a.avgConfidence;
      }
      return b.appearancesAcrossImages - a.appearancesAcrossImages;
    });
    
    console.log("Phase 4.7 Step 4.7.2 — SHORTLIST AFTER VARIANT BOOST:", shortlist.slice(0, 5));
  }

  // Phase 4.9 Step 4.9.1 — NAME CANDIDATE GENERATION
  // From each image analysis, we've extracted top 5 strain name candidates
  // Include: exact name matches, known aliases, parent strain names, phenotype variants
  // This is already done in buildStrainShortlist (processes top 5 per image)
  // Store per image: strainName, confidence, reason (visual/genetic/terpene) ✓

  // Phase 4.9 Step 4.9.2 — CROSS-IMAGE NAME CONSENSUS
  // Across 2–5 images:
  // - Count frequency of each strain name ✓ (done in buildStrainShortlist)
  // - Apply boosts: +20% for ≥2 images, +35% for ≥3 images ✓ (done in buildStrainShortlist)
  // - Penalize: −15% for single-image-only ✓ (done in buildStrainShortlist)
  // Result: Top 3 ranked strain names with scores ✓

  // Phase 5.3 Step 5.3.1 — NAME CANDIDATE EXTRACTION
  // From each image analysis:
  // - Extract top 5 strain candidates ✓ (already done in buildStrainShortlist)
  // - Include confidence score per image ✓ (already done in buildStrainShortlist)
  // - Normalize spelling + aliases ✓ (already done in buildStrainShortlist via normalizeStrainName)
  // This is already handled by buildStrainShortlist which processes top 5 candidates per image

  // Phase 5.3 Step 5.3.2 — MULTI-IMAGE NAME CONSENSUS
  // Across 2–5 images:
  // - Count frequency of each strain name ✓ (already done in buildStrainShortlist)
  // - Boost names appearing in ≥2 images ✓ (already done in buildStrainShortlist: +20% for ≥2, +35% for ≥3)
  // - Penalize one-off names ✓ (already done in buildStrainShortlist: -15% for single-image-only)
  // Scoring factors: Frequency, Confidence average, Image quality weight ✓ (all handled in buildStrainShortlist)

  // Phase 5.0.4.1 — CANDIDATE NAME POOL: Collect top 5 from each image
  // This is already done in buildStrainShortlist (processes top 5 per image)
  // Log candidate pool for verification
  console.log("Phase 5.0.4.1 — CANDIDATE NAME POOL: Collected", shortlist.length, "unique candidates from", imageCount, "images");
  shortlist.slice(0, 10).forEach((candidate, idx) => {
    console.log(`Phase 5.0.4.1 — Candidate ${idx + 1}: "${candidate.name}" (${candidate.avgConfidence}% avg, appears in ${candidate.appearancesAcrossImages} images)`);
  });

  // Phase 5.0.2 — STEP 4: MULTI-IMAGE CONSENSUS (after image narrowing)
  // Phase 4.7 Step 4.7.1 — STEP 4: NAME RESOLUTION (picks BEST NAME FIRST)
  // Phase 4.3 Step 4.3.3 — Disambiguation Logic (via scoring)
  console.log("Phase 5.0.2 — STEP 4: MULTI-IMAGE CONSENSUS (scoring", shortlist.length, "candidates)");
  const scoredResults = scoreNameCompetition(shortlist, fusedFeatures);
  console.log("Phase 5.0.2 — STEP 4 COMPLETE: Scored", scoredResults.length, "candidates");
  console.log("Phase 4.3 Step 4.3.3 — Scored Results:", scoredResults);
  
  // Phase 5.0.4.1 — Log all candidates with visual markers
  console.log("NAME CANDIDATES:", scoredResults.length);
  scoredResults.slice(0, 5).forEach((candidate, idx) => {
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name === candidate.strainName || s.aliases?.includes(candidate.strainName)
    );
    const visualMarkers = dbEntry?.visualProfile 
      ? `Color: ${dbEntry.visualProfile.colorProfile || "N/A"}, Structure: ${dbEntry.visualProfile.budStructure || "N/A"}, Trichomes: ${dbEntry.visualProfile.trichomeDensity || "N/A"}`
      : "Visual markers not available";
    console.log(`Phase 5.0.4.1 — Candidate ${idx + 1}: "${candidate.strainName}" (${candidate.totalScore}% score, ${visualMarkers})`);
  });

  // Phase 5.3 Step 5.3.4 — DISAMBIGUATION RULES (Enhanced)
  // Prefer better-documented strain, prefer modern stabilized cultivar, prefer tighter phenotype match
  const enhancedScoredResults = enhanceDisambiguationWithDocumentation(scoredResults, fusedFeatures);
  console.log("Phase 5.3 Step 5.3.4 — Enhanced Scored Results (after disambiguation rules):", enhancedScoredResults.slice(0, 3));

  // Phase 4.9 Step 4.9.3 — DISAMBIGUATION ENGINE (runs before final selection)
  // If top 2 names are close (<7% apart), use disambiguation engine
  if (enhancedScoredResults.length >= 2) {
    const scoreGap = enhancedScoredResults[0].totalScore - enhancedScoredResults[1].totalScore;
    if (scoreGap < 7) {
      console.log(`Phase 4.9 Step 4.9.3 — Top 2 names are close (gap: ${scoreGap.toFixed(1)}%, threshold: 7%), running disambiguation engine`);
      const { disambiguateCloseNames } = require("./nameDisambiguationV4");
      const disambiguation = disambiguateCloseNames(enhancedScoredResults[0], enhancedScoredResults[1], fusedFeatures);
      
      if (disambiguation) {
        console.log("Phase 4.9 Step 4.9.3 — DISAMBIGUATION RESULT:", disambiguation);
        // Disambiguation reasoning will be included in explanation
      }
    }
  }

  // Phase 5.0.4.3 — CONSENSUS DECISION: Apply rules before selection
  // Rules:
  // - Name must appear in ≥2 images OR
  // - Appear once with ≥93% confidence AND no strong competitors (within 10 points)
  console.log("Phase 5.0.4.3 — CONSENSUS DECISION: Applying selection rules");
  
  // Phase 5.0.4.3 — Filter candidates based on consensus rules
  const filteredCandidates = enhancedScoredResults.filter(candidate => {
    // Find candidate in shortlist to check appearance count
    const shortlistEntry = shortlist.find(s => 
      s.name === candidate.strainName || s.canonicalName === candidate.strainName
    );
    
    if (!shortlistEntry) return false;
    
    const appearances = shortlistEntry.appearancesAcrossImages;
    const score = candidate.totalScore;
    const secondScore = enhancedScoredResults[1]?.totalScore || 0;
    const scoreGap = score - secondScore;
    
    // Rule 1: Appears in ≥2 images
    if (appearances >= 2) {
      console.log(`Phase 5.0.4.3 — "${candidate.strainName}" qualifies: appears in ${appearances} images`);
      return true;
    }
    
    // Rule 2: Appears once with ≥93% confidence AND no strong competitors (gap ≥10)
    if (appearances === 1 && score >= 93 && scoreGap >= 10) {
      console.log(`Phase 5.0.4.3 — "${candidate.strainName}" qualifies: single image but ${score}% confidence with ${scoreGap} point gap`);
      return true;
    }
    
    // Rule 3: If no candidates meet rules, allow top candidate anyway (failsafe)
    if (enhancedScoredResults.indexOf(candidate) === 0 && enhancedScoredResults.length > 0) {
      console.log(`Phase 5.0.4.3 — "${candidate.strainName}" qualifies: top candidate (failsafe)`);
      return true;
    }
    
    console.log(`Phase 5.0.4.3 — "${candidate.strainName}" filtered out: ${appearances} image(s), ${score}% score, ${scoreGap} point gap`);
    return false;
  });
  
  // Phase 5.0.4.3 — Use filtered candidates or fall back to all if none qualify
  const candidatesForSelection = filteredCandidates.length > 0 ? filteredCandidates : enhancedScoredResults;
  console.log("Phase 5.0.4.3 — CONSENSUS DECISION: Using", candidatesForSelection.length, "qualified candidates");

  // Phase 5.0.2 — STEP 5: CONFIDENCE CALCULATION (LAST)
  // Phase 4.3 Step 4.3.4 — Final Name Selection
  // Phase 4.9 Step 4.9.3 — Pass fusedFeatures for disambiguation engine
  // Phase 5.3 — Use enhanced scored results (after disambiguation rules)
  // Phase 5.0.4.3 — Use consensus-filtered candidates
  console.log("Phase 5.0.2 — STEP 5: CONFIDENCE CALCULATION (selecting primary name)");
  const selection = selectPrimaryName(candidatesForSelection, imageCount, fusedFeatures);
  console.log("Phase 5.0.2 — STEP 5 COMPLETE: Primary name selected:", selection.primaryStrainName);
  console.log("Phase 4.3 Step 4.3.4 — Selection:", selection);
  
  // Phase 5.0.4.3 — MANDATORY LOGS
  console.log("NAME CANDIDATES:", candidatesForSelection.length);
  console.log("NAME DECISION:", selection.primaryStrainName);
  const whyThisNameWon = Array.isArray(selection.alternateMatches) && selection.alternateMatches.length > 0
    ? [
        `Selected as primary match with ${selection.nameConfidencePercent}% confidence`,
        `Appeared in ${shortlist.find(s => s.name === selection.primaryStrainName)?.appearancesAcrossImages || 1} image(s)`,
        ...(selection.alternateMatches.length > 0 ? [`Outscored ${selection.alternateMatches.length} alternate candidate(s)`] : []),
      ]
    : [`Selected as primary match with ${selection.nameConfidencePercent}% confidence`];
  console.log("WHY:", whyThisNameWon);
  
  // Phase 5.0.2 — MANDATORY LOGS (legacy)
  console.log("TOP NAME MATCH:", selection.primaryStrainName);
  const alternateNames = Array.isArray(selection.alternateMatches)
    ? selection.alternateMatches.map(a => a.name || "Unknown")
    : [];
  console.log("ALTERNATES:", alternateNames);

  // Phase 5.3 Step 5.3.3 — DATABASE CROSS-VALIDATION
  // Against 35,000-strain dataset: Verify lineage, compare terpenes, reject impossible matches
  const dbEntry = CULTIVAR_LIBRARY.find(s => 
    s.name.toLowerCase() === selection.primaryStrainName.toLowerCase() ||
    (s.aliases && s.aliases.some(a => a.toLowerCase() === selection.primaryStrainName.toLowerCase()))
  );
  const validation = validateNameAgainstDatabase(
    selection.primaryStrainName,
    dbEntry,
    fusedFeatures,
    terpeneProfile,
    strainRatio
  );
  console.log("Phase 5.3 Step 5.3.3 — DATABASE VALIDATION:", validation);
  
  // Phase 4.7 Step 4.7.2 — If variant selection found a canonical name, prefer it if it matches
  if (variantSelection.canonicalName && 
      variantSelection.primaryName !== selection.primaryStrainName &&
      shortlist.some(s => s.canonicalName.toLowerCase() === variantSelection.canonicalName.toLowerCase())) {
    // Check if canonical variant has similar score to primary selection
    const canonicalEntry = shortlist.find(s => s.canonicalName.toLowerCase() === variantSelection.canonicalName.toLowerCase());
    const primaryEntry = shortlist.find(s => s.canonicalName.toLowerCase() === selection.primaryStrainName.toLowerCase());
    
    if (canonicalEntry && primaryEntry) {
      const scoreDiff = Math.abs(canonicalEntry.avgConfidence - primaryEntry.avgConfidence);
      // If canonical variant is within 5% of primary, prefer canonical
      if (scoreDiff <= 5) {
        console.log(`Phase 4.7 Step 4.7.2 — PREFERRING CANONICAL VARIANT "${variantSelection.primaryName}" over "${selection.primaryStrainName}" (score diff: ${scoreDiff}%)`);
        selection.primaryStrainName = variantSelection.primaryName;
      }
    }
  }

  // Phase 4.7 Step 4.7.3 — CONFIDENCE GOVERNOR (ANTI-BULLSH*T)
  // Rules:
  // - Single image → cap 82%
  // - 2 images → cap 90%
  // - 3+ images → cap 97–99%
  // - NEVER show 100%
  // If multiple strains fight for top:
  // - Confidence drops automatically
  // - Variance explanation REQUIRED
  let nameConfidencePercent = Math.max(55, selection.nameConfidencePercent); // Floor at 55% if match exists
  
  if (imageCount === 1) {
    nameConfidencePercent = Math.min(82, nameConfidencePercent);
  } else if (imageCount === 2) {
    nameConfidencePercent = Math.min(90, nameConfidencePercent);
  } else if (imageCount === 3) {
    nameConfidencePercent = Math.min(95, nameConfidencePercent); // Phase 4.7: Cap at 95% for 3 images (not 97%)
  } else if (imageCount >= 4) {
    nameConfidencePercent = Math.min(99, nameConfidencePercent); // Never 100%
  }
  
  // Phase 4.4 Step 4.4.6 — Ensure minimum 55% for failsafe rule
  if (nameConfidencePercent < 55 && databaseResult.closestMatch) {
    nameConfidencePercent = Math.max(55, databaseResult.closestMatch.similarityPercent);
    console.log(`Phase 4.4 Step 4.4.6 — FAILSAFE: Applied minimum 55% confidence floor (${nameConfidencePercent}%)`);
  }

  // Phase 4.3 Step 4.3.4 — Filter alternates (1–2 if confidence <95%)
  const alternateMatches = nameConfidencePercent < 95
    ? selection.alternateMatches.slice(0, 2)
    : selection.alternateMatches.slice(0, 1);

  // Phase 4.3 Step 4.3.5 — Get updated confidence tier
  const { getConfidenceTier } = require("./confidenceTier");
  const nameConfidenceTier = getConfidenceTier(nameConfidencePercent);

  // Phase 4.3 Step 4.3.1 — Generate Explanation
  // Phase 5.3.3 — Include validation notes in explanation
  // Phase 5.0.4.3 — Include consensus decision reasoning
  const explanation = generateNameExplanation(candidatesForSelection, {
    ...selection,
    nameConfidencePercent,
    nameConfidenceTier,
  }, imageCount);
  
  // Phase 5.3.3 — Add validation notes to explanation
  if (validation.validationNotes.length > 0) {
    explanation.whyThisNameWon.push(...validation.validationNotes);
  }
  
  // Phase 5.0.4.3 — Add consensus decision reasoning to explanation
  const shortlistEntry = shortlist.find(s => s.name === selection.primaryStrainName);
  if (shortlistEntry) {
    const appearances = shortlistEntry.appearancesAcrossImages;
    if (appearances >= 2) {
      explanation.whyThisNameWon.unshift(`Appeared in ${appearances} images (multi-image consensus)`);
    } else if (selection.nameConfidencePercent >= 93) {
      explanation.whyThisNameWon.unshift(`High confidence (${selection.nameConfidencePercent}%) with no strong competitors`);
    }
  }

  // Phase 4.7 Step 4.7.3 — If multiple strains fight for top, confidence drops automatically
  const scoreGap = scoredResults.length > 1 
    ? scoredResults[0].totalScore - scoredResults[1].totalScore
    : 100; // Large gap if only one candidate
  
  if (scoreGap < 15 && scoredResults.length > 1) {
    // Phase 4.7 Step 4.7.3 — Multiple strains close in score, reduce confidence
    const reduction = Math.min(10, 15 - scoreGap); // Reduce by up to 10% based on gap
    nameConfidencePercent = Math.max(55, nameConfidencePercent - reduction);
    console.log(`Phase 4.7 Step 4.7.3 — CONFIDENCE GOVERNOR: Multiple strains close (gap: ${scoreGap.toFixed(0)}), reducing confidence by ${reduction}%`);
    
    // Phase 4.7 Step 4.7.3 — Variance explanation REQUIRED
    explanation.varianceNotes.push(
      `Multiple similar strains were close in score (within ${scoreGap.toFixed(0)} points). Confidence reduced to reflect ambiguity.`
    );
  }

  // Phase 5.3 Step 5.3.5 — FINAL OUTPUT
  // Return:
  // - Primary Match: Strain Name, Confidence %, Indica/Sativa/Hybrid ratio (added in runMultiScan)
  // - Alternate Matches: Ranked list (2–4), Short reason for each
  // The ratio is added in runMultiScan after ratio calculation
  // Phase 5.0.2 — Ensure we always return a name (LOCK CONDITION: Never "Unknown" if DB loaded)
  if (!selection.primaryStrainName || selection.primaryStrainName.trim() === "") {
    // Phase 5.0.2 — Failsafe: Use closest match from database
    if (databaseResult.closestMatch) {
      selection.primaryStrainName = databaseResult.closestMatch.strainName;
      console.log(`Phase 5.0.2 — FAILSAFE: Using database closest match "${selection.primaryStrainName}"`);
    } else if (shortlist.length > 0) {
      selection.primaryStrainName = shortlist[0].name;
      console.log(`Phase 5.0.2 — FAILSAFE: Using top shortlist entry "${selection.primaryStrainName}"`);
    } else if (CULTIVAR_LIBRARY.length >= 10000) {
      // Phase 5.0.2 — If database is loaded, use fallback from database (never "Unknown")
      const fallbackStrain = CULTIVAR_LIBRARY[0];
      if (fallbackStrain) {
        selection.primaryStrainName = fallbackStrain.name;
        console.warn(`Phase 5.0.2 — FAILSAFE: Using database fallback "${selection.primaryStrainName}" (database has ${CULTIVAR_LIBRARY.length} strains)`);
      } else {
        // PHASE A FINALIZATION — Never throw, always return a name
        console.error("PHASE A FINALIZATION: Database loaded but empty, using generic fallback");
        selection.primaryStrainName = "Closest Known Cultivar";
      }
    } else {
      // Phase 5.0.2 — Only allow "Unknown" if database is not loaded (< 10K strains)
      selection.primaryStrainName = "Hybrid Cultivar"; // Use generic name instead of "Unknown"
      console.warn(`Phase 5.0.2 — FAILSAFE: Database not loaded (${CULTIVAR_LIBRARY.length} strains), using generic fallback`);
    }
  }

  // Phase 4.4 Step 4.4.6 — FAILSAFE: Add uncertainty explanation if confidence is low
  if (nameConfidencePercent < 70 && databaseResult.closestMatch) {
    explanation.varianceNotes.push(
      `This is the closest known match from our 35,000-strain database, but confidence is limited due to visual similarity with other strains.`
    );
    if (!databaseResult.hasValidMatch) {
      explanation.whyThisNameWon.push(
        `Selected as closest known match despite low confidence threshold (${nameConfidencePercent}%)`
      );
    }
  }

  // Phase 5.0.2 — Ensure we never return "Unknown" if database is loaded
  if (!selection.primaryStrainName || selection.primaryStrainName === "Unknown" || selection.primaryStrainName === "Unidentified") {
    if (databaseResult.closestMatch) {
      console.log("Phase 5.0.2 — FAILSAFE: Primary name was invalid, using database closest match");
      return {
        primaryStrainName: databaseResult.closestMatch.strainName,
        nameConfidencePercent: Math.max(55, databaseResult.closestMatch.similarityPercent),
        nameConfidenceTier: databaseResult.closestMatch.confidenceTier,
        alternateMatches: Array.isArray(databaseResult.finalShortlist)
          ? databaseResult.finalShortlist.slice(1, 3).map(c => ({
              name: c.strainName || "Unknown",
              score: c.similarityPercent || 0,
              whyNotPrimary: `Similarity: ${c.similarityPercent || 0}% (below primary match)`,
            }))
          : [],
        explanation: {
          whyThisNameWon: Array.isArray(databaseResult.closestMatch.reasonForInclusion)
            ? databaseResult.closestMatch.reasonForInclusion
            : [String(databaseResult.closestMatch.reasonForInclusion || "Closest known match from database")],
          whatRuledOutOthers: [
            `Other candidates had lower similarity scores or conflicting visual traits`,
          ],
          varianceNotes: [
            `This match represents the closest known cultivar in our database, but confidence is limited.`,
          ],
        },
      };
    } else if (CULTIVAR_LIBRARY.length >= 10000) {
      // Phase 5.0.2 — If database loaded, use first strain as fallback (never "Unknown")
      const fallbackStrain = CULTIVAR_LIBRARY[0];
      if (fallbackStrain) {
        console.warn(`Phase 5.0.2 — FAILSAFE: Using database fallback "${fallbackStrain.name}"`);
        return {
          primaryStrainName: fallbackStrain.name,
          nameConfidencePercent: 55, // Minimum confidence
          nameConfidenceTier: "low",
          alternateMatches: [],
          explanation: {
            whyThisNameWon: [`Fallback match from ${CULTIVAR_LIBRARY.length}-strain database`],
            whatRuledOutOthers: [],
            varianceNotes: [`Low confidence fallback - visual analysis inconclusive`],
          },
        };
      }
    }
  }

  return {
    primaryStrainName: selection.primaryStrainName,
    nameConfidencePercent: Math.round(nameConfidencePercent),
    nameConfidenceTier: nameConfidenceTier.tier,
    alternateMatches,
    explanation,
  };
}
