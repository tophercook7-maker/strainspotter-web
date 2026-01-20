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
  // Phase 4.4 Step 4.4.1 — DATABASE-FIRST FILTER (runs BEFORE consensus scoring)
  // Query 35K database using visual phenotype vectors, return Top 50 candidates
  // Then: Hard elimination → Similarity scoring → Alias expansion → Final shortlist (Top 3)
  const databaseResult = leverageDatabaseFilter(fusedFeatures, imageResults, imageCount);
  console.log("Phase 4.4 — DATABASE FILTER RESULT:", databaseResult);

  // Phase 4.4 Step 4.4.6 — FAILSAFE RULE: If no valid match, still proceed with closest guess
  if (!databaseResult.hasValidMatch && databaseResult.closestMatch) {
    console.log(`Phase 4.4 Step 4.4.6 — FAILSAFE: Using closest match "${databaseResult.closestMatch.strainName}" (${databaseResult.closestMatch.similarityPercent}% confidence, below 55% threshold)`);
    // Continue with closest match but will mark as low confidence
  }

  // Phase 4.3 Step 4.3.2 — Build Candidate Name Pool (now uses database-filtered results)
  // Convert database-filtered shortlist to ImageResult format for compatibility
  // If database filter found candidates, prioritize them; otherwise fall back to per-image analysis
  let shortlist = buildStrainShortlist(imageResults);
  console.log("Phase 4.3 Step 4.3.2 — Shortlist (before database merge):", shortlist);

  // Phase 4.4 Step 4.4.5 — Merge database-filtered candidates into shortlist
  // Boost candidates that appear in both database filter AND per-image analysis
  if (databaseResult.finalShortlist.length > 0) {
    // Create a map of database-filtered candidates
    const dbCandidatesMap = new Map<string, typeof databaseResult.finalShortlist[0]>();
    databaseResult.finalShortlist.forEach(c => {
      dbCandidatesMap.set(c.canonicalName.toLowerCase(), c);
      // Also map aliases
      c.aliases.forEach(alias => {
        dbCandidatesMap.set(alias.toLowerCase(), c);
      });
    });

    // Boost shortlist entries that match database-filtered candidates
    shortlist = shortlist.map(entry => {
      const canonicalLower = entry.canonicalName.toLowerCase();
      const dbCandidate = dbCandidatesMap.get(canonicalLower);
      
      if (dbCandidate) {
        // Phase 4.4 — Boost score for database-filtered match
        // Average the per-image score with database similarity score
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

  // Phase 4.7 Step 4.7.1 — STEP 4: NAME RESOLUTION (picks BEST NAME FIRST)
  // Phase 4.3 Step 4.3.3 — Disambiguation Logic (via scoring)
  const scoredResults = scoreNameCompetition(shortlist, fusedFeatures);
  console.log("Phase 4.3 Step 4.3.3 — Scored Results:", scoredResults);

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

  // Phase 4.3 Step 4.3.4 — Final Name Selection
  // Phase 4.9 Step 4.9.3 — Pass fusedFeatures for disambiguation engine
  // Phase 5.3 — Use enhanced scored results (after disambiguation rules)
  const selection = selectPrimaryName(enhancedScoredResults, imageCount, fusedFeatures);
  console.log("Phase 4.3 Step 4.3.4 — Selection:", selection);

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
  const explanation = generateNameExplanation(enhancedScoredResults, {
    ...selection,
    nameConfidencePercent,
    nameConfidenceTier,
  }, imageCount);
  
  // Phase 5.3.3 — Add validation notes to explanation
  if (validation.validationNotes.length > 0) {
    explanation.whyThisNameWon.push(...validation.validationNotes);
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
  // Phase 5.3.5 — Ensure we always return a name (LOCK CONDITION: Always return a name)
  if (!selection.primaryStrainName || selection.primaryStrainName.trim() === "") {
    // Failsafe: Use closest match from database
    if (databaseResult.closestMatch) {
      selection.primaryStrainName = databaseResult.closestMatch.strainName;
      console.log(`Phase 5.3.5 — FAILSAFE: Using database closest match "${selection.primaryStrainName}"`);
    } else if (shortlist.length > 0) {
      selection.primaryStrainName = shortlist[0].name;
      console.log(`Phase 5.3.5 — FAILSAFE: Using top shortlist entry "${selection.primaryStrainName}"`);
    } else {
      selection.primaryStrainName = "Unknown Strain";
      console.warn(`Phase 5.3.5 — FAILSAFE: No valid name found, using "Unknown Strain"`);
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

  // Phase 4.4 Step 4.4.6 — Ensure we never return empty result
  if (!selection.primaryStrainName || selection.primaryStrainName === "Unknown") {
    if (databaseResult.closestMatch) {
      console.log("Phase 4.4 Step 4.4.6 — FAILSAFE: Primary name was Unknown, using database closest match");
      return {
        primaryStrainName: databaseResult.closestMatch.strainName,
        nameConfidencePercent: Math.max(55, databaseResult.closestMatch.similarityPercent),
        nameConfidenceTier: databaseResult.closestMatch.confidenceTier,
        alternateMatches: databaseResult.finalShortlist.slice(1, 3).map(c => ({
          name: c.strainName,
          score: c.similarityPercent,
          whyNotPrimary: `Similarity: ${c.similarityPercent}% (below primary match)`,
        })),
        explanation: {
          whyThisNameWon: [
            databaseResult.closestMatch.reasonForInclusion,
            `Closest known match from 35K-strain database`,
          ],
          whatRuledOutOthers: [
            `Other candidates had lower similarity scores or conflicting visual traits`,
          ],
          varianceNotes: [
            `This match represents the closest known cultivar in our database, but confidence is limited.`,
          ],
        },
      };
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
