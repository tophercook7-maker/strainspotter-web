// Phase 4.9.2 — Strain Visual Baselines
// lib/scanner/strainVisualBaselines.ts

import type { CultivarReference } from "./cultivarLibrary";

/**
 * Phase 4.9.2 — Visual Baseline Range
 * Defines expected visual characteristics with variance bands (phenotype tolerance)
 */
export type VisualBaselineRange = {
  // Bud density range (airy ↔ dense)
  densityRange: {
    min: number; // 0-100, minimum expected density
    max: number; // 0-100, maximum expected density
    typical: number; // 0-100, most common density
    tolerance: number; // ±variance allowed (phenotype tolerance)
  };
  
  // Trichome coverage range
  trichomeRange: {
    min: number; // 0-100, minimum expected trichome coverage
    max: number; // 0-100, maximum trichome coverage
    typical: number; // 0-100, most common coverage
    level: "low" | "medium" | "high"; // Expected level
  };
  
  // Color spectrum baseline
  colorBaseline: {
    primary: "lime" | "forest" | "purple" | "frost" | "mixed" | "unknown";
    secondary?: string[]; // Common secondary colors
    pistilColors: string[]; // Expected pistil colors
    colorNotes?: string; // Additional color characteristics
  };
  
  // Calyx characteristics
  calyxBaseline?: {
    typicalShape: "round" | "elongated" | "mixed" | "unknown";
    typicalSize: "small" | "medium" | "large" | "unknown";
    typicalDistribution: "tight" | "loose" | "mixed" | "unknown";
  };
  
  // Leaf-to-bud ratio (if applicable)
  leafToBudBaseline?: {
    typical: number; // 0-100, typical ratio
    range: { min: number; max: number }; // Acceptable range
  };
  
  // Confidence in baseline (0-100)
  baselineConfidence: number;
  
  // Source of baseline data
  source: "database" | "inferred" | "partial";
};

/**
 * Phase 4.9.2 — Get Visual Baseline for Strain
 * 
 * Extracts expected visual ranges from database strain profile
 * Allows variance bands for phenotype tolerance
 */
export function getStrainVisualBaseline(
  strain: CultivarReference
): VisualBaselineRange {
  const visualProfile = strain.visualProfile || {
    budStructure: strain.morphology?.budDensity || "medium",
    trichomeDensity: strain.morphology?.trichomeDensity || "medium",
    leafShape: strain.morphology?.leafShape || "broad",
    pistilColor: strain.morphology?.pistilColor || ["orange"],
    colorProfile: "",
  };
  
  // Phase 4.9.2.1 — Density Range
  const densityRange = extractDensityRange(visualProfile.budStructure);
  
  // Phase 4.9.2.2 — Trichome Range
  const trichomeRange = extractTrichomeRange(visualProfile.trichomeDensity);
  
  // Phase 4.9.2.3 — Color Baseline
  const colorBaseline = extractColorBaseline(
    visualProfile.colorProfile,
    visualProfile.pistilColor
  );
  
  // Phase 4.9.2.4 — Calyx Baseline (if available)
  const calyxBaseline = extractCalyxBaseline(visualProfile.colorProfile);
  
  // Phase 4.9.2.5 — Baseline Confidence
  const baselineConfidence = calculateBaselineConfidence(
    visualProfile,
    strain.morphology
  );
  
  // Phase 4.9.2.6 — Determine Source
  const source: "database" | "inferred" | "partial" = 
    strain.visualProfile && strain.morphology ? "database" :
    strain.visualProfile || strain.morphology ? "partial" :
    "inferred";
  
  return {
    densityRange,
    trichomeRange,
    colorBaseline,
    calyxBaseline,
    baselineConfidence,
    source,
  };
}

/**
 * Phase 4.9.2.1 — Extract Density Range
 * Maps database bud structure to density range with variance bands
 */
function extractDensityRange(
  budStructure: "low" | "medium" | "high"
): VisualBaselineRange["densityRange"] {
  switch (budStructure) {
    case "high":
      // Dense strains: 70-100, typical 85, ±15 tolerance
      return {
        min: 70,
        max: 100,
        typical: 85,
        tolerance: 15,
      };
    
    case "medium":
      // Medium density: 40-70, typical 55, ±15 tolerance
      return {
        min: 40,
        max: 70,
        typical: 55,
        tolerance: 15,
      };
    
    case "low":
      // Airy strains: 0-40, typical 25, ±15 tolerance
      return {
        min: 0,
        max: 40,
        typical: 25,
        tolerance: 15,
      };
    
    default:
      // Default: medium with wide tolerance
      return {
        min: 30,
        max: 70,
        typical: 50,
        tolerance: 20,
      };
  }
}

