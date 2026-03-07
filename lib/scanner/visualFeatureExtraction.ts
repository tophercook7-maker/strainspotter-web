// Phase 4.9.1 — Visual Feature Extraction (LOCK)
// lib/scanner/visualFeatureExtraction.ts

import type { WikiResult } from "./types";

/**
 * Phase 4.9.1 — Visual Signature
 * Detailed visual features extracted from a single image
 */
export type VisualSignature = {
  // Bud density (airy ↔ dense)
  densityScore: number; // 0-100, where 0 = very airy, 100 = very dense
  
  // Calyx shape profile
  calyxProfile: {
    shape: "round" | "elongated" | "mixed" | "unknown";
    size: "small" | "medium" | "large" | "unknown";
    distribution: "tight" | "loose" | "mixed" | "unknown";
  };
  
  // Leaf-to-bud ratio (how much leaf vs bud is visible)
  leafToBudRatio: number; // 0-100, where 0 = all bud, 100 = all leaf
  
  // Trichome coverage
  trichomeScore: number; // 0-100, normalized from low/medium/high
  trichomeLevel: "low" | "medium" | "high";
  
  // Color spectrum analysis
  colorProfile: {
    primary: "lime" | "forest" | "purple" | "frost" | "mixed" | "unknown";
    secondary?: string[];
    spectrum: string[]; // All detected colors
  };
  
  // Pistil color & distribution
  pistilProfile: {
    color: string; // Primary pistil color
    colors: string[]; // All detected pistil colors
    distribution: "sparse" | "moderate" | "dense" | "unknown";
    maturity: "immature" | "mature" | "overripe" | "unknown";
  };
  
  // Confidence in extraction (0-100)
  extractionConfidence: number;
  
  // Source data reference
  source: {
    budStructure: string; // Original budStructure text
    trichomes: string; // Original trichomes text
    coloration: string; // Original coloration text
    visualTraits?: string[]; // Additional visual traits
  };
};

/**
 * Phase 4.9.1 — Extract Visual Signature from WikiResult
 * 
 * Extracts detailed visual features from a single image's analysis result
 * Locks visual characteristics for comparison and fusion
 */
export function extractVisualSignature(
  wikiResult: WikiResult,
  imageIndex: number
): VisualSignature {
  const morphology = wikiResult.morphology;
  const budStructure = morphology.budStructure.toLowerCase();
  const trichomes = morphology.trichomes.toLowerCase();
  const coloration = morphology.coloration.toLowerCase();
  const visualTraits = morphology.visualTraits || [];
  
  // Phase 4.9.1.1 — Bud Density Score (0-100)
  const densityScore = calculateDensityScore(budStructure);
  
  // Phase 4.9.1.2 — Calyx Profile
  const calyxProfile = extractCalyxProfile(budStructure, visualTraits);
  
  // Phase 4.9.1.3 — Leaf-to-Bud Ratio
  const leafToBudRatio = calculateLeafToBudRatio(budStructure, visualTraits);
  
  // Phase 4.9.1.4 — Trichome Score & Level
  const { trichomeScore, trichomeLevel } = extractTrichomeProfile(trichomes);
  
  // Phase 4.9.1.5 — Color Spectrum
  const colorProfile = extractColorSpectrum(coloration, visualTraits);
  
  // Phase 4.9.1.6 — Pistil Profile
  const pistilProfile = extractPistilProfile(coloration, visualTraits);
  
  // Phase 4.9.1.7 — Extraction Confidence
  const extractionConfidence = calculateExtractionConfidence(
    budStructure,
    trichomes,
    coloration,
    visualTraits
  );
  
  return {
    densityScore,
    calyxProfile,
    leafToBudRatio,
    trichomeScore,
    trichomeLevel,
    colorProfile,
    pistilProfile,
    extractionConfidence,
    source: {
      budStructure: morphology.budStructure,
      trichomes: morphology.trichomes,
      coloration: morphology.coloration,
      visualTraits,
    },
  };
}

/**
 * Phase 4.9.1.1 — Calculate Bud Density Score
 * Maps text descriptions to 0-100 density score
 */
