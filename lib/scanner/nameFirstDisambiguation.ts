// lib/scanner/nameFirstDisambiguation.ts
// Phase 4.1 Steps 4.1.4 & 4.1.5 — Select Primary Name & Generate Explanation

import type { NameScoreResult } from "./nameCompetition";
import type { ConfidenceTierLabel } from "./confidenceTier";
import { getConfidenceTier } from "./confidenceTier";
// Phase 4.9 Step 4.9.3 — Disambiguation Engine
import { disambiguateCloseNames } from "./nameDisambiguationV4";

import { normalizeStrainName } from "./nameNormalization";
import { groupClones, type CloneGroup } from "./cloneGrouping";

/**
 * Phase 4.1 Step 4.1.4 — Name Selection Result
 */
export type NameSelectionResult = {
  primaryStrainName: string;
  nameConfidencePercent: number; // Derived, capped by image count
  nameConfidenceTier: ConfidenceTierLabel; // Medium / High / Very High
  alternateMatches: Array<{
    name: string;
    score: number;
    whyNotPrimary: string;
  }>; // 2–3 close contenders
  cloneGroup?: CloneGroup; // STEP 6.0.2 — Detected clone group
};

/**
 * Phase 4.1 Step 4.1.5 — Explanation Object
 */
export type NameExplanation = {
  whyThisNameWon: string[]; // Bullet reasons
  whatRuledOutOthers: string[]; // Why other candidates didn't win
  varianceNotes: string[]; // Phenotype explanation
};

/**
 * Phase 4.1 Step 4.1.4 — Select Primary Name
 * 
 * SELECT:
 * - Highest total score → primaryStrainName
 * 
 * ALSO PRODUCE:
 * - alternateMatches[] (2–3 close contenders)
 * - nameConfidencePercent (derived, capped by image count)
 * - nameConfidenceTier (Medium / High / Very High)
 */
export function selectPrimaryName(
  scoredResults: NameScoreResult[],
  imageCount: number,
  fusedFeatures?: import("./multiImageFusion").FusedFeatures // Phase 4.9 Step 4.9.3 — For disambiguation
): NameSelectionResult {
  if (scoredResults.length === 0) {
    // Fallback
    return {
      primaryStrainName: "Hybrid Cultivar",
      nameConfidencePercent: 60,
      nameConfidenceTier: getConfidenceTier(60),
      alternateMatches: [],
    };
  }

  // STEP 6.0.2 — Group clones
  const cloneGroups = groupClones(scoredResults);
  const topGroup = cloneGroups[0];
  
  // STEP 6.0.3 — Primary name is the canonical name of the top group
  const primaryStrainName = topGroup.canonicalName;

  const topResult = scoredResults.find(r => r.strainName === primaryStrainName) || scoredResults[0];
  const secondResult = scoredResults.filter(r => normalizeStrainName(r.strainName) !== normalizeStrainName(primaryStrainName))[0];
  const thirdResult = scoredResults.filter(r => normalizeStrainName(r.strainName) !== normalizeStrainName(primaryStrainName))[1];

  // Phase 4.1 Step 4.1.4 — Derive confidence from total score, capped by image count
  let nameConfidencePercent = topResult.totalScore;
  
  // STEP 6.0.5 — Cap confidence if clones detected
  const hasClones = topGroup.variants.length > 1;
  const confidenceCap = hasClones ? 97 : 99;

  // Phase 4.1 Step 4.1.4 — Cap confidence by image count (from Phase 4.0 Part D)
  if (imageCount === 1) {
    nameConfidencePercent = Math.min(82, nameConfidencePercent);
  } else if (imageCount === 2) {
    nameConfidencePercent = Math.min(90, nameConfidencePercent);
  } else if (imageCount >= 3) {
    nameConfidencePercent = Math.min(confidenceCap, nameConfidencePercent);
  }

  // Phase 4.1 Step 4.1.4 — Get confidence tier
  const nameConfidenceTier = getConfidenceTier(nameConfidencePercent);

  // Phase 4.1 Step 4.1.4 — Build alternate matches (2–3 close contenders)
  const alternateMatches: Array<{
    name: string;
    score: number;
    whyNotPrimary: string;
  }> = [];

  const scoreGap = topResult.totalScore - (secondResult?.totalScore || 0);
  
  // Phase 4.9 Step 4.9.3 — DISAMBIGUATION ENGINE
  // If top 2 names are close (<7% apart), use disambiguation engine
  let finalTopResult = topResult;
  let finalSecondResult = secondResult;
  let disambiguationReasoning: string[] = [];
  
  if (secondResult && scoreGap < 7 && fusedFeatures) {
    // Phase 4.9 Step 4.9.3 — Run disambiguation engine
    const disambiguation = disambiguateCloseNames(topResult, secondResult, fusedFeatures);
    
    if (disambiguation) {
      console.log("Phase 4.9 Step 4.9.3 — DISAMBIGUATION RESULT:", disambiguation);
      disambiguationReasoning = disambiguation.reasoning;
      
      // Check if disambiguation suggests swapping (for now, keep conservative approach)
      // In future, could swap if loser has significantly higher overlap score
      // For now, just add disambiguation reasoning to whyNotPrimary
    }
  }

  if (secondResult && scoreGap < 20) {
    // Phase 4.9 Step 4.9.3 — Include disambiguation reasoning if available
    const whyNotPrimaryBase = `Close match (${scoreGap.toFixed(0)} points lower). ${getWhyNotPrimary(finalSecondResult!, finalTopResult)}`;
    const whyNotPrimaryWithDisambiguation = disambiguationReasoning.length > 0
      ? `${whyNotPrimaryBase} Disambiguation comparison: ${disambiguationReasoning.slice(0, 2).join("; ")}`
      : whyNotPrimaryBase;
    
    alternateMatches.push({
      name: finalSecondResult!.strainName,
      score: finalSecondResult!.totalScore,
      whyNotPrimary: whyNotPrimaryWithDisambiguation,
    });
  }

  if (thirdResult && (topResult.totalScore - thirdResult.totalScore) < 25) {
    alternateMatches.push({
      name: thirdResult.strainName,
      score: thirdResult.totalScore,
      whyNotPrimary: `${(topResult.totalScore - thirdResult.totalScore).toFixed(0)} points lower. ${getWhyNotPrimary(thirdResult, finalTopResult)}`,
    });
  }

  return {
    primaryStrainName,
    nameConfidencePercent: Math.round(nameConfidencePercent),
    nameConfidenceTier,
    alternateMatches: alternateMatches.slice(0, 3), // Max 3 alternates
    cloneGroup: topGroup, // STEP 6.0.2
  };
}

