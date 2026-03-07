// Phase 4.9 — Visual Similarity Index (bud/leaf scoring)
// lib/scanner/visualSimilarityIndex.ts

import type { FusedFeatures } from "./multiImageFusion";
import type { CultivarReference } from "./cultivarLibrary";
import { getStrainVisualBaseline, checkBaselineMatch, type VisualBaselineRange } from "./strainVisualBaselines";

/**
 * Phase 4.9 — Visual Similarity Index Result
 * Provides a 0-100 score comparing observed visual features to database strain profile
 */
export type VisualSimilarityIndexResult = {
  overallScore: number; // 0-100, overall visual similarity
  budScore: number; // 0-100, bud structure similarity
  leafScore: number; // 0-100, leaf shape similarity
  trichomeScore: number; // 0-100, trichome density similarity
  pistilScore: number; // 0-100, pistil color similarity
  breakdown: {
    budStructure: {
      observed: "low" | "medium" | "high";
      expected: "low" | "medium" | "high" | "unknown";
      match: boolean;
      score: number;
      explanation: string;
    };
    leafShape: {
      observed: "narrow" | "broad";
      expected: "narrow" | "broad" | "unknown";
      match: boolean;
      score: number;
      explanation: string;
    };
    trichomeDensity: {
      observed: "low" | "medium" | "high";
      expected: "low" | "medium" | "high" | "unknown";
      match: boolean;
      score: number;
      explanation: string;
    };
    pistilColor: {
      observed: string;
      expected: string | "unknown";
      match: boolean;
      score: number;
      explanation: string;
    };
  };
  explanation: string[]; // Human-readable explanation of similarity
};

/**
 * Phase 4.9 — Calculate Visual Similarity Index
 * 
 * Compares observed visual features (from images) to expected features (from database)
 * Returns a comprehensive similarity score (0-100) with detailed breakdown
 * 
 * Scoring weights:
 * - Bud structure: 35% (most distinctive visual trait)
 * - Leaf shape: 25% (genetic indicator)
 * - Trichome density: 25% (quality/ripeness indicator)
 * - Pistil color: 15% (supporting trait)
 */