function calculateDensityScore(budStructure: string): number {
  // Very dense indicators
  if (
    budStructure.includes("very dense") ||
    budStructure.includes("extremely dense") ||
    budStructure.includes("rock hard") ||
    budStructure.includes("solid")
  ) {
    return 95;
  }
  
  if (
    budStructure.includes("dense") ||
    budStructure.includes("compact") ||
    budStructure.includes("chunky") ||
    budStructure.includes("tight")
  ) {
    return 80;
  }
  
  // Medium density
  if (
    budStructure.includes("medium") ||
    budStructure.includes("moderate") ||
    budStructure.includes("balanced")
  ) {
    return 50;
  }
  
  // Airy indicators
  if (
    budStructure.includes("airy") ||
    budStructure.includes("loose") ||
    budStructure.includes("sparse") ||
    budStructure.includes("open")
  ) {
    return 25;
  }
  
  if (
    budStructure.includes("very airy") ||
    budStructure.includes("extremely airy") ||
    budStructure.includes("foxtailed") ||
    budStructure.includes("elongated")
  ) {
    return 10;
  }
  
  // Default to medium if unclear
  return 50;
}

/**
 * Phase 4.9.1.2 — Extract Calyx Profile
 */
function extractCalyxProfile(
  budStructure: string,
  visualTraits: string[]
): VisualSignature["calyxProfile"] {
  const allText = `${budStructure} ${visualTraits.join(" ")}`.toLowerCase();
  
  // Shape detection
  let shape: "round" | "elongated" | "mixed" | "unknown" = "unknown";
  if (allText.includes("round") || allText.includes("spherical") || allText.includes("ball")) {
    shape = "round";
  } else if (
    allText.includes("elongated") ||
    allText.includes("oblong") ||
    allText.includes("stretched") ||
    allText.includes("foxtail")
  ) {
    shape = "elongated";
  } else if (
    (allText.includes("round") && allText.includes("elongated")) ||
    allText.includes("mixed")
  ) {
    shape = "mixed";
  }
  
  // Size detection
  let size: "small" | "medium" | "large" | "unknown" = "unknown";
  if (allText.includes("small calyx") || allText.includes("tiny calyx")) {
    size = "small";
  } else if (allText.includes("large calyx") || allText.includes("big calyx")) {
    size = "large";
  } else if (allText.includes("calyx")) {
    size = "medium"; // Default if calyx mentioned but size not specified
  }
  
  // Distribution detection
  let distribution: "tight" | "loose" | "mixed" | "unknown" = "unknown";
  if (allText.includes("tight") || allText.includes("compact") || allText.includes("dense")) {
    distribution = "tight";
  } else if (allText.includes("loose") || allText.includes("sparse") || allText.includes("airy")) {
    distribution = "loose";
  } else if (allText.includes("mixed") || (allText.includes("tight") && allText.includes("loose"))) {
    distribution = "mixed";
  }
  
  return { shape, size, distribution };
}

/**
 * Phase 4.9.1.3 — Calculate Leaf-to-Bud Ratio
 * Estimates how much leaf vs bud is visible in the image
 */
function calculateLeafToBudRatio(
  budStructure: string,
  visualTraits: string[]
): number {
  const allText = `${budStructure} ${visualTraits.join(" ")}`.toLowerCase();
  
  // Leaf-heavy indicators
  if (
    allText.includes("fan leaf") ||
    allText.includes("large leaf") ||
    allText.includes("leaf dominant") ||
    allText.includes("mostly leaf")
  ) {
    return 80;
  }
  
  if (
    allText.includes("leaf visible") ||
    allText.includes("some leaf") ||
    allText.includes("leaf and bud")
  ) {
    return 40;
  }
  
  // Bud-heavy indicators
  if (
    allText.includes("bud dominant") ||
    allText.includes("mostly bud") ||
    allText.includes("close-up bud") ||
    allText.includes("macro bud")
  ) {
    return 10;
  }
  
  if (
    allText.includes("bud") &&
    !allText.includes("leaf") &&
    !allText.includes("fan")
  ) {
    return 20;
  }
  
  // Default: balanced (some leaf, mostly bud)
  return 30;
}

/**
 * Phase 4.9.1.4 — Extract Trichome Profile
 */
