// Phase 5.1.4 — CONFIDENCE EXPLANATION
// lib/scanner/confidenceExplanation.ts

import type { FinalDecision } from "./finalDecisionEngine";
import type { ConsensusResult } from "./consensusEngine";
import type { ImageResult } from "./consensusEngine";

/**
 * Phase 5.1.4 — Generate confidence explanation
 * 
 * Explains:
 * - How many images helped
 * - Where confidence was gained
 * - Where uncertainty exists
 * 
 * Language: "Based on visual agreement across 3 photos and genetic similarity…"
 */
export function generateConfidenceExplanationV514(
  finalDecision: FinalDecision | { primaryStrainName: string; confidence: number },
  primaryCandidate?: {
    channelScores: {
      visual: number;
      genetics: number;
      terpenes: number;
      effects: number;
    };
  },
  imageCount: number = 1,
  crossImageAgreement?: number,
  contradictionScore?: number
): string {
  const confidence = finalDecision.confidence;
  const parts: string[] = [];
  
  // How many images helped
  if (imageCount === 1) {
    parts.push("Based on analysis of 1 photo");
  } else {
    parts.push(`Based on visual agreement across ${imageCount} photos`);
  }
  
  // Where confidence was gained
  const confidenceGains: string[] = [];
  
  // Visual agreement
  const visualScore = primaryCandidate?.channelScores.visual ?? 0.7;
  if (visualScore >= 0.7) {
    confidenceGains.push("strong visual similarity");
  } else if (visualScore >= 0.5) {
    confidenceGains.push("visual similarity");
  }
  
  // Genetic similarity
  const geneticsScore = primaryCandidate?.channelScores.genetics ?? 0.7;
  if (geneticsScore >= 0.7) {
    confidenceGains.push("genetic similarity");
  } else if (geneticsScore >= 0.5) {
    confidenceGains.push("genetic alignment");
  }
  
  // Multi-image agreement
  const agreement = crossImageAgreement ?? 
                    ("crossImageAgreement" in finalDecision ? finalDecision.crossImageAgreement : undefined) ?? 
                    0.7;
  if (imageCount > 1) {
    if (agreement >= 0.8) {
      confidenceGains.push("consistent identification across images");
    } else if (agreement >= 0.6) {
      confidenceGains.push("general agreement across images");
    }
  }
  
  // Terpene/effect consistency
  const terpeneScore = primaryCandidate?.channelScores.terpenes ?? 0.6;
  const effectScore = primaryCandidate?.channelScores.effects ?? 0.6;
  if (terpeneScore >= 0.6 || effectScore >= 0.6) {
    if (terpeneScore >= 0.6 && effectScore >= 0.6) {
      confidenceGains.push("terpene and effect profile alignment");
    } else if (terpeneScore >= 0.6) {
      confidenceGains.push("terpene profile alignment");
    }
  }
  
  // Combine confidence gains
  if (confidenceGains.length > 0) {
    if (confidenceGains.length === 1) {
      parts.push(`and ${confidenceGains[0]}`);
    } else if (confidenceGains.length === 2) {
      parts.push(`and ${confidenceGains[0]} and ${confidenceGains[1]}`);
    } else {
      const last = confidenceGains.pop();
      parts.push(`and ${confidenceGains.join(", ")}, and ${last}`);
    }
  }
  
  // Where uncertainty exists
  const uncertainties: string[] = [];
  
  // Single image uncertainty
  if (imageCount === 1) {
    uncertainties.push("single image analysis limits cross-validation");
  }
  
  // Low cross-image agreement
  if (imageCount > 1 && agreement < 0.6) {
    uncertainties.push("some variation detected across images");
  }
  
  // Contradictions
  const contradiction = contradictionScore ?? 
                        ("contradictionScore" in finalDecision ? finalDecision.contradictionScore : undefined) ?? 
                        0;
  if (contradiction > 0.3) {
    if (contradiction > 0.6) {
      uncertainties.push("multiple conflicting signals detected");
    } else {
      uncertainties.push("some conflicting signals present");
    }
  }
  
  // Low confidence overall
  if (confidence < 70) {
    uncertainties.push("limited evidence reduces certainty");
  }
  
  // Signal conflicts
  if ("signalConflicts" in finalDecision && finalDecision.signalConflicts?.hasConflicts) {
    const conflictTypes = finalDecision.signalConflicts.conflictTypes;
    if (conflictTypes.includes("visual_genetic")) {
      uncertainties.push("visual traits and genetic data show some inconsistency");
    }
    if (conflictTypes.includes("terpene_effect")) {
      uncertainties.push("terpene and effect profiles show some variation");
    }
  }
  
  // Build final explanation
  let explanation = parts.join(" ");
  
  if (uncertainties.length > 0) {
    if (uncertainties.length === 1) {
      explanation += `. Confidence is reduced because ${uncertainties[0]}`;
    } else {
      explanation += `. Some uncertainty exists: ${uncertainties.join("; ")}`;
    }
  } else if (confidence >= 85) {
    explanation += `. Multiple signals align strongly, supporting high confidence`;
  } else {
    explanation += `. Overall match quality supports this identification`;
  }
  
  return explanation;
}

/**
 * Legacy function for multi-image info generation (used in runMultiScan.ts)
 * Returns object with imageCountText, confidenceRange, and improvementExplanation for viewModel
 */
export function generateConfidenceExplanation(
  imageCount: number,
  consensusResult?: ConsensusResult,
  imageResults?: ImageResult[]
): { 
  imageCountText: string;
  confidenceRange: string;
  improvementExplanation: string;
} {
  const imageCountText = imageCount === 1 
    ? "Based on 1 image" 
    : `Based on ${imageCount} images`;
  
  // Estimate confidence range based on image count
  let confidenceRange = "70–85%";
  if (imageCount >= 3) {
    confidenceRange = "85–95%";
  } else if (imageCount === 2) {
    confidenceRange = "80–90%";
  }
  
  let improvementExplanation = "";
  if (imageCount === 1) {
    improvementExplanation = "Additional images from different angles would improve confidence";
  } else if (imageCount === 2) {
    improvementExplanation = "Multiple images provide cross-validation";
  } else {
    improvementExplanation = "Multiple images show consistent identification";
  }
  
  return {
    imageCountText,
    confidenceRange,
    improvementExplanation,
  };
}
