// lib/scanner/nameFirstPipeline.ts
// Phase 4.3 Step 4.3.1 — Name-First Pipeline

import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import { buildStrainShortlist } from "./strainShortlist";
import { scoreNameCompetition } from "./nameCompetition";
import { selectPrimaryName, generateNameExplanation } from "./nameFirstDisambiguation";
// Phase 4.4 — Database Leverage (runs FIRST, before shortlist)
import { leverageDatabaseFilter } from "./databaseFilter";

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
};

/**
 * Phase 4.3 Step 4.3.1 — Name-First Pipeline
 * 
 * CHANGED FLOW TO:
 * 1. Candidate Name Resolution (TOP)
 * 2. Confidence Assignment
 * 3. Evidence & Explanation
 * 4. Deep Wiki Report (Phase 4.2)
 * 
 * RULE:
 * - UI MUST show a strain name immediately once resolved
 * - Everything else supports or challenges that name
 */
export function runNameFirstPipeline(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number
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

  // Phase 4.3 Step 4.3.3 — Disambiguation Logic (via scoring)
  const scoredResults = scoreNameCompetition(shortlist, fusedFeatures);
  console.log("Phase 4.3 Step 4.3.3 — Scored Results:", scoredResults);

  // Phase 4.3 Step 4.3.4 — Final Name Selection
  const selection = selectPrimaryName(scoredResults, imageCount);
  console.log("Phase 4.3 Step 4.3.4 — Selection:", selection);

  // Phase 4.3 Step 4.3.5 — Apply Confidence Cap Rules
  // Phase 4.4 Step 4.4.6 — Failsafe: Never go below 55% if we have a match
  let nameConfidencePercent = Math.max(55, selection.nameConfidencePercent); // Floor at 55% if match exists
  
  if (imageCount === 1) {
    nameConfidencePercent = Math.min(82, nameConfidencePercent);
  } else if (imageCount === 2) {
    nameConfidencePercent = Math.min(90, nameConfidencePercent);
  } else if (imageCount === 3) {
    nameConfidencePercent = Math.min(95, nameConfidencePercent);
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
  const explanation = generateNameExplanation(scoredResults, {
    ...selection,
    nameConfidencePercent,
    nameConfidenceTier,
  }, imageCount);

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