function extractTrichomeProfile(
  trichomes: string
): { trichomeScore: number; trichomeLevel: "low" | "medium" | "high" } {
  const trichomesLower = trichomes.toLowerCase();
  
  // High trichome coverage
  if (
    trichomesLower.includes("very") && trichomesLower.includes("dense") ||
    trichomesLower.includes("extremely") ||
    trichomesLower.includes("heavy") ||
    trichomesLower.includes("covered") ||
    trichomesLower.includes("frosted") ||
    trichomesLower.includes("white")
  ) {
    return { trichomeScore: 90, trichomeLevel: "high" };
  }
  
  if (
    trichomesLower.includes("dense") ||
    trichomesLower.includes("abundant") ||
    trichomesLower.includes("thick")
  ) {
    return { trichomeScore: 75, trichomeLevel: "high" };
  }
  
  // Medium trichome coverage
  if (
    trichomesLower.includes("medium") ||
    trichomesLower.includes("moderate") ||
    trichomesLower.includes("average")
  ) {
    return { trichomeScore: 50, trichomeLevel: "medium" };
  }
  
  // Low trichome coverage
  if (
    trichomesLower.includes("light") ||
    trichomesLower.includes("sparse") ||
    trichomesLower.includes("minimal")
  ) {
    return { trichomeScore: 25, trichomeLevel: "low" };
  }
  
  if (
    trichomesLower.includes("very") && trichomesLower.includes("light") ||
    trichomesLower.includes("very") && trichomesLower.includes("sparse")
  ) {
    return { trichomeScore: 10, trichomeLevel: "low" };
  }
  
  // Default to medium if unclear
  return { trichomeScore: 50, trichomeLevel: "medium" };
}

/**
 * Phase 4.9.1.5 — Extract Color Spectrum
 */
function extractColorSpectrum(
  coloration: string,
  visualTraits: string[]
): VisualSignature["colorProfile"] {
  const allText = `${coloration} ${visualTraits.join(" ")}`.toLowerCase();
  
  const detectedColors: string[] = [];
  let primary: "lime" | "forest" | "purple" | "frost" | "mixed" | "unknown" = "unknown";
  const secondary: string[] = [];
  
  // Detect all color groups first
  const hasLime = allText.includes("lime") ||
    allText.includes("bright green") ||
    allText.includes("light green") ||
    allText.includes("yellow-green");
  
  const hasForest = allText.includes("forest") ||
    allText.includes("deep green") ||
    allText.includes("dark green") ||
    allText.includes("emerald");
  
  const hasPurple = allText.includes("purple") ||
    allText.includes("violet") ||
    allText.includes("lavender") ||
    allText.includes("plum");
  
  const hasFrost = allText.includes("frost") ||
    allText.includes("white") ||
    allText.includes("silver") ||
    allText.includes("icy");
  
  // Count how many primary color groups are detected
  const primaryColorCount = [hasLime, hasForest, hasPurple, hasFrost].filter(Boolean).length;
  
  // Set primary color based on detection
  if (primaryColorCount === 0) {
    primary = "unknown";
  } else if (primaryColorCount === 1) {
    // Single primary color detected
    if (hasLime) {
      detectedColors.push("lime");
      primary = "lime";
    } else if (hasForest) {
      detectedColors.push("forest");
      primary = "forest";
    } else if (hasPurple) {
      detectedColors.push("purple");
      primary = "purple";
    } else if (hasFrost) {
      detectedColors.push("frost");
      primary = "frost";
    }
  } else {
    // Multiple primary colors detected → mixed
    if (hasLime) detectedColors.push("lime");
    if (hasForest) detectedColors.push("forest");
    if (hasPurple) detectedColors.push("purple");
    if (hasFrost) detectedColors.push("frost");
    primary = "mixed";
  }
  
  // Additional color detection
  if (allText.includes("orange")) detectedColors.push("orange");
  if (allText.includes("red")) detectedColors.push("red");
  if (allText.includes("blue")) detectedColors.push("blue");
  if (allText.includes("pink")) detectedColors.push("pink");
  if (allText.includes("amber")) detectedColors.push("amber");
  if (allText.includes("yellow")) detectedColors.push("yellow");
  if (allText.includes("brown")) detectedColors.push("brown");
  
  // Set secondary colors (all except primary)
  const primaryColors = ["lime", "forest", "purple", "frost"];
  detectedColors.forEach(color => {
    if (!primaryColors.includes(color) || (primary !== "mixed" && color !== primary)) {
      secondary.push(color);
    }
  });
  
  return {
    primary: primary === "unknown" && detectedColors.length > 0 ? "mixed" : primary,
    secondary: secondary.length > 0 ? secondary : undefined,
    spectrum: detectedColors.length > 0 ? detectedColors : ["unknown"],
  };
}

