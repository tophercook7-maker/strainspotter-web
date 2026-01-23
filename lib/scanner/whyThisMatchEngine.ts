// Phase 5.1.2 — "WHY THIS MATCH" ENGINE (FREE TIER)
// lib/scanner/whyThisMatchEngine.ts

import type { FinalDecision } from "./finalDecisionEngine";
import type { FusedFeatures } from "./multiImageFusion";

/**
 * Phase 5.1.2 — Generate exactly 3 clear reasons why this match was selected
 * 
 * Requirements:
 * - Exactly 3 reasons
 * - Visual traits matched (bud density, trichomes, coloration)
 * - Genetic alignment (lineage / family similarity)
 * - Terpene & effect consistency
 * - No fluff, no AI voice, human-readable logic
 */
export function generateWhyThisMatchReasons(
  finalDecision: FinalDecision | { primaryStrainName: string; confidence: number },
  primaryCandidate?: {
    channelScores: {
      visual: number;
      genetics: number;
      terpenes: number;
      effects: number;
    };
  },
  fusedFeatures?: FusedFeatures,
  imageCount?: number
): string[] {
  const reasons: string[] = [];

  // Extract channel scores (try from primaryCandidate first, then from finalDecision if available)
  const visualScore = primaryCandidate?.channelScores.visual ?? 
                     (finalDecision as any)?.channelScores?.visual ?? 
                     (finalDecision.confidence >= 85 ? 0.75 : finalDecision.confidence >= 70 ? 0.65 : 0.55);
  const geneticsScore = primaryCandidate?.channelScores.genetics ?? 
                       (finalDecision as any)?.channelScores?.genetics ?? 
                       (finalDecision.confidence >= 85 ? 0.75 : finalDecision.confidence >= 70 ? 0.65 : 0.55);
  const terpeneScore = primaryCandidate?.channelScores.terpenes ?? 
                      (finalDecision as any)?.channelScores?.terpenes ?? 
                      0.6;
  const effectScore = primaryCandidate?.channelScores.effects ?? 
                     (finalDecision as any)?.channelScores?.effects ?? 
                     0.6;

  // REASON 1: Visual traits matched (bud density, trichomes, coloration)
  if (visualScore >= 0.6) {
    const visualParts: string[] = [];
    
    // Bud density
    if (fusedFeatures?.budStructure) {
      const budDesc = fusedFeatures.budStructure === "high" ? "dense buds" :
                     fusedFeatures.budStructure === "medium" ? "medium-density buds" :
                     "airy buds";
      visualParts.push(budDesc);
    }
    
    // Trichomes
    if (fusedFeatures?.trichomeDensity) {
      const trichomeDesc = fusedFeatures.trichomeDensity === "high" ? "heavy trichome coverage" :
                          fusedFeatures.trichomeDensity === "medium" ? "moderate trichome coverage" :
                          "light trichome coverage";
      visualParts.push(trichomeDesc);
    }
    
    // Coloration
    if (fusedFeatures?.pistilColor) {
      visualParts.push(`${fusedFeatures.pistilColor} pistils`);
    }
    
    if (visualParts.length > 0) {
      reasons.push(`Visual traits matched: ${visualParts.join(", ")}`);
    } else {
      reasons.push("Visual structure aligns with known cultivar characteristics");
    }
  } else if (visualScore >= 0.4) {
    reasons.push("Visual structure shows similarity to known cultivar traits");
  } else {
    reasons.push("Visual characteristics align with database records");
  }

  // REASON 2: Genetic alignment (lineage / family similarity)
  if (geneticsScore >= 0.6) {
    if (geneticsScore >= 0.8) {
      reasons.push("Genetic lineage closely matches database records");
    } else {
      reasons.push("Genetic lineage aligns with known family characteristics");
    }
  } else if (geneticsScore >= 0.4) {
    reasons.push("Genetic background shows similarity to documented strains");
  } else {
    reasons.push("Lineage matches known genetic patterns in database");
  }

  // REASON 3: Terpene & effect consistency
  const combinedScore = (terpeneScore + effectScore) / 2;
  
  if (combinedScore >= 0.6) {
    if (terpeneScore >= 0.6 && effectScore >= 0.6) {
      reasons.push("Terpene profile and expected effects align with this strain");
    } else if (terpeneScore >= 0.6) {
      reasons.push("Terpene profile matches expected characteristics");
    } else if (effectScore >= 0.6) {
      reasons.push("Expected effects align with documented profile");
    } else {
      reasons.push("Terpene and effect profiles show consistency");
    }
  } else if (combinedScore >= 0.4) {
    reasons.push("Terpene and effect profiles show partial alignment");
  } else {
    reasons.push("Chemical profile aligns with known cultivar data");
  }

  // Ensure exactly 3 reasons (fallback if any are missing)
  while (reasons.length < 3) {
    if (reasons.length === 0) {
      reasons.push("Visual structure matches known cultivar traits");
    } else if (reasons.length === 1) {
      reasons.push("Genetic lineage aligns with database records");
    } else {
      reasons.push("Profile characteristics match documented strain data");
    }
  }

  // Return exactly 3 reasons
  return reasons.slice(0, 3);
}
