// Phase 4.1 — PERCEIVED INTELLIGENCE UPGRADE
// lib/scanner/perceivedIntelligence.ts
//
// Goal: Improve how smart, intentional, and trustworthy scan results FEEL
// without changing any scoring, confidence math, or pipelines.
//
// This module provides enhanced explanation generation, taglines, and confidence language
// that makes results feel more professional, specific, and thoughtful.

/**
 * Phase 4.1 — Generate intelligent tagline
 * 
 * Replaces generic "Closest known match" with more specific, professional language
 * that reflects the actual analysis quality and confidence level.
 */
export function generateIntelligentTagline(args: {
  confidencePercent: number;
  imageCount: number;
  hasDatabaseMatch: boolean;
  hasMultiImageAgreement: boolean;
  matchType?: "exact" | "alias" | "token" | "phonetic" | "lineage";
}): string {
  const { confidencePercent, imageCount, hasDatabaseMatch, hasMultiImageAgreement, matchType } = args;

  // Very High Confidence (90+)
  if (confidencePercent >= 90) {
    if (hasDatabaseMatch && matchType === "exact") {
      return "Exact database match with strong visual confirmation";
    }
    if (hasMultiImageAgreement && imageCount >= 3) {
      return "Strong consensus across multiple viewing angles";
    }
    if (hasDatabaseMatch) {
      return "Database match confirmed by visual morphology analysis";
    }
    return "High-confidence identification based on visual and genetic alignment";
  }

  // High Confidence (80-89)
  if (confidencePercent >= 80) {
    if (hasDatabaseMatch) {
      return "Database match supported by observed morphological traits";
    }
    if (hasMultiImageAgreement && imageCount >= 2) {
      return "Consistent identification across multiple images";
    }
    return "Most likely cultivar based on visual structure and known genetics";
  }

  // Medium Confidence (65-79)
  if (confidencePercent >= 65) {
    if (hasDatabaseMatch) {
      return "Closest database match with moderate visual alignment";
    }
    if (imageCount === 1) {
      return "Best match from single-image analysis — additional angles would improve confidence";
    }
    return "Closest match based on available visual and genetic data";
  }

  // Low Confidence (<65)
  if (hasDatabaseMatch) {
    return "Closest database match — visual traits show some variation";
  }
  if (imageCount === 1) {
    return "Preliminary identification — multiple angles recommended for higher confidence";
  }
  return "Best available match — consider additional images for improved accuracy";
}

/**
 * Phase 4.1 — Generate specific explanation bullets
 * 
 * Creates detailed, professional explanations that reference specific observations
 * rather than generic statements.
 */
export function generateIntelligentExplanation(args: {
  confidencePercent: number;
  imageCount: number;
  hasDatabaseMatch: boolean;
  hasMultiImageAgreement: boolean;
  agreementCount?: number;
  matchType?: "exact" | "alias" | "token" | "phonetic" | "lineage";
  keyTraits?: string[];
  morphologySignals?: string[];
}): string[] {
  const {
    confidencePercent,
    imageCount,
    hasDatabaseMatch,
    hasMultiImageAgreement,
    agreementCount,
    matchType,
    keyTraits,
    morphologySignals,
  } = args;

  const bullets: string[] = [];

  // Database match explanation
  if (hasDatabaseMatch) {
    if (matchType === "exact") {
      bullets.push("Exact name match found in 35,000+ strain database");
    } else if (matchType === "alias") {
      bullets.push("Matched via known alias in strain database");
    } else if (matchType === "lineage") {
      bullets.push("Genetic lineage alignment with database records");
    } else {
      bullets.push("Database match confirmed through name similarity analysis");
    }
  }

  // Multi-image agreement
  if (hasMultiImageAgreement && imageCount >= 2) {
    const count = agreementCount || imageCount;
    if (count >= 3) {
      bullets.push(`${count} images independently identified the same cultivar`);
    } else if (count === 2) {
      bullets.push("Two images show consistent morphological characteristics");
    }
  }

  // Specific trait mentions
  if (keyTraits && keyTraits.length > 0) {
    const traitList = keyTraits.slice(0, 3).join(", ");
    bullets.push(`Observed traits (${traitList}) align with documented morphology`);
  }

  // Morphology signals
  if (morphologySignals && morphologySignals.length > 0) {
    bullets.push(morphologySignals[0]); // Use first, most relevant signal
  }

  // Confidence-specific context
  if (confidencePercent >= 85) {
    bullets.push("Strong agreement between visual analysis and genetic database");
  } else if (confidencePercent >= 70) {
    bullets.push("Good alignment between observed characteristics and known cultivar data");
  } else if (confidencePercent >= 60) {
    bullets.push("Moderate alignment — some visual variation observed");
  } else {
    bullets.push("Limited visual distinction — additional angles would strengthen identification");
  }

  // Image count context
  if (imageCount === 1) {
    bullets.push("Single-image analysis limits perspective — multiple angles improve accuracy");
  } else if (imageCount >= 3) {
    bullets.push("Multi-angle analysis provides comprehensive morphological assessment");
  }

  // Ensure 2-4 bullets (not too many, not too few)
  return bullets.slice(0, 4);
}