export function calculateVisualSimilarityIndex(
  observedFeatures: FusedFeatures,
  strainProfile: CultivarReference
): VisualSimilarityIndexResult {
  // Extract expected features from database strain profile
  const visualProfile = strainProfile.visualProfile || {
    budStructure: strainProfile.morphology?.budDensity || "medium",
    trichomeDensity: strainProfile.morphology?.trichomeDensity || "medium",
    leafShape: strainProfile.morphology?.leafShape || "broad",
    pistilColor: strainProfile.morphology?.pistilColor || ["orange"],
    colorProfile: "",
  };

  // Phase 4.9.1 — Bud Structure Similarity (35% weight)
  const budBreakdown = scoreBudStructure(
    observedFeatures.budStructure,
    visualProfile.budStructure as "low" | "medium" | "high" | undefined
  );

  // Phase 4.9.2 — Leaf Shape Similarity (25% weight)
  const leafBreakdown = scoreLeafShape(
    observedFeatures.leafShape,
    visualProfile.leafShape as "narrow" | "broad" | undefined,
    strainProfile.type || strainProfile.dominantType
  );

  // Phase 4.9.3 — Trichome Density Similarity (25% weight)
  const trichomeBreakdown = scoreTrichomeDensity(
    observedFeatures.trichomeDensity,
    visualProfile.trichomeDensity as "low" | "medium" | "high" | undefined
  );

  // Phase 4.9.4 — Pistil Color Similarity (15% weight)
  const pistilBreakdown = scorePistilColor(
    observedFeatures.pistilColor,
    Array.isArray(visualProfile.pistilColor) 
      ? visualProfile.pistilColor[0] 
      : (visualProfile.pistilColor as string | undefined)
  );

  // Phase 4.9.2 — Get strain visual baseline for comparison
  const visualBaseline = getStrainVisualBaseline(strainProfile);
  
  // Calculate weighted overall score
  let overallScore = Math.round(
    budBreakdown.score * 0.35 +
    leafBreakdown.score * 0.25 +
    trichomeBreakdown.score * 0.25 +
    pistilBreakdown.score * 0.15
  );
  
  // Phase 4.9.2 — Adjust score based on baseline match (if baseline confidence is high)
  if (visualBaseline.baselineConfidence >= 70) {
    // Use baseline to refine score (blend 80% original, 20% baseline match)
    // This allows variance bands while still rewarding baseline alignment
    const baselineWeight = 0.2;
    const originalWeight = 0.8;
    
    // Note: For now, we use the existing breakdown scores
    // Future enhancement: Use detailed visual signatures for baseline matching
    overallScore = Math.round(
      overallScore * originalWeight +
      overallScore * baselineWeight // Simplified - baseline match would refine this
    );
  }

  // Build explanation
  const explanation: string[] = [];
  
  if (overallScore >= 85) {
    explanation.push("Strong visual alignment with expected strain characteristics");
  } else if (overallScore >= 70) {
    explanation.push("Good visual alignment with expected strain characteristics");
  } else if (overallScore >= 55) {
    explanation.push("Moderate visual alignment — some traits differ from expected");
  } else {
    explanation.push("Limited visual alignment — significant differences from expected profile");
  }

  // Add specific trait explanations
  if (budBreakdown.match) {
    explanation.push(`Bud structure matches expected: ${budBreakdown.observed}`);
  } else {
    explanation.push(`Bud structure differs: observed ${budBreakdown.observed}, expected ${budBreakdown.expected}`);
  }

  if (leafBreakdown.match) {
    explanation.push(`Leaf shape matches expected: ${leafBreakdown.observed}`);
  } else {
    explanation.push(`Leaf shape differs: observed ${leafBreakdown.observed}, expected ${leafBreakdown.expected}`);
  }

  if (trichomeBreakdown.match) {
    explanation.push(`Trichome density matches expected: ${trichomeBreakdown.observed}`);
  } else {
    explanation.push(`Trichome density differs: observed ${trichomeBreakdown.observed}, expected ${trichomeBreakdown.expected}`);
  }

  return {
    overallScore,
    budScore: budBreakdown.score,
    leafScore: leafBreakdown.score,
    trichomeScore: trichomeBreakdown.score,
    pistilScore: pistilBreakdown.score,
    breakdown: {
      budStructure: budBreakdown,
      leafShape: leafBreakdown,
      trichomeDensity: trichomeBreakdown,
      pistilColor: pistilBreakdown,
    },
    explanation,
  };
}

/**
 * Phase 4.9.1 — Score Bud Structure Similarity
 * 
 * Bud structure is the most distinctive visual trait:
 * - Exact match: 100 points
 * - Adjacent match (high↔medium, medium↔low): 60 points
 * - Opposite (high↔low): 20 points
 * - Unknown expected: 50 points (neutral)
 */
function scoreBudStructure(
  observed: "low" | "medium" | "high",
  expected: "low" | "medium" | "high" | undefined
): {
  observed: "low" | "medium" | "high";
  expected: "low" | "medium" | "high" | "unknown";
  match: boolean;
  score: number;
  explanation: string;
} {
  if (!expected) {
    return {
      observed,
      expected: "unknown",
      match: false,
      score: 50,
      explanation: "Bud structure data not available in database",
    };
  }

  if (observed === expected) {
    return {
      observed,
      expected,
      match: true,
      score: 100,
      explanation: `Perfect match: ${observed} bud structure`,
    };
  }

  // Adjacent matches (high↔medium, medium↔low)
  const isAdjacent = 
    (observed === "high" && expected === "medium") ||
    (observed === "medium" && expected === "high") ||
    (observed === "medium" && expected === "low") ||
    (observed === "low" && expected === "medium");

  if (isAdjacent) {
    return {
      observed,
      expected,
      match: false,
      score: 60,
      explanation: `Partial match: ${observed} vs ${expected} (adjacent on density scale)`,
    };
  }

  // Opposite (high↔low)
  return {
    observed,
    expected,
    match: false,
    score: 20,
    explanation: `Mismatch: ${observed} vs ${expected} (opposite ends of density scale)`,
  };
}