/**
 * Phase 4.1 Step 4.1.5 — Generate Explanation Object
 * 
 * GENERATE:
 * - whyThisNameWon (bullet reasons)
 * - whatRuledOutOthers
 * - varianceNotes (phenotype explanation)
 * 
 * DO NOT:
 * - Claim lab certainty
 * - Claim 100%
 */
export function generateNameExplanation(
  scoredResults: NameScoreResult[],
  selection: NameSelectionResult,
  imageCount: number
): NameExplanation {
  if (scoredResults.length === 0) {
    return {
      whyThisNameWon: ["Unable to generate explanation due to insufficient data"],
      whatRuledOutOthers: [],
      varianceNotes: [],
    };
  }

  const topResult = scoredResults[0];
  const shortlistEntry = topResult.shortlistEntry;

  // Phase 4.1 Step 4.1.5 — Why This Name Won
  const whyThisNameWon: string[] = [];
  
  // Structure match
  if (topResult.scores.visualStructure >= 20) {
    whyThisNameWon.push(`Strong visual structure match (${topResult.scores.visualStructure}/30)`);
  } else if (topResult.scores.visualStructure >= 10) {
    whyThisNameWon.push(`Good visual structure alignment (${topResult.scores.visualStructure}/30)`);
  }

  // Trichome match
  if (topResult.scores.trichomeFrost >= 15) {
    whyThisNameWon.push(`Trichome density closely matches expected profile (${topResult.scores.trichomeFrost}/20)`);
  }

  // Color match
  if (topResult.scores.color >= 10) {
    whyThisNameWon.push(`Pistil color matches expected characteristics (${topResult.scores.color}/15)`);
  }

  // Cross-image agreement
  if (shortlistEntry.appearancesAcrossImages >= 2) {
    whyThisNameWon.push(
      `Identified consistently across ${shortlistEntry.appearancesAcrossImages} out of ${imageCount} images`
    );
  }

  // Total score
  whyThisNameWon.push(
    `Overall match score: ${topResult.totalScore.toFixed(0)}/100 (highest among candidates)`
  );

  // Phase 4.1 Step 4.1.5 — What Ruled Out Others
  const whatRuledOutOthers: string[] = [];

  scoredResults.slice(1, 4).forEach((result, idx) => {
    const scoreGap = topResult.totalScore - result.totalScore;
    
    if (scoreGap > 15) {
      whatRuledOutOthers.push(
        `${result.strainName}: ${scoreGap.toFixed(0)} points lower overall score. ` +
        `Structure: ${result.scores.visualStructure}/30, Trichomes: ${result.scores.trichomeFrost}/20, ` +
        `Agreement: ${result.scores.crossImageAgreement}/15`
      );
    } else {
      whatRuledOutOthers.push(
        `${result.strainName}: Close contender (${scoreGap.toFixed(0)} points lower), ` +
        `but ${topResult.scores.visualStructure > result.scores.visualStructure ? "structure" : 
            topResult.scores.trichomeFrost > result.scores.trichomeFrost ? "trichome density" :
            "cross-image agreement"} favored ${topResult.strainName}`
      );
    }

    // Check for contradictions
    if (result.contradictions.length > 0) {
      whatRuledOutOthers.push(
        `${result.strainName}: Contradictions detected: ${result.contradictions.slice(0, 2).join(", ")}`
      );
    }
  });

  // Phase 4.1 Step 4.1.5 — Variance Notes (phenotype explanation)
  const varianceNotes: string[] = [];

  if (topResult.contradictions.length > 0) {
    varianceNotes.push(
      `Some phenotype variance observed: ${topResult.contradictions.join("; ")}. ` +
      `This is normal due to growing conditions, harvest timing, and natural genetic variation.`
    );
  }

  if (shortlistEntry.appearancesAcrossImages < imageCount) {
    varianceNotes.push(
      `Not all images identified the same strain (${shortlistEntry.appearancesAcrossImages}/${imageCount} images). ` +
      `This may indicate phenotype variation or different growth stages captured in the images.`
    );
  }

  const strainType = topResult.strainProfile.type || topResult.strainProfile.dominantType;
  if (strainType === "Hybrid") {
    varianceNotes.push(
      `As a ${strainType} cultivar, ${topResult.strainName} can express varying phenotypes ` +
      `depending on genetic expression and growing conditions.`
    );
  }

  // Phase 4.1 Step 4.1.5 — Never claim lab certainty
  if (selection.nameConfidencePercent >= 95) {
    varianceNotes.push(
      `While visual traits strongly align, this is a visual identification based on morphology. ` +
      `Lab testing would provide definitive confirmation.`
    );
  } else if (selection.nameConfidencePercent >= 85) {
    varianceNotes.push(
      `Visual identification suggests ${topResult.strainName}, but phenotype variance ` +
      `means different phenotypes of this strain may appear different.`
    );
  }

  return {
    whyThisNameWon,
    whatRuledOutOthers: whatRuledOutOthers.slice(0, 5), // Max 5 reasons
    varianceNotes,
  };
}

