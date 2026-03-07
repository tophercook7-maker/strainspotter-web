// Phase 5.3.3 — USER-FACING CONFIDENCE COPY
// lib/scanner/confidenceCopy.ts

/**
 * Phase 5.3.3 — User-Facing Confidence Copy
 * 
 * Replaces raw % meaning with natural language explanations.
 * 
 * Rules:
 * - No math shown (no percentages)
 * - No engine terms exposed (no technical jargon)
 * - Natural, human-readable language
 * 
 * Example: "High confidence based on visual structure and strong match to known cultivars."
 */

export type ConfidenceCopyInput = {
  confidence: number; // 0-100 (for tier determination)
  confidenceTier: "very_high" | "high" | "medium" | "low";
  imageCount: number;
  hasStrongVisualMatch?: boolean;
  hasDatabaseMatch?: boolean;
  hasMultiImageAgreement?: boolean;
  hasLineageMatch?: boolean;
};

/**
 * Phase 5.3.3 — Generate User-Facing Confidence Copy
 * 
 * Returns natural language explanation of confidence level.
 * No percentages, no technical terms.
 */
export function generateConfidenceCopy(input: ConfidenceCopyInput): string {
  const {
    confidenceTier,
    imageCount,
    hasStrongVisualMatch = true,
    hasDatabaseMatch = true,
    hasMultiImageAgreement = false,
    hasLineageMatch = false,
  } = input;
  
  // Phase 5.3.3 — Generate natural language based on tier and evidence
  if (confidenceTier === "very_high") {
    // Very High (90-99%)
    const reasons: string[] = [];
    
    if (imageCount >= 3) {
      reasons.push("multiple angles showing consistent traits");
    } else if (imageCount >= 2) {
      reasons.push("strong agreement across photos");
    }
    
    if (hasStrongVisualMatch) {
      reasons.push("clear visual structure match");
    }
    
    if (hasDatabaseMatch) {
      reasons.push("strong match to known cultivars");
    }
    
    if (hasLineageMatch) {
      reasons.push("genetic lineage alignment");
    }
    
    if (reasons.length === 0) {
      return "Very high confidence based on strong visual and database alignment.";
    }
    
    if (reasons.length === 1) {
      return `Very high confidence based on ${reasons[0]}.`;
    }
    
    if (reasons.length === 2) {
      return `Very high confidence based on ${reasons[0]} and ${reasons[1]}.`;
    }
    
    // 3+ reasons: use first two, add "and more"
    return `Very high confidence based on ${reasons[0]}, ${reasons[1]}, and strong overall alignment.`;
  }
  
  if (confidenceTier === "high") {
    // High (75-89%)
    const reasons: string[] = [];
    
    if (imageCount >= 2) {
      reasons.push("visual agreement across photos");
    } else if (imageCount === 1) {
      reasons.push("clear visual structure");
    }
    
    if (hasDatabaseMatch) {
      reasons.push("match to known cultivars");
    }
    
    if (hasStrongVisualMatch) {
      reasons.push("strong visual similarity");
    }
    
    if (reasons.length === 0) {
      return "High confidence based on visual structure and database match.";
    }
    
    if (reasons.length === 1) {
      return `High confidence based on ${reasons[0]}.`;
    }
    
    return `High confidence based on ${reasons[0]} and ${reasons[1]}.`;
  }
  
  if (confidenceTier === "medium") {
    // Moderate (60-74%)
    const reasons: string[] = [];
    
    if (imageCount === 1) {
      reasons.push("single photo analysis");
    } else if (imageCount >= 2) {
      reasons.push("some variation across photos");
    }
    
    if (hasDatabaseMatch) {
      reasons.push("partial match to known cultivars");
    } else {
      reasons.push("limited database alignment");
    }
    
    if (reasons.length === 0) {
      return "Moderate confidence based on available visual evidence.";
    }
    
    if (reasons.length === 1) {
      return `Moderate confidence based on ${reasons[0]}.`;
    }
    
    return `Moderate confidence based on ${reasons[0]} and ${reasons[1]}.`;
  }
  
  // Low (0-59%)
  const reasons: string[] = [];
  
  if (imageCount === 1) {
    reasons.push("limited visual evidence");
  } else {
    reasons.push("conflicting or unclear visual signals");
  }
  
  if (!hasDatabaseMatch) {
    reasons.push("weak database match");
  }
  
  if (reasons.length === 0) {
    return "Low confidence based on limited evidence.";
  }
  
  if (reasons.length === 1) {
    return `Low confidence based on ${reasons[0]}.`;
  }
  
  return `Low confidence based on ${reasons[0]} and ${reasons[1]}.`;
}

/**
 * Phase 5.3.3 — Get Short Confidence Copy
 * 
 * Returns a shorter, one-line version for badges/subtitles.
 */
export function getShortConfidenceCopy(input: ConfidenceCopyInput): string {
  const { confidenceTier, imageCount, hasStrongVisualMatch, hasDatabaseMatch } = input;
  
  if (confidenceTier === "very_high") {
    if (imageCount >= 3 && hasStrongVisualMatch && hasDatabaseMatch) {
      return "Strong evidence from multiple sources";
    }
    return "Very strong match to known cultivars";
  }
  
  if (confidenceTier === "high") {
    if (imageCount >= 2) {
      return "Good evidence with strong visual match";
    }
    return "Strong match based on visual structure";
  }
  
  if (confidenceTier === "medium") {
    return "Good evidence with some uncertainty";
  }
  
  return "Best available match based on limited evidence";
}
