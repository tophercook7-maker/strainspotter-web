// lib/scanner/aiReasoning.ts
// Phase 2.3 Part G — AI Reasoning Layer

import type { FusedFeatures } from "./multiImageFusion";
import type { WikiData } from "./wikiLookup";
import type { StrainMatch } from "./nameFirstMatcher";

export type AIReasoningResult = {
  explanation: string;
  keyTraits: string[];
  confidenceFactors: string[];
};

/**
 * Generate AI explanation using fused visual features, wiki genetics, terpene tendencies, strain history
 * Phase 2.3 Part G Step 4
 */
export function generateAIReasoning(
  strainName: string,
  fused: FusedFeatures,
  wikiData: WikiData | null,
  primaryMatch: StrainMatch,
  terpeneProfile: string[]
): AIReasoningResult {
  const keyTraits: string[] = [];
  const confidenceFactors: string[] = [];

  // Visual traits matched
  if (primaryMatch.matchedTraits.length > 0) {
    keyTraits.push(...primaryMatch.matchedTraits);
  }

  // Feature agreement
  if (fused.variance < 20) {
    confidenceFactors.push("Strong visual agreement across multiple images");
  } else if (fused.variance < 40) {
    confidenceFactors.push("Moderate visual agreement with some variation");
  } else {
    confidenceFactors.push("Some visual variation observed across images");
  }

  // Build explanation
  let explanation = `This plant most closely matches ${strainName} based on `;
  
  // Visual traits
  if (keyTraits.length > 0) {
    explanation += `visual traits including ${keyTraits.slice(0, 3).join(", ")}. `;
  }

  // Wiki genetics
  if (wikiData) {
    explanation += `Known genetics (${wikiData.genetics}) align with observed morphology. `;
    if (wikiData.summary) {
      explanation += `${wikiData.summary} `;
    }
  }

  // Terpene profile
  if (terpeneProfile.length > 0) {
    explanation += `The observed trichome density and structure suggest terpene profiles consistent with ${terpeneProfile.slice(0, 2).join(" and ")}. `;
  }

  // Confidence factors
  if (confidenceFactors.length > 0) {
    explanation += confidenceFactors[0] + ". ";
  }

  // Avoid medical claims
  explanation += "This identification is based on visual similarity and known cultivar characteristics, not genetic testing.";

  return {
    explanation,
    keyTraits,
    confidenceFactors,
  };
}