/**
 * Phase 4.9.2 — Score Leaf Shape Similarity
 * 
 * Leaf shape is a genetic indicator:
 * - Exact match: 100 points
 * - Mismatch but aligns with genetics: 50 points (e.g., broad leaf with Indica genetics)
 * - Complete mismatch: 20 points
 * - Unknown expected: 50 points (neutral)
 */
function scoreLeafShape(
  observed: "narrow" | "broad",
  expected: "narrow" | "broad" | undefined,
  strainType?: string
): {
  observed: "narrow" | "broad";
  expected: "narrow" | "broad" | "unknown";
  match: boolean;
  score: number;
  explanation: string;
} {
  if (!expected) {
    // If no expected leaf shape, check if observed aligns with genetics
    if (strainType) {
      const typeLower = strainType.toLowerCase();
      const alignsWithGenetics = 
        (observed === "broad" && (typeLower.includes("indica") || typeLower.includes("hybrid"))) ||
        (observed === "narrow" && (typeLower.includes("sativa") || typeLower.includes("hybrid")));
      
      if (alignsWithGenetics) {
        return {
          observed,
          expected: "unknown",
          match: false,
          score: 50,
          explanation: `Leaf shape aligns with ${strainType} genetics`,
        };
      }
    }
    
    return {
      observed,
      expected: "unknown",
      match: false,
      score: 50,
      explanation: "Leaf shape data not available in database",
    };
  }

  if (observed === expected) {
    return {
      observed,
      expected,
      match: true,
      score: 100,
      explanation: `Perfect match: ${observed} leaf shape`,
    };
  }

  // Mismatch but check if aligns with genetics
  if (strainType) {
    const typeLower = strainType.toLowerCase();
    const alignsWithGenetics = 
      (observed === "broad" && (typeLower.includes("indica") || typeLower.includes("hybrid"))) ||
      (observed === "narrow" && (typeLower.includes("sativa") || typeLower.includes("hybrid")));
    
    if (alignsWithGenetics) {
      return {
        observed,
        expected,
        match: false,
        score: 50,
        explanation: `Mismatch but aligns with ${strainType} genetics (observed ${observed}, expected ${expected})`,
      };
    }
  }

  return {
    observed,
    expected,
    match: false,
    score: 20,
    explanation: `Mismatch: ${observed} vs ${expected} leaf shape`,
  };
}

/**
 * Phase 4.9.3 — Score Trichome Density Similarity
 * 
 * Trichome density indicates quality and ripeness:
 * - Exact match: 100 points
 * - Adjacent match (high↔medium, medium↔low): 65 points
 * - Opposite (high↔low): 25 points
 * - Unknown expected: 50 points (neutral)
 */
function scoreTrichomeDensity(
  observed: "low" | "medium" | "high",
  expected: "low" | "medium" | "high" | undefined
): {
  observed: "low" | "medium" | "high";
  expected: "low" | "medium" | "high" | "unknown";
  match: boolean;
  score: number;
  explanation: string;
} {
  if (!expected) {
    return {
      observed,
      expected: "unknown",
      match: false,
      score: 50,
      explanation: "Trichome density data not available in database",
    };
  }

  if (observed === expected) {
    return {
      observed,
      expected,
      match: true,
      score: 100,
      explanation: `Perfect match: ${observed} trichome density`,
    };
  }

  // Adjacent matches (high↔medium, medium↔low)
  const isAdjacent = 
    (observed === "high" && expected === "medium") ||
    (observed === "medium" && expected === "high") ||
    (observed === "medium" && expected === "low") ||
    (observed === "low" && expected === "medium");

  if (isAdjacent) {
    return {
      observed,
      expected,
      match: false,
      score: 65,
      explanation: `Partial match: ${observed} vs ${expected} (adjacent on density scale)`,
    };
  }

  // Opposite (high↔low)
  return {
    observed,
    expected,
    match: false,
    score: 25,
    explanation: `Mismatch: ${observed} vs ${expected} (opposite ends of density scale)`,
  };
}

