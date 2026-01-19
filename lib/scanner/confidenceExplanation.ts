// lib/scanner/confidenceExplanation.ts
// Phase 3.4 Part C — User-Facing Confidence Explanation

import type { ImageResult } from "./consensusEngine";
import type { ConsensusResult } from "./consensusEngine";

/**
 * Phase 3.4 Part C — Generate user-facing confidence explanation
 * Explains WHY confidence improved with multiple images
 * 
 * Example: "Multiple angles confirmed consistent bud structure and trichome density, increasing confidence."
 */
export function generateConfidenceExplanation(
  imageCount: number,
  consensusResult: ConsensusResult | null,
  imageResults: ImageResult[]
): {
  imageCountText: string; // "Based on X images"
  confidenceRange: string; // "86–92%"
  improvementExplanation: string; // Why confidence improved
} {
  // Phase 3.4 Part C — "Based on X images"
  const imageCountText = `Based on ${imageCount} image${imageCount > 1 ? "s" : ""}`;

  // Phase 3.4 Part C — Confidence range
  let confidenceRange = "60–75%";
  if (consensusResult?.confidenceRange) {
    const { min, max } = consensusResult.confidenceRange;
    confidenceRange = `${min}–${max}%`;
  }

  // Phase 3.4 Part C — Improvement explanation
  let improvementExplanation = "";

  if (imageCount === 1) {
    improvementExplanation = "Single image analysis provides baseline identification based on visible morphological traits.";
  } else if (imageCount >= 2 && consensusResult) {
    const agreementScore = consensusResult.agreementScore || 0;
    const appearances = consensusResult.primaryMatch ? 
      imageResults.filter(r => r.candidateStrains.some(c => c.name === consensusResult.primaryMatch.name)).length 
      : 0;
    
    // Identify what traits were confirmed across images
    const confirmedTraits: string[] = [];
    
    // Check if bud structure is consistent
    const budStructures = imageResults
      .map(r => r.detectedTraits.budStructure)
      .filter(Boolean) as string[];
    if (budStructures.length >= 2 && new Set(budStructures).size === 1) {
      confirmedTraits.push("bud structure");
    }
    
    // Check if trichome density is consistent
    const trichomeDensities = imageResults
      .map(r => r.detectedTraits.trichomeDensity)
      .filter(Boolean) as string[];
    if (trichomeDensities.length >= 2 && new Set(trichomeDensities).size === 1) {
      confirmedTraits.push("trichome density");
    }
    
    // Check if color/pistils are consistent
    const pistilColors = imageResults
      .map(r => r.detectedTraits.pistilColor)
      .filter(Boolean) as string[];
    if (pistilColors.length >= 2 && new Set(pistilColors).size === 1) {
      confirmedTraits.push("pistil color");
    }
    
    // Build explanation based on agreement
    if (appearances >= 2 && agreementScore >= 70) {
      if (confirmedTraits.length >= 2) {
        improvementExplanation = `Multiple angles confirmed consistent ${confirmedTraits.join(" and ")}, increasing confidence.`;
      } else if (confirmedTraits.length === 1) {
        improvementExplanation = `Multiple angles confirmed consistent ${confirmedTraits[0]}, supporting the identification.`;
      } else {
        improvementExplanation = `${appearances} out of ${imageCount} images identified this strain, with strong visual agreement across different perspectives.`;
      }
    } else if (appearances >= 2) {
      improvementExplanation = `${appearances} out of ${imageCount} images identified this strain, though some variation was observed across angles.`;
    } else {
      improvementExplanation = `Multiple images analyzed from different angles, with visual features pointing to this cultivar despite some variation.`;
    }
    
    // Add type diversity bonus if present
    const uniqueTypes = new Set(
      imageResults.map(r => r.imageObservation?.imageType).filter(Boolean)
    );
    if (uniqueTypes.size > 1 && agreementScore >= 70) {
      const types = Array.from(uniqueTypes).join(" and ");
      improvementExplanation += ` Different image types (${types}) provided complementary perspectives, strengthening the match.`;
    }
  }

  return {
    imageCountText,
    confidenceRange,
    improvementExplanation,
  };
}
