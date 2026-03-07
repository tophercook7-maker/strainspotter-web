// lib/scanner/freeTierDepth.ts
// Phase 3.3 — Free Tier Depth (World-Class, No Paywall Pain)

import type { ScannerViewModel } from "./viewModel";
import type { ExtendedStrainProfile } from "./extendedProfile";

/**
 * Phase 3.3 Part A — Depth Floor (Free)
 * Ensure every free scan returns all 8 required sections
 */
export type FreeTierDepthCheck = {
  hasPrimaryStrainName: boolean;
  hasConfidenceScore: boolean;
  hasGeneticClassification: boolean;
  hasVisualMorphologySummary: boolean;
  hasTerpeneFamily: boolean;
  hasPrimaryEffects: boolean;
  hasCommonUseCases: boolean;
  hasVariabilityDisclaimer: boolean;
  isComplete: boolean;
  missingSections: string[];
};

/**
 * Phase 3.3 Part A — Verify free tier depth requirements
 */
export function verifyFreeTierDepth(viewModel: ScannerViewModel): FreeTierDepthCheck {
  const missing: string[] = [];

  // 1. Primary strain name
  const hasPrimaryStrainName = !!(viewModel.name && viewModel.name !== "Unknown");
  if (!hasPrimaryStrainName) missing.push("Primary strain name");

  // 2. Confidence score (honest, capped)
  const hasConfidenceScore = !!(viewModel.confidenceRange && 
    viewModel.confidenceRange.min >= 60 && 
    viewModel.confidenceRange.max <= 99);
  if (!hasConfidenceScore) missing.push("Confidence score");

  // 3. Genetic classification (Indica / Sativa / Hybrid)
  const hasGeneticClassification = !!(viewModel.genetics?.dominance && 
    viewModel.genetics.dominance !== "Unknown");
  if (!hasGeneticClassification) missing.push("Genetic classification");

  // 4. Visual morphology summary (bud structure, color, trichomes) — minimum 2-3 sentences
  const morphologyText = [
    viewModel.flowerStructureAnalysis,
    viewModel.trichomeDensityMaturity,
    viewModel.colorPistilIndicators,
    viewModel.visualMatchSummary,
  ].filter(Boolean).join(" ");
  const hasVisualMorphologySummary = morphologyText.split(/[.!?]/).filter(s => s.trim().length > 10).length >= 2;
  if (!hasVisualMorphologySummary) missing.push("Visual morphology summary (2-3 sentences minimum)");

  // 5. Expected terpene family (top 3, inferred)
  const hasTerpeneFamily = !!(viewModel.terpeneGuess && viewModel.terpeneGuess.length >= 1);
  if (!hasTerpeneFamily) missing.push("Terpene family (top 3)");

  // 6. Primary effects (mental + physical)
  const hasPrimaryEffects = !!(viewModel.effectsLong && viewModel.effectsLong.length >= 2);
  if (!hasPrimaryEffects) missing.push("Primary effects (mental + physical)");

  // 7. Common use cases
  const hasCommonUseCases = !!(viewModel.experience?.bestFor && viewModel.experience.bestFor.length >= 1) ||
    !!(viewModel.extendedProfile?.commonUseCases && viewModel.extendedProfile.commonUseCases.length >= 1);
  if (!hasCommonUseCases) missing.push("Common use cases");

  // 8. Variability disclaimer (phenotype / grow conditions)
  const hasVariabilityDisclaimer = !!(viewModel.disclaimer && viewModel.disclaimer.length > 20) ||
    !!(viewModel.uncertaintyExplanation && viewModel.uncertaintyExplanation.length > 20);
  if (!hasVariabilityDisclaimer) missing.push("Variability disclaimer");

  return {
    hasPrimaryStrainName,
    hasConfidenceScore,
    hasGeneticClassification,
    hasVisualMorphologySummary,
    hasTerpeneFamily,
    hasPrimaryEffects,
    hasCommonUseCases,
    hasVariabilityDisclaimer,
    isComplete: missing.length === 0,
    missingSections: missing,
  };
}

/**
 * Phase 3.3 Part B — Language Quality Rules
 * Ensure educational, specific, non-repetitive content
 */