/**
 * Phase 4.9.2.2 — Extract Trichome Range
 * Maps database trichome density to range
 */
function extractTrichomeRange(
  trichomeDensity: "low" | "medium" | "high"
): VisualBaselineRange["trichomeRange"] {
  switch (trichomeDensity) {
    case "high":
      return {
        min: 75,
        max: 100,
        typical: 90,
        level: "high",
      };
    
    case "medium":
      return {
        min: 40,
        max: 75,
        typical: 60,
        level: "medium",
      };
    
    case "low":
      return {
        min: 0,
        max: 40,
        typical: 25,
        level: "low",
      };
    
    default:
      return {
        min: 30,
        max: 70,
        typical: 50,
        level: "medium",
      };
  }
}

/**
 * Phase 4.9.2.3 — Extract Color Baseline
 * Extracts expected colors from database profile
 */
function extractColorBaseline(
  colorProfile: string,
  pistilColors: string[]
): VisualBaselineRange["colorBaseline"] {
  const colorLower = (colorProfile || "").toLowerCase();
  
  // Detect primary color
  let primary: "lime" | "forest" | "purple" | "frost" | "mixed" | "unknown" = "unknown";
  const secondary: string[] = [];
  
  if (colorLower.includes("lime") || colorLower.includes("bright green") || colorLower.includes("light green")) {
    primary = "lime";
  } else if (colorLower.includes("forest") || colorLower.includes("deep green") || colorLower.includes("dark green") || colorLower.includes("emerald")) {
    primary = "forest";
  } else if (colorLower.includes("purple") || colorLower.includes("violet") || colorLower.includes("lavender")) {
    primary = "purple";
  } else if (colorLower.includes("frost") || colorLower.includes("white") || colorLower.includes("silver")) {
    primary = "frost";
  } else if (colorLower.includes("green")) {
    // Default green to forest if not specified
    primary = "forest";
  }
  
  // Extract additional colors as secondary
  if (colorLower.includes("orange")) secondary.push("orange");
  if (colorLower.includes("red")) secondary.push("red");
  if (colorLower.includes("blue")) secondary.push("blue");
  if (colorLower.includes("pink")) secondary.push("pink");
  if (colorLower.includes("amber")) secondary.push("amber");
  if (colorLower.includes("yellow")) secondary.push("yellow");
  
  // Normalize pistil colors
  const normalizedPistilColors = pistilColors && pistilColors.length > 0
    ? pistilColors.map(c => c.toLowerCase())
    : ["orange"]; // Default
  
  return {
    primary: primary === "unknown" && colorLower.length > 0 ? "forest" : primary,
    secondary: secondary.length > 0 ? secondary : undefined,
    pistilColors: normalizedPistilColors,
    colorNotes: colorProfile || undefined,
  };
}

/**
 * Phase 4.9.2.4 — Extract Calyx Baseline
 * Extracts calyx characteristics from color profile (if mentioned)
 */
function extractCalyxBaseline(
  colorProfile: string
): VisualBaselineRange["calyxBaseline"] | undefined {
  if (!colorProfile) return undefined;
  
  const colorLower = colorProfile.toLowerCase();
  
  // Try to infer calyx characteristics from description
  let typicalShape: "round" | "elongated" | "mixed" | "unknown" = "unknown";
  let typicalSize: "small" | "medium" | "large" | "unknown" = "unknown";
  let typicalDistribution: "tight" | "loose" | "mixed" | "unknown" = "unknown";
  
  if (colorLower.includes("round") || colorLower.includes("spherical")) {
    typicalShape = "round";
  } else if (colorLower.includes("elongated") || colorLower.includes("oblong")) {
    typicalShape = "elongated";
  }
  
  if (colorLower.includes("small calyx") || colorLower.includes("tiny")) {
    typicalSize = "small";
  } else if (colorLower.includes("large calyx") || colorLower.includes("big")) {
    typicalSize = "large";
  } else if (colorLower.includes("calyx")) {
    typicalSize = "medium";
  }
  
  if (colorLower.includes("tight") || colorLower.includes("compact") || colorLower.includes("dense")) {
    typicalDistribution = "tight";
  } else if (colorLower.includes("loose") || colorLower.includes("airy")) {
    typicalDistribution = "loose";
  }
  
  // Only return if we have at least one characteristic
  if (typicalShape !== "unknown" || typicalSize !== "unknown" || typicalDistribution !== "unknown") {
    return {
      typicalShape,
      typicalSize,
      typicalDistribution,
    };
  }
  
  return undefined;
}