/**
 * Helper: Get why a candidate wasn't primary
 */
function getWhyNotPrimary(
  candidate: NameScoreResult,
  winner: NameScoreResult
): string {
  const gaps = [];
  
  if (candidate.scores.visualStructure < winner.scores.visualStructure) {
    gaps.push(`structure (${candidate.scores.visualStructure} vs ${winner.scores.visualStructure})`);
  }
  if (candidate.scores.trichomeFrost < winner.scores.trichomeFrost) {
    gaps.push(`trichomes (${candidate.scores.trichomeFrost} vs ${winner.scores.trichomeFrost})`);
  }
  if (candidate.scores.crossImageAgreement < winner.scores.crossImageAgreement) {
    gaps.push(`cross-image agreement (${candidate.scores.crossImageAgreement} vs ${winner.scores.crossImageAgreement})`);
  }

  if (gaps.length > 0) {
    return `Weaker in: ${gaps.slice(0, 2).join(", ")}`;
  }

  return `Overall score lower (${candidate.totalScore.toFixed(0)} vs ${winner.totalScore.toFixed(0)})`;
}

/**
 * Phase 4.1 — Complete Name-First Disambiguation
 * Combines all steps into a single function
 */
export type NameFirstDisambiguationResult = {
  selection: NameSelectionResult;
  explanation: NameExplanation;
  allScoredResults: NameScoreResult[]; // All candidates with scores
};

export function performNameFirstDisambiguation(
  shortlist: ReturnType<typeof import("./strainShortlist").buildStrainShortlist>,
  fusedFeatures: import("./multiImageFusion").FusedFeatures,
  imageCount: number
): NameFirstDisambiguationResult {
  // Step 4.1.3 — Score name competition
  const { scoreNameCompetition } = require("./nameCompetition");
  const scoredResults = scoreNameCompetition(shortlist, fusedFeatures);

  // Step 4.1.4 — Select primary name
  const selection = selectPrimaryName(scoredResults, imageCount);

  // Step 4.1.5 — Generate explanation
  const explanation = generateNameExplanation(scoredResults, selection, imageCount);

  return {
    selection,
    explanation,
    allScoredResults: scoredResults,
  };
}
