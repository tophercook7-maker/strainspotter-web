// lib/scanner/nameFirstPipeline.ts
// Phase 4.3 Step 4.3.1 — Name-First Pipeline

import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import { buildStrainShortlist } from "./strainShortlist";
import { scoreNameCompetition } from "./nameCompetition";
import { selectPrimaryName, generateNameExplanation } from "./nameFirstDisambiguation";

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
  // Phase 4.3 Step 4.3.2 — Build Candidate Name Pool
  const shortlist = buildStrainShortlist(imageResults);
  console.log("Phase 4.3 Step 4.3.2 — Shortlist:", shortlist);

  // Phase 4.3 Step 4.3.3 — Disambiguation Logic (via scoring)
  const scoredResults = scoreNameCompetition(shortlist, fusedFeatures);
  console.log("Phase 4.3 Step 4.3.3 — Scored Results:", scoredResults);

  // Phase 4.3 Step 4.3.4 — Final Name Selection
  const selection = selectPrimaryName(scoredResults, imageCount);
  console.log("Phase 4.3 Step 4.3.4 — Selection:", selection);

  // Phase 4.3 Step 4.3.5 — Apply Confidence Cap Rules
  let nameConfidencePercent = selection.nameConfidencePercent;
  
  if (imageCount === 1) {
    nameConfidencePercent = Math.min(82, nameConfidencePercent);
  } else if (imageCount === 2) {
    nameConfidencePercent = Math.min(90, nameConfidencePercent);
  } else if (imageCount === 3) {
    nameConfidencePercent = Math.min(95, nameConfidencePercent);
  } else if (imageCount >= 4) {
    nameConfidencePercent = Math.min(99, nameConfidencePercent); // Never 100%
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

  return {
    primaryStrainName: selection.primaryStrainName,
    nameConfidencePercent: Math.round(nameConfidencePercent),
    nameConfidenceTier: nameConfidenceTier.tier,
    alternateMatches,
    explanation,
  };
}