/**
 * Phase 4.9.2.5 — Calculate Baseline Confidence
 * Estimates how confident we are in the baseline data
 */
function calculateBaselineConfidence(
  visualProfile: CultivarReference["visualProfile"],
  morphology?: CultivarReference["morphology"]
): number {
  let confidence = 50; // Base confidence
  
  // Increase confidence based on data availability
  if (visualProfile) {
    if (visualProfile.budStructure) confidence += 15;
    if (visualProfile.trichomeDensity) confidence += 15;
    if (visualProfile.colorProfile && visualProfile.colorProfile.length > 10) confidence += 10;
    if (visualProfile.pistilColor && visualProfile.pistilColor.length > 0) confidence += 10;
  }
  
  if (morphology) {
    if (morphology.budDensity) confidence += 5;
    if (morphology.trichomeDensity) confidence += 5;
    if (morphology.leafShape) confidence += 5;
    if (morphology.pistilColor && morphology.pistilColor.length > 0) confidence += 5;
  }
  
  return Math.min(100, confidence);
}

/**
 * Phase 4.9.2 — Check if Visual Signature Matches Baseline
 * 
 * Determines if an observed visual signature falls within expected baseline ranges
 * Returns match score (0-100) and detailed breakdown
 */
export function checkBaselineMatch(
  observedSignature: import("./visualFeatureExtraction").VisualSignature,
  baseline: VisualBaselineRange
): {
  overallMatch: number; // 0-100, overall match score
  densityMatch: number; // 0-100, density match score
  trichomeMatch: number; // 0-100, trichome match score
  colorMatch: number; // 0-100, color match score
  withinTolerance: {
    density: boolean;
    trichome: boolean;
    color: boolean;
  };
  explanation: string[];
} {
  const explanation: string[] = [];
  
  // Phase 4.9.2.6.1 — Density Match
  const densityMatch = checkDensityMatch(
    observedSignature.densityScore,
    baseline.densityRange
  );
  const densityWithinTolerance = 
    observedSignature.densityScore >= (baseline.densityRange.typical - baseline.densityRange.tolerance) &&
    observedSignature.densityScore <= (baseline.densityRange.typical + baseline.densityRange.tolerance);
  
  if (densityWithinTolerance) {
    explanation.push(`Density (${observedSignature.densityScore}) within expected range (${baseline.densityRange.min}-${baseline.densityRange.max})`);
  } else {
    explanation.push(`Density (${observedSignature.densityScore}) outside expected range (${baseline.densityRange.min}-${baseline.densityRange.max})`);
  }
  
  // Phase 4.9.2.6.2 — Trichome Match
  const trichomeMatch = checkTrichomeMatch(
    observedSignature.trichomeScore,
    baseline.trichomeRange
  );
  const trichomeWithinTolerance = 
    observedSignature.trichomeScore >= baseline.trichomeRange.min &&
    observedSignature.trichomeScore <= baseline.trichomeRange.max;
  
  if (trichomeWithinTolerance) {
    explanation.push(`Trichome coverage (${observedSignature.trichomeScore}) within expected range (${baseline.trichomeRange.min}-${baseline.trichomeRange.max})`);
  } else {
    explanation.push(`Trichome coverage (${observedSignature.trichomeScore}) outside expected range (${baseline.trichomeRange.min}-${baseline.trichomeRange.max})`);
  }
  
  // Phase 4.9.2.6.3 — Color Match
  const colorMatch = checkColorMatch(
    observedSignature.colorProfile,
    observedSignature.pistilProfile,
    baseline.colorBaseline
  );
  const colorWithinTolerance = colorMatch >= 70; // 70% threshold for color match
  
  if (colorWithinTolerance) {
    explanation.push(`Color profile matches expected baseline`);
  } else {
    explanation.push(`Color profile differs from expected baseline`);
  }
  
  // Calculate overall match (weighted average)
  const overallMatch = Math.round(
    densityMatch * 0.35 + // Density: 35% weight
    trichomeMatch * 0.35 + // Trichome: 35% weight
    colorMatch * 0.30 // Color: 30% weight
  );
  
  return {
    overallMatch,
    densityMatch,
    trichomeMatch,
    colorMatch,
    withinTolerance: {
      density: densityWithinTolerance,
      trichome: trichomeWithinTolerance,
      color: colorWithinTolerance,
    },
    explanation,
  };
}

