// lib/scanner/nameResolution.ts
// Phase 3.8 Part B — Name Resolution Logic

import type { CandidateStrain } from "./strainCandidatePool";
import type { ConsensusResult } from "./consensusEngine";

/**
 * Phase 3.8 Part B — Name Resolution Result
 */
export type NameResolutionResult = {
  primaryName: string;
  confidence: number;
  matchType: "clear_winner" | "close_alternatives" | "family_level";
  closestAlternate?: {
    name: string;
    confidence: number;
    whyNotPrimary: string;
  };
  reasoning: string[];
  strainFamily?: string;
};

/**
 * Phase 3.8 Part B — Resolve final name using multiple factors
 * 
 * Factors:
 * - Multi-image consensus (Phase 3.7)
 * - Visual trait alignment
 * - Genetic lineage plausibility
 * - Known phenotype stability
 * 
 * Rules:
 * - If 1 clear winner → Primary Match
 * - If 2 close → Name + "Closest Alternate"
 * - If unclear → Family-level naming (e.g., "OG-type Hybrid")
 */
export function resolveStrainName(
  candidates: CandidateStrain[],
  consensusResult: ConsensusResult | null,
  imageCount: number
): NameResolutionResult {
  if (candidates.length === 0) {
    // Fallback to consensus if no candidates
    if (consensusResult) {
      return {
        primaryName: consensusResult.primaryMatch.name,
        confidence: consensusResult.primaryMatch.confidence,
        matchType: "clear_winner",
        reasoning: [consensusResult.primaryMatch.reason],
      };
    }
    // Final fallback
    return {
      primaryName: "Hybrid Cultivar",
      confidence: 60,
      matchType: "family_level",
      reasoning: ["Unable to identify specific cultivar from visual analysis"],
    };
  }

  const topCandidate = candidates[0];
  const secondCandidate = candidates[1];

  // Phase 3.8 Part B — Determine if clear winner or close alternatives
  const confidenceDiff = topCandidate.confidence - (secondCandidate?.confidence || 0);
  const hasMultiImageAgreement = consensusResult && 
    consensusResult.primaryMatch.name === topCandidate.name &&
    (consensusResult.agreementScore || 0) >= 70;

  let matchType: "clear_winner" | "close_alternatives" | "family_level";
  let reasoning: string[] = [];

  if (confidenceDiff >= 15 && hasMultiImageAgreement) {
    // Phase 3.8 Part B — Clear winner
    matchType = "clear_winner";
    reasoning = [
      ...topCandidate.reasoning,
      `Strong visual alignment with ${topCandidate.name}`,
      imageCount > 1 ? `${imageCount} images consistently identified this strain` : "Single image analysis supports this match",
    ];
  } else if (confidenceDiff >= 5 && secondCandidate) {
    // Phase 3.8 Part B — Close alternatives
    matchType = "close_alternatives";
    reasoning = [
      ...topCandidate.reasoning,
      `${topCandidate.name} is the closest match`,
      `Alternative: ${secondCandidate.name} (${secondCandidate.confidence}% confidence)`,
      confidenceDiff < 10 ? "Multiple strains show similar characteristics" : "",
    ].filter(Boolean);
  } else {
    // Phase 3.8 Part B — Family-level naming
    matchType = "family_level";
    const familyName = topCandidate.strainFamily 
      ? `${topCandidate.strainFamily}-type`
      : `${topCandidate.name}-type`;
    
    reasoning = [
      `Visual traits suggest ${familyName} lineage`,
      `Most closely related to ${topCandidate.name}`,
      "Specific cultivar identification uncertain due to phenotype variation",
    ];
  }

  // Use consensus confidence if available and matches
  const finalConfidence = consensusResult && 
    consensusResult.primaryMatch.name === topCandidate.name
    ? consensusResult.primaryMatch.confidence
    : topCandidate.confidence;

  return {
    primaryName: matchType === "family_level" 
      ? (topCandidate.strainFamily ? `${topCandidate.strainFamily}-type Hybrid` : `${topCandidate.name}-type`)
      : topCandidate.name,
    confidence: finalConfidence,
    matchType,
    closestAlternate: secondCandidate && confidenceDiff < 15 ? {
      name: secondCandidate.name,
      confidence: secondCandidate.confidence,
      whyNotPrimary: `Close match (${confidenceDiff.toFixed(0)}% difference), but ${topCandidate.matchedTraits.length} traits favor ${topCandidate.name}`,
    } : undefined,
    reasoning,
    strainFamily: topCandidate.strainFamily,
  };
}
