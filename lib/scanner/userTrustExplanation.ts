// Phase 5.1 — User Trust & Explanation Layer
// lib/scanner/userTrustExplanation.ts

import type { FinalDecision } from "./finalDecisionEngine";
import type { CandidateMatch } from "./topKCandidateSelection";
import type { ObservedFingerprint } from "./observedFingerprint";
import type { ImageResult } from "./types";

/**
 * Phase 5.1 — Trust Explanation Result
 * 
 * Comprehensive explanation that builds user trust by:
 * - Showing the evidence chain
 * - Acknowledging uncertainty honestly
 * - Educating about the process
 * - Making the system feel authoritative but not overconfident
 */
export type TrustExplanation = {
  // Primary trust message (1-2 sentences)
  primaryTrustMessage: string;
  
  // Evidence chain (how we reached this conclusion)
  evidenceChain: Array<{
    source: string; // e.g., "Visual Analysis", "Database Match", "Multi-Image Consensus"
    strength: "strong" | "moderate" | "weak";
    contribution: string; // What this source contributed
  }>;
  
  // Uncertainty acknowledgment (honest about limitations)
  uncertaintyAcknowledgment?: {
    hasUncertainty: boolean;
    reasons: string[]; // Why there's uncertainty
    howToImprove: string[]; // How user can improve confidence
  };
  
  // Educational content (teaches users about the process)
  educationalContent: {
    howItWorks: string; // Brief explanation of the matching process
    whatWeCompare: string[]; // What features/characteristics we compare
    whyThisMatters: string; // Why this identification is useful
  };
  
  // Authority indicators (builds credibility)
  authorityIndicators: {
    databaseSize: string; // e.g., "35,000+ documented cultivars"
    analysisDepth: string; // e.g., "Multi-dimensional fingerprint matching"
    evidenceSources: string[]; // e.g., ["Visual morphology", "Genetic lineage", "Terpene profile"]
  };
};

/**
 * Phase 5.1.1 — Generate Trust Explanation
 * 
 * Creates a comprehensive trust-building explanation from final decision data.
 */
export function generateTrustExplanation(
  finalDecision: FinalDecision,
  primaryCandidate: CandidateMatch,
  observed: ObservedFingerprint,
  imageResults?: ImageResult[],
  imageCount: number = 1
): TrustExplanation {
  const imageCountText = imageCount === 1 ? "1 image" : `${imageCount} images`;
  
  // Primary trust message
  const primaryTrustMessage = generatePrimaryTrustMessage(
    finalDecision,
    primaryCandidate,
    imageCount
  );
  
  // Evidence chain
  const evidenceChain = buildEvidenceChain(
    finalDecision,
    primaryCandidate,
    observed,
    imageResults,
    imageCount
  );
  
  // Uncertainty acknowledgment
  const uncertaintyAcknowledgment = buildUncertaintyAcknowledgment(
    finalDecision,
    primaryCandidate,
    imageCount
  );
  
  // Educational content
  const educationalContent = buildEducationalContent(imageCount);
  
  // Authority indicators
  const authorityIndicators = buildAuthorityIndicators(imageCount);
  
  return {
    primaryTrustMessage,
    evidenceChain,
    uncertaintyAcknowledgment,
    educationalContent,
    authorityIndicators,
  };
}

/**
 * Phase 5.1.1.1 — Generate Primary Trust Message
 */
function generatePrimaryTrustMessage(
  finalDecision: FinalDecision,
  primaryCandidate: CandidateMatch,
  imageCount: number
): string {
  const confidence = finalDecision.confidence;
  const strainName = finalDecision.primaryStrainName;
  
  if (confidence >= 90) {
    return `This identification is highly confident based on strong alignment across multiple evidence sources. ${strainName} matches your images with ${confidence}% confidence.`;
  } else if (confidence >= 80) {
    return `This identification is confident based on good alignment between your images and known cultivar characteristics. ${strainName} is the best match with ${confidence}% confidence.`;
  } else if (confidence >= 70) {
    return `This identification is likely correct based on visual and genetic analysis. ${strainName} appears to be the closest match with ${confidence}% confidence.`;
  } else {
    return `This identification represents the best available match based on available evidence. ${strainName} is the closest known cultivar with ${confidence}% confidence.`;
  }
}

/**
 * Phase 5.1.1.2 — Build Evidence Chain
 */