/**
 * Phase 4.9.2.6.1 — Check Density Match
 */
function checkDensityMatch(
  observed: number,
  range: VisualBaselineRange["densityRange"]
): number {
  // Perfect match if within typical ± tolerance
  if (
    observed >= (range.typical - range.tolerance) &&
    observed <= (range.typical + range.tolerance)
  ) {
    return 100;
  }
  
  // Good match if within min-max range
  if (observed >= range.min && observed <= range.max) {
    // Calculate score based on distance from typical
    const distanceFromTypical = Math.abs(observed - range.typical);
    const maxDistance = Math.max(
      range.typical - range.min,
      range.max - range.typical
    );
    const score = 100 - (distanceFromTypical / maxDistance) * 30; // Max 30 point penalty
    return Math.max(70, Math.round(score));
  }
  
  // Partial match if close to range
  const distanceToRange = Math.min(
    Math.abs(observed - range.min),
    Math.abs(observed - range.max)
  );
  if (distanceToRange <= 20) {
    return Math.max(40, 70 - distanceToRange * 1.5);
  }
  
  // Poor match
  return Math.max(0, 40 - distanceToRange * 0.5);
}

/**
 * Phase 4.9.2.6.2 — Check Trichome Match
 */
function checkTrichomeMatch(
  observed: number,
  range: VisualBaselineRange["trichomeRange"]
): number {
  // Perfect match if within range
  if (observed >= range.min && observed <= range.max) {
    // Calculate score based on distance from typical
    const distanceFromTypical = Math.abs(observed - range.typical);
    const maxDistance = Math.max(
      range.typical - range.min,
      range.max - range.typical
    );
    if (maxDistance === 0) return 100;
    const score = 100 - (distanceFromTypical / maxDistance) * 20; // Max 20 point penalty
    return Math.max(80, Math.round(score));
  }
  
  // Partial match if close to range
  const distanceToRange = Math.min(
    Math.abs(observed - range.min),
    Math.abs(observed - range.max)
  );
  if (distanceToRange <= 15) {
    return Math.max(50, 80 - distanceToRange * 2);
  }
  
  // Poor match
  return Math.max(0, 50 - distanceToRange * 1);
}

/**
 * Phase 4.9.2.6.3 — Check Color Match
 */
function checkColorMatch(
  observedColor: import("./visualFeatureExtraction").VisualSignature["colorProfile"],
  observedPistil: import("./visualFeatureExtraction").VisualSignature["pistilProfile"],
  baseline: VisualBaselineRange["colorBaseline"]
): number {
  let score = 0;
  
  // Primary color match (50 points)
  if (observedColor.primary === baseline.primary) {
    score += 50;
  } else if (observedColor.primary === "mixed" || baseline.primary === "mixed") {
    // Mixed colors get partial credit
    score += 25;
  } else if (
    (observedColor.primary === "lime" && baseline.primary === "forest") ||
    (observedColor.primary === "forest" && baseline.primary === "lime")
  ) {
    // Similar greens get partial credit
    score += 30;
  }
  
  // Pistil color match (30 points)
  const observedPistilColors = observedPistil.colors.map(c => c.toLowerCase());
  const baselinePistilColors = baseline.pistilColors.map(c => c.toLowerCase());
  const pistilMatch = observedPistilColors.some(obs => 
    baselinePistilColors.some(base => obs.includes(base) || base.includes(obs))
  );
  if (pistilMatch) {
    score += 30;
  } else {
    // Partial credit for similar colors
    const similarColors = [
      ["orange", "amber"],
      ["white", "cream"],
      ["pink", "rose"],
    ];
    const hasSimilar = similarColors.some(([a, b]) =>
      (observedPistilColors.some(c => c.includes(a)) && baselinePistilColors.some(c => c.includes(b))) ||
      (observedPistilColors.some(c => c.includes(b)) && baselinePistilColors.some(c => c.includes(a)))
    );
    if (hasSimilar) {
      score += 15;
    }
  }
  
  // Secondary color overlap (20 points)
  if (observedColor.secondary && baseline.secondary) {
    const secondaryOverlap = observedColor.secondary.filter(obs =>
      baseline.secondary!.some(base => obs.toLowerCase().includes(base.toLowerCase()) || base.toLowerCase().includes(obs.toLowerCase()))
    ).length;
    if (secondaryOverlap > 0) {
      score += Math.min(20, secondaryOverlap * 10);
    }
  }
  
  return Math.min(100, score);
}