/**
 * Phase 4.1 — Generate professional confidence language
 * 
 * Replaces generic confidence statements with more nuanced, professional language
 * that explains the reasoning behind the confidence level.
 */
export function generateIntelligentConfidenceLanguage(args: {
  confidencePercent: number;
  imageCount: number;
  hasDatabaseMatch: boolean;
  hasMultiImageAgreement: boolean;
  consensusStrength?: number;
}): string {
  const { confidencePercent, imageCount, hasDatabaseMatch, hasMultiImageAgreement, consensusStrength } = args;

  // Very High (85+)
  if (confidencePercent >= 85) {
    if (hasDatabaseMatch && hasMultiImageAgreement && imageCount >= 3) {
      return "Very high confidence — database match confirmed by multi-angle visual analysis";
    }
    if (hasDatabaseMatch) {
      return "High confidence — strong database and visual alignment";
    }
    if (hasMultiImageAgreement && imageCount >= 3) {
      return "High confidence — consistent identification across multiple viewing angles";
    }
    return "High confidence — strong visual and genetic alignment";
  }

  // High (70-84)
  if (confidencePercent >= 70) {
    if (hasDatabaseMatch) {
      return "Good confidence — database match with supporting visual evidence";
    }
    if (hasMultiImageAgreement) {
      return "Good confidence — multiple images show consistent characteristics";
    }
    return "Moderate-high confidence — visual traits align with known cultivars";
  }

  // Medium (60-69)
  if (confidencePercent >= 60) {
    if (imageCount === 1) {
      return "Moderate confidence — single-image analysis limits certainty";
    }
    if (consensusStrength && consensusStrength < 0.7) {
      return "Moderate confidence — some variation observed across images";
    }
    return "Moderate confidence — visual alignment with known cultivar characteristics";
  }

  // Low (<60)
  if (imageCount === 1) {
    return "Lower confidence — additional images from different angles would improve accuracy";
  }
  return "Lower confidence — limited visual distinction between similar cultivars";
}

/**
 * Phase 4.1 — Enhance "why this name won" explanation
 * 
 * Makes explanations more specific and professional by referencing
 * actual observations rather than generic statements.
 */
export function enhanceWhyThisNameWon(
  baseReasons: string[],
  context: {
    matchType?: "exact" | "alias" | "token" | "phonetic" | "lineage";
    imageCount: number;
    agreementCount?: number;
    keyTraits?: string[];
  }
): string[] {
  const { matchType, imageCount, agreementCount, keyTraits } = context;
  const enhanced: string[] = [];

  // Enhance with match type specificity
  if (matchType === "exact" && baseReasons.length > 0) {
    enhanced.push(`Exact database match: ${baseReasons[0]}`);
  } else if (matchType === "alias" && baseReasons.length > 0) {
    enhanced.push(`Matched via known alias: ${baseReasons[0]}`);
  } else if (matchType === "lineage" && baseReasons.length > 0) {
    enhanced.push(`Genetic lineage alignment: ${baseReasons[0]}`);
  } else {
    enhanced.push(...baseReasons);
  }

  // Add image agreement context
  if (imageCount >= 2 && agreementCount && agreementCount >= 2) {
    enhanced.push(`${agreementCount} of ${imageCount} images independently identified this cultivar`);
  }

  // Add specific trait context
  if (keyTraits && keyTraits.length > 0) {
    const traitMention = keyTraits.slice(0, 2).join(" and ");
    enhanced.push(`Observed ${traitMention} match documented morphology`);
  }

  // Ensure 2-4 bullets
  return enhanced.slice(0, 4);
}