export function enhanceLanguageQuality(text: string): string {
  let enhanced = text;

  // Remove excessive hedging ("may", "might", "could" stacking)
  const hedgePatterns = [
    /\b(may|might|could)\s+(may|might|could)\s+(may|might|could)/gi,
    /\b(may|might|could)\s+(may|might|could)/gi,
  ];
  for (const pattern of hedgePatterns) {
    enhanced = enhanced.replace(pattern, (match) => {
      // Keep only the first hedge word
      const words = match.split(/\s+/);
      return words[0];
    });
  }

  // Replace vague terms with specific ones
  const vagueToSpecific: Record<string, string> = {
    "generally": "typically",
    "usually": "typically",
    "often": "commonly",
    "sometimes": "in some cases",
    "various": "multiple",
    "several": "multiple",
    "many": "numerous",
  };

  for (const [vague, specific] of Object.entries(vagueToSpecific)) {
    const regex = new RegExp(`\\b${vague}\\b`, "gi");
    enhanced = enhanced.replace(regex, specific);
  }

  // Ensure sentences are complete (not fragments)
  const sentences = enhanced.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const completeSentences = sentences.map(s => {
    const trimmed = s.trim();
    if (trimmed.length < 10) return trimmed; // Too short to worry about
    // Ensure it doesn't start with lowercase (unless it's a continuation)
    if (trimmed[0] === trimmed[0].toLowerCase() && !trimmed.match(/^(and|but|or|so|because|while|when|if|although|however|thus|therefore)/i)) {
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }
    return trimmed;
  });

  return completeSentences.join(". ") + (enhanced.trim().endsWith(".") ? "" : ".");
}

/**
 * Phase 3.3 Part C — Structured Depth
 * Ensure layered explanation: What it is → Why it looks like this → How people experience it
 */
export function ensureStructuredDepth(
  viewModel: ScannerViewModel,
  extendedProfile?: ExtendedStrainProfile
): {
  whatItIs: string;
  whyItLooksLikeThis: string;
  howPeopleExperienceIt: string;
} {
  const name = viewModel.name || "This cultivar";

  // What it is
  const whatItIs = extendedProfile?.genetics?.breederNotes?.[0] ||
    `${name} is a ${viewModel.genetics?.dominance?.toLowerCase() || "hybrid"} cultivar${viewModel.genetics?.lineage ? ` resulting from ${viewModel.genetics.lineage}` : ""}. This strain is recognized for its distinctive visual characteristics and documented growth patterns.`;

  // Why it looks like this
  const whyItLooksLikeThis = viewModel.visualMatchSummary ||
    viewModel.flowerStructureAnalysis ||
    `The visual appearance of ${name} reflects its genetic heritage and typical phenotype expression. The observed morphology, including bud structure, trichome distribution, and coloration, aligns with documented characteristics for this cultivar type.`;

  // How people typically experience it
  const primaryEffects = viewModel.effectsLong?.slice(0, 3) || viewModel.experience?.effects?.slice(0, 3) || [];
  const howPeopleExperienceIt = primaryEffects.length > 0
    ? `Users commonly report ${primaryEffects.map(e => e.toLowerCase().replace(/^commonly reported for similar cultivars:\s*/i, "")).join(", ")} when consuming cultivars with similar visual and genetic profiles. The terpene composition and cannabinoid profile typically associated with ${name} contribute to these reported effects.`
    : `Based on the genetic classification and visual characteristics, ${name} typically produces effects aligned with ${viewModel.genetics?.dominance?.toLowerCase() || "hybrid"} cultivars. The specific experience can vary based on individual physiology and growing conditions.`;

  return {
    whatItIs,
    whyItLooksLikeThis,
    howPeopleExperienceIt,
  };
}

/**
 * Phase 3.3 Part E — Consistency Guard
 * Ensure same image = same result, different images = explainable variance
 */
export function checkConsistency(
  currentResult: ScannerViewModel,
  previousResult?: ScannerViewModel,
  imageCount: number = 1
): {
  isConsistent: boolean;
  consistencyIssues: string[];
  varianceExplanation?: string;
} {
  const issues: string[] = [];

  if (!previousResult) {
    return {
      isConsistent: true,
      consistencyIssues: [],
      varianceExplanation: undefined,
    };
  }

  // Check if strain name changed without explanation
  if (currentResult.name !== previousResult.name) {
    if (imageCount === 1) {
      issues.push("Strain name changed between scans of the same image");
    } else {
      // Different images - variance is expected, but should be explained
      const varianceExplanation = `Different images resulted in different primary matches. This variance is expected when analyzing multiple perspectives, as each image may emphasize different visual traits.`;
      return {
        isConsistent: false,
        consistencyIssues: [],
        varianceExplanation,
      };
    }
  }

  // Check for contradictory information
  const currentDominance = currentResult.genetics?.dominance;
  const previousDominance = previousResult.genetics?.dominance;
  if (currentDominance && previousDominance && currentDominance !== previousDominance) {
    if (imageCount === 1) {
      issues.push(`Genetic classification changed from ${previousDominance} to ${currentDominance} for the same image`);
    }
  }

  // Check confidence doesn't jump dramatically without reason
  const currentConf = currentResult.confidenceRange?.max || currentResult.confidence || 0;
  const previousConf = previousResult.confidenceRange?.max || previousResult.confidence || 0;
  if (Math.abs(currentConf - previousConf) > 30 && imageCount === 1) {
    issues.push(`Confidence changed dramatically from ${previousConf}% to ${currentConf}% for the same image`);
  }

  return {
    isConsistent: issues.length === 0,
    consistencyIssues: issues,
    varianceExplanation: imageCount > 1
      ? "Multiple images analyzed, variance in results is expected and explained by different viewing angles and trait emphasis."
      : undefined,
  };
}