/**
 * Phase 4.9.4 — Score Pistil Color Similarity
 * 
 * Pistil color is a supporting trait (less distinctive):
 * - Exact match: 100 points
 * - Similar colors (orange↔amber, white↔pink): 70 points
 * - Different colors: 30 points
 * - Unknown expected: 50 points (neutral)
 */
function scorePistilColor(
  observed: string,
  expected: string | undefined
): {
  observed: string;
  expected: string | "unknown";
  match: boolean;
  score: number;
  explanation: string;
} {
  if (!expected) {
    return {
      observed,
      expected: "unknown",
      match: false,
      score: 50,
      explanation: "Pistil color data not available in database",
    };
  }

  const observedLower = observed.toLowerCase();
  const expectedLower = expected.toLowerCase();

  if (observedLower === expectedLower) {
    return {
      observed,
      expected,
      match: true,
      score: 100,
      explanation: `Perfect match: ${observed} pistil color`,
    };
  }

  // Similar color groups
  const orangeGroup = ["orange", "amber", "rust"];
  const whiteGroup = ["white", "cream", "pale"];
  const pinkGroup = ["pink", "rose", "coral"];
  const purpleGroup = ["purple", "violet", "lavender"];

  const observedGroup = 
    orangeGroup.some(c => observedLower.includes(c)) ? "orange" :
    whiteGroup.some(c => observedLower.includes(c)) ? "white" :
    pinkGroup.some(c => observedLower.includes(c)) ? "pink" :
    purpleGroup.some(c => observedLower.includes(c)) ? "purple" :
    "other";

  const expectedGroup = 
    orangeGroup.some(c => expectedLower.includes(c)) ? "orange" :
    whiteGroup.some(c => expectedLower.includes(c)) ? "white" :
    pinkGroup.some(c => expectedLower.includes(c)) ? "pink" :
    purpleGroup.some(c => expectedLower.includes(c)) ? "purple" :
    "other";

  if (observedGroup === expectedGroup && observedGroup !== "other") {
    return {
      observed,
      expected,
      match: false,
      score: 70,
      explanation: `Similar color group: ${observed} vs ${expected} (both in ${observedGroup} group)`,
    };
  }

  return {
    observed,
    expected,
    match: false,
    score: 30,
    explanation: `Different color: ${observed} vs ${expected}`,
  };
}

/**
 * Phase 4.9 — Get Visual Similarity Boost/Penalty
 * 
 * Converts visual similarity score to a confidence adjustment:
 * - 85-100: +5% boost
 * - 70-84: +2% boost
 * - 55-69: 0% (neutral)
 * - 40-54: -3% penalty
 * - 0-39: -7% penalty
 * 
 * This adjustment should be applied to name confidence to reflect visual alignment
 */
export function getVisualSimilarityAdjustment(overallScore: number): {
  adjustment: number; // -7 to +5
  explanation: string;
} {
  if (overallScore >= 85) {
    return {
      adjustment: 5,
      explanation: "Strong visual alignment — confidence boosted",
    };
  } else if (overallScore >= 70) {
    return {
      adjustment: 2,
      explanation: "Good visual alignment — confidence slightly boosted",
    };
  } else if (overallScore >= 55) {
    return {
      adjustment: 0,
      explanation: "Moderate visual alignment — no adjustment",
    };
  } else if (overallScore >= 40) {
    return {
      adjustment: -3,
      explanation: "Limited visual alignment — confidence reduced",
    };
  } else {
    return {
      adjustment: -7,
      explanation: "Poor visual alignment — confidence significantly reduced",
    };
  }
}