/**
 * Phase 4.9.1.6 — Extract Pistil Profile
 */
function extractPistilProfile(
  coloration: string,
  visualTraits: string[]
): VisualSignature["pistilProfile"] {
  const allText = `${coloration} ${visualTraits.join(" ")}`.toLowerCase();
  
  // Pistil color detection
  const pistilColors: string[] = [];
  let primaryColor = "orange"; // Default
  
  if (allText.includes("orange pistil") || allText.includes("orange hair")) {
    pistilColors.push("orange");
    primaryColor = "orange";
  }
  if (allText.includes("amber pistil") || allText.includes("amber hair")) {
    pistilColors.push("amber");
    if (primaryColor === "orange") primaryColor = "amber";
  }
  if (allText.includes("white pistil") || allText.includes("white hair")) {
    pistilColors.push("white");
    if (primaryColor === "orange") primaryColor = "white";
  }
  if (allText.includes("pink pistil") || allText.includes("pink hair")) {
    pistilColors.push("pink");
    if (primaryColor === "orange") primaryColor = "pink";
  }
  if (allText.includes("red pistil") || allText.includes("red hair")) {
    pistilColors.push("red");
    if (primaryColor === "orange") primaryColor = "red";
  }
  
  // Distribution detection
  let distribution: "sparse" | "moderate" | "dense" | "unknown" = "unknown";
  if (allText.includes("dense pistil") || allText.includes("many pistil") || allText.includes("covered in pistil")) {
    distribution = "dense";
  } else if (allText.includes("moderate pistil") || allText.includes("some pistil")) {
    distribution = "moderate";
  } else if (allText.includes("sparse pistil") || allText.includes("few pistil")) {
    distribution = "sparse";
  } else if (allText.includes("pistil")) {
    distribution = "moderate"; // Default if pistil mentioned
  }
  
  // Maturity detection
  let maturity: "immature" | "mature" | "overripe" | "unknown" = "unknown";
  if (
    allText.includes("immature") ||
    allText.includes("early") ||
    allText.includes("white pistil") && !allText.includes("amber")
  ) {
    maturity = "immature";
  } else if (
    allText.includes("overripe") ||
    allText.includes("amber pistil") ||
    allText.includes("brown pistil")
  ) {
    maturity = "overripe";
  } else if (
    allText.includes("mature") ||
    allText.includes("ripe") ||
    allText.includes("orange pistil")
  ) {
    maturity = "mature";
  }
  
  return {
    color: primaryColor,
    colors: pistilColors.length > 0 ? pistilColors : [primaryColor],
    distribution,
    maturity,
  };
}

/**
 * Phase 4.9.1.7 — Calculate Extraction Confidence
 * Estimates how confident we are in the extracted features
 */
function calculateExtractionConfidence(
  budStructure: string,
  trichomes: string,
  coloration: string,
  visualTraits: string[]
): number {
  let confidence = 50; // Base confidence
  
  // Increase confidence based on data availability
  if (budStructure && budStructure.length > 10) confidence += 10;
  if (trichomes && trichomes.length > 10) confidence += 10;
  if (coloration && coloration.length > 10) confidence += 10;
  if (visualTraits && visualTraits.length > 0) confidence += 10;
  
  // Increase if specific keywords are found (indicates detailed analysis)
  const specificKeywords = [
    "dense", "airy", "trichome", "pistil", "calyx", "color", "green", "purple"
  ];
  const allText = `${budStructure} ${trichomes} ${coloration} ${visualTraits.join(" ")}`.toLowerCase();
  const keywordCount = specificKeywords.filter(kw => allText.includes(kw)).length;
  confidence += Math.min(10, keywordCount * 2);
  
  return Math.min(100, confidence);
}