function buildEvidenceChain(
  finalDecision: FinalDecision,
  primaryCandidate: CandidateMatch,
  observed: ObservedFingerprint,
  imageResults?: ImageResult[],
  imageCount: number = 1
): Array<{
  source: string;
  strength: "strong" | "moderate" | "weak";
  contribution: string;
}> {
  const chain: Array<{
    source: string;
    strength: "strong" | "moderate" | "weak";
    contribution: string;
  }> = [];
  
  // 1. Database Match
  const dbStrength = primaryCandidate.channelScores.genetics;
  if (dbStrength > 0.3) {
    chain.push({
      source: "Database Match",
      strength: dbStrength >= 0.7 ? "strong" : dbStrength >= 0.5 ? "moderate" : "weak",
      contribution: dbStrength >= 0.7
        ? "Exact or close match found in 35,000+ strain database"
        : "Similar genetics found in database",
    });
  }
  
  // 2. Visual Analysis
  const visualStrength = primaryCandidate.channelScores.visual;
  if (visualStrength > 0.3) {
    chain.push({
      source: "Visual Analysis",
      strength: visualStrength >= 0.7 ? "strong" : visualStrength >= 0.5 ? "moderate" : "weak",
      contribution: visualStrength >= 0.7
        ? "Bud structure, trichome density, and coloration closely match"
        : "Visual characteristics show some alignment",
    });
  }
  
  // 3. Multi-Image Consensus
  if (imageCount > 1) {
    const agreement = finalDecision.crossImageAgreement;
    chain.push({
      source: "Multi-Image Consensus",
      strength: agreement >= 0.8 ? "strong" : agreement >= 0.6 ? "moderate" : "weak",
      contribution: agreement >= 0.8
        ? `${imageCount} images consistently identified this strain`
        : `${imageCount} images show general agreement`,
    });
  }
  
  // 4. Terpene Profile (if available)
  const terpeneStrength = primaryCandidate.channelScores.terpenes;
  if (terpeneStrength > 0.3 && observed.inferredTerpeneVector.likely.length > 0) {
    chain.push({
      source: "Terpene Profile",
      strength: terpeneStrength >= 0.7 ? "strong" : terpeneStrength >= 0.5 ? "moderate" : "weak",
      contribution: terpeneStrength >= 0.7
        ? "Terpene profile aligns with expected characteristics"
        : "Terpene profile shows some alignment",
    });
  }
  
  // 5. Effect Profile (if available)
  const effectStrength = primaryCandidate.channelScores.effects;
  if (effectStrength > 0.3 && observed.inferredEffectVector.likely.length > 0) {
    chain.push({
      source: "Effect Profile",
      strength: effectStrength >= 0.7 ? "strong" : effectStrength >= 0.5 ? "moderate" : "weak",
      contribution: effectStrength >= 0.7
        ? "Expected effects align with strain characteristics"
        : "Effect profile shows some alignment",
    });
  }
  
  // 6. Fingerprint Separation
  if (finalDecision.fingerprintScore > 0.8) {
    chain.push({
      source: "Fingerprint Match",
      strength: "strong",
      contribution: "Multi-dimensional fingerprint matching shows clear winner",
    });
  }
  
  return chain;
}

/**
 * Phase 5.1.1.3 — Build Uncertainty Acknowledgment
 */
function buildUncertaintyAcknowledgment(
  finalDecision: FinalDecision,
  primaryCandidate: CandidateMatch,
  imageCount: number
): TrustExplanation["uncertaintyAcknowledgment"] {
  const hasUncertainty = 
    finalDecision.confidence < 85 ||
    finalDecision.signalConflicts?.hasConflicts ||
    finalDecision.contradictionScore > 0.3 ||
    imageCount === 1;
  
  if (!hasUncertainty) {
    return undefined; // No uncertainty to acknowledge
  }
  
  const reasons: string[] = [];
  const howToImprove: string[] = [];
  
  // Low confidence
  if (finalDecision.confidence < 85) {
    reasons.push(`Confidence is ${finalDecision.confidence}% — indicating some uncertainty in the identification`);
  }
  
  // Signal conflicts
  if (finalDecision.signalConflicts?.hasConflicts) {
    reasons.push("Some signals conflict — different evidence sources suggest slightly different characteristics");
    if (finalDecision.signalConflicts.uncertaintyExplanation.length > 0) {
      reasons.push(...finalDecision.signalConflicts.uncertaintyExplanation.slice(0, 2));
    }
  }
  
  // Single image
  if (imageCount === 1) {
    reasons.push("Single image analysis — limited perspective reduces certainty");
    howToImprove.push("Add 1-2 more images from different angles (top view, side profile, close-up)");
  }
  
  // High contradiction
  if (finalDecision.contradictionScore > 0.3) {
    reasons.push("Some contradictions detected between visual traits and expected characteristics");
  }
  
  // Default improvement suggestions
  if (howToImprove.length === 0) {
    howToImprove.push("Add images from different angles to improve confidence");
    howToImprove.push("Ensure good lighting and focus in photos");
    howToImprove.push("Include both close-up and wider shots of the plant");
  }
  
  return {
    hasUncertainty: true,
    reasons,
    howToImprove,
  };
}

/**
 * Phase 5.1.1.4 — Build Educational Content
 */
function buildEducationalContent(imageCount: number): TrustExplanation["educationalContent"] {
  return {
    howItWorks: `We analyze your ${imageCount === 1 ? "image" : "images"} by comparing visual characteristics, genetic lineage, and known cultivar traits against a comprehensive database. The system uses multi-dimensional fingerprint matching to identify the closest match.`,
    
    whatWeCompare: [
      "Bud structure and density",
      "Trichome coverage and maturity",
      "Leaf shape and morphology",
      "Color profile and pistil characteristics",
      "Genetic lineage and parent strains",
      "Terpene profile (when detectable)",
      "Expected effects and characteristics",
    ],
    
    whyThisMatters: "Accurate strain identification helps you understand expected effects, growth characteristics, and cultivation requirements. This analysis is based on visual and genetic comparison — not lab testing.",
  };
}

/**
 * Phase 5.1.1.5 — Build Authority Indicators
 */
function buildAuthorityIndicators(imageCount: number): TrustExplanation["authorityIndicators"] {
  return {
    databaseSize: "35,000+ documented cultivars",
    analysisDepth: imageCount > 1
      ? "Multi-dimensional fingerprint matching across multiple images"
      : "Multi-dimensional fingerprint matching",
    evidenceSources: [
      "Visual morphology analysis",
      "Genetic lineage comparison",
      "Terpene profile inference",
      "Effect profile prediction",
      imageCount > 1 ? "Cross-image consensus" : "Single-image analysis",
    ],
  };
}
