// Phase 4.9.3 — Image ↔ Strain Match Scoring
// lib/scanner/imageStrainMatchScoring.ts

import type { VisualSignature } from "./visualFeatureExtraction";
import type { CultivarReference } from "./cultivarLibrary";
import { getStrainVisualBaseline, checkBaselineMatch, type VisualBaselineRange } from "./strainVisualBaselines";

/**
 * Phase 4.9.3 — Visual Match Score Result
 * Normalized 0-1 score comparing image visual signature to strain baseline
 */
export type VisualMatchScoreResult = {
  visualMatchScore: number; // 0-1, normalized overall match score
  featureScores: {
    density: number; // 0-1
    trichome: number; // 0-1
    color: number; // 0-1
    pistil: number; // 0-1
    calyx?: number; // 0-1 (optional)
  };
  penalties: {
    densityMismatch: number; // Penalty applied (0-1)
    trichomeMismatch: number; // Penalty applied (0-1)
    colorMismatch: number; // Penalty applied (0-1)
    pistilMismatch: number; // Penalty applied (0-1)
  };
  explanation: string[]; // Human-readable explanation
  withinTolerance: {
    density: boolean;
    trichome: boolean;
    color: boolean;
    pistil: boolean;
  };
};

/**
 * Phase 4.9.3 — Calculate Image ↔ Strain Match Score
 * 
 * Compares image VisualSignature to strain VisualBaseline
 * Scores per feature, penalizes mismatches, normalizes to 0-1
 * 
 * Scoring weights:
 * - Density: 35% (most distinctive)
 * - Trichome: 25% (quality indicator)
 * - Color: 25% (visual identifier)
 * - Pistil: 15% (supporting trait)
 */
export function calculateImageStrainMatchScore(
  imageSignature: VisualSignature,
  strain: CultivarReference
): VisualMatchScoreResult {
  // Phase 4.9.3.1 — Get strain visual baseline
  const baseline = getStrainVisualBaseline(strain);
  
  // Phase 4.9.3.2 — Score each feature
  const densityScore = scoreDensityMatch(imageSignature.densityScore, baseline.densityRange);
  const trichomeScore = scoreTrichomeMatch(imageSignature.trichomeScore, baseline.trichomeRange);
  const colorScore = scoreColorMatch(imageSignature.colorProfile, baseline.colorBaseline);
  const pistilScore = scorePistilMatch(imageSignature.pistilProfile, baseline.colorBaseline);
  
  // Phase 4.9.3.3 — Calculate penalties for mismatches
  const penalties = calculatePenalties(
    imageSignature,
    baseline,
    { densityScore, trichomeScore, colorScore, pistilScore }
  );
  
  // Phase 4.9.3.4 — Check if within tolerance bands
  const withinTolerance = {
    density: checkDensityTolerance(imageSignature.densityScore, baseline.densityRange),
    trichome: checkTrichomeTolerance(imageSignature.trichomeScore, baseline.trichomeRange),
    color: colorScore >= 0.7, // 70% threshold for color match
    pistil: pistilScore >= 0.7, // 70% threshold for pistil match
  };
  
  // Phase 4.9.3.5 — Apply penalties to feature scores
  const penalizedDensity = Math.max(0, densityScore - penalties.densityMismatch);
  const penalizedTrichome = Math.max(0, trichomeScore - penalties.trichomeMismatch);
  const penalizedColor = Math.max(0, colorScore - penalties.colorMismatch);
  const penalizedPistil = Math.max(0, pistilScore - penalties.pistilMismatch);
  
  // Phase 4.9.3.6 — Calculate weighted overall score (normalized 0-1)
  const visualMatchScore = Math.max(0, Math.min(1,
    penalizedDensity * 0.35 +
    penalizedTrichome * 0.25 +
    penalizedColor * 0.25 +
    penalizedPistil * 0.15
  ));
  
  // Phase 4.9.3.7 — Build explanation
  const explanation = buildExplanation(
    imageSignature,
    baseline,
    { densityScore, trichomeScore, colorScore, pistilScore },
    withinTolerance,
    visualMatchScore
  );
  
  return {
    visualMatchScore,
    featureScores: {
      density: penalizedDensity,
      trichome: penalizedTrichome,
      color: penalizedColor,
      pistil: penalizedPistil,
    },
    penalties,
    explanation,
    withinTolerance,
  };
}

/**
 * Phase 4.9.3.2.1 — Score Density Match
 * Returns 0-1 score based on how well observed density matches baseline range
 */
function scoreDensityMatch(
  observed: number,
  range: VisualBaselineRange["densityRange"]
): number {
  // Perfect match: within typical ± tolerance
  if (
    observed >= (range.typical - range.tolerance) &&
    observed <= (range.typical + range.tolerance)
  ) {
    return 1.0;
  }
  
  // Good match: within min-max range
  if (observed >= range.min && observed <= range.max) {
    // Score based on distance from typical (closer = higher score)
    const distanceFromTypical = Math.abs(observed - range.typical);
    const maxDistance = Math.max(
      range.typical - range.min,
      range.max - range.typical
    );
    if (maxDistance === 0) return 1.0;
    const score = 1.0 - (distanceFromTypical / maxDistance) * 0.3; // Max 30% penalty
    return Math.max(0.7, score);
  }
  
  // Partial match: close to range
  const distanceToRange = Math.min(
    Math.abs(observed - range.min),
    Math.abs(observed - range.max)
  );
  if (distanceToRange <= 20) {
    return Math.max(0.4, 0.7 - (distanceToRange / 20) * 0.3);
  }
  
  // Poor match: far from range
  return Math.max(0, 0.4 - (distanceToRange - 20) * 0.01);
}

/**
 * Phase 4.9.3.2.2 — Score Trichome Match
 * Returns 0-1 score based on how well observed trichome matches baseline range
 */
function scoreTrichomeMatch(
  observed: number,
  range: VisualBaselineRange["trichomeRange"]
): number {
  // Perfect match: within range
  if (observed >= range.min && observed <= range.max) {
    // Score based on distance from typical
    const distanceFromTypical = Math.abs(observed - range.typical);
    const maxDistance = Math.max(
      range.typical - range.min,
      range.max - range.typical
    );
    if (maxDistance === 0) return 1.0;
    const score = 1.0 - (distanceFromTypical / maxDistance) * 0.2; // Max 20% penalty
    return Math.max(0.8, score);
  }
  
  // Partial match: close to range
  const distanceToRange = Math.min(
    Math.abs(observed - range.min),
    Math.abs(observed - range.max)
  );
  if (distanceToRange <= 15) {
    return Math.max(0.5, 0.8 - (distanceToRange / 15) * 0.3);
  }
  
  // Poor match: far from range
  return Math.max(0, 0.5 - (distanceToRange - 15) * 0.01);
}

/**
 * Phase 4.9.3.2.3 — Score Color Match
 * Returns 0-1 score based on color profile alignment
 */
function scoreColorMatch(
  observed: VisualSignature["colorProfile"],
  baseline: VisualBaselineRange["colorBaseline"]
): number {
  let score = 0;
  
  // Primary color match (50% of score)
  if (observed.primary === baseline.primary) {
    score += 0.5;
  } else if (observed.primary === "mixed" || baseline.primary === "mixed") {
    // Mixed colors get partial credit
    score += 0.25;
  } else if (
    (observed.primary === "lime" && baseline.primary === "forest") ||
    (observed.primary === "forest" && baseline.primary === "lime")
  ) {
    // Similar greens get partial credit
    score += 0.3;
  }
  
  // Secondary color overlap (30% of score)
  if (observed.secondary && baseline.secondary) {
    const secondaryOverlap = observed.secondary.filter(obs =>
      baseline.secondary!.some(base => 
        obs.toLowerCase().includes(base.toLowerCase()) || 
        base.toLowerCase().includes(obs.toLowerCase())
      )
    ).length;
    if (secondaryOverlap > 0) {
      score += Math.min(0.3, (secondaryOverlap / Math.max(observed.secondary.length, baseline.secondary!.length)) * 0.3);
    }
  }
  
  // Spectrum overlap (20% of score)
  const spectrumOverlap = observed.spectrum.filter(obs =>
    baseline.secondary?.some(base => 
      obs.toLowerCase().includes(base.toLowerCase()) || 
      base.toLowerCase().includes(obs.toLowerCase())
    ) || 
    obs.toLowerCase().includes(baseline.primary.toLowerCase())
  ).length;
  if (spectrumOverlap > 0) {
    score += Math.min(0.2, (spectrumOverlap / observed.spectrum.length) * 0.2);
  }
  
  return Math.min(1.0, score);
}

/**
 * Phase 4.9.3.2.4 — Score Pistil Match
 * Returns 0-1 score based on pistil color alignment
 */
function scorePistilMatch(
  observed: VisualSignature["pistilProfile"],
  baseline: VisualBaselineRange["colorBaseline"]
): number {
  const observedColors = observed.colors.map(c => c.toLowerCase());
  const baselineColors = baseline.pistilColors.map(c => c.toLowerCase());
  
  // Exact color match (60% of score)
  const exactMatch = observedColors.some(obs => 
    baselineColors.some(base => obs === base)
  );
  if (exactMatch) {
    return 0.9; // High score for exact match
  }
  
  // Similar color groups (40% of score)
  const similarColorGroups = [
    ["orange", "amber", "rust"],
    ["white", "cream", "pale"],
    ["pink", "rose", "coral"],
    ["purple", "violet", "lavender"],
  ];
  
  for (const group of similarColorGroups) {
    const observedInGroup = observedColors.some(obs => 
      group.some(g => obs.includes(g) || g.includes(obs))
    );
    const baselineInGroup = baselineColors.some(base => 
      group.some(g => base.includes(g) || g.includes(base))
    );
    if (observedInGroup && baselineInGroup) {
      return 0.6; // Partial credit for similar colors
    }
  }
  
  // No match
  return 0.2;
}

/**
 * Phase 4.9.3.3 — Calculate Penalties for Mismatches
 * Applies penalties when observed values fall outside tolerance bands
 */
function calculatePenalties(
  signature: VisualSignature,
  baseline: VisualBaselineRange,
  scores: { densityScore: number; trichomeScore: number; colorScore: number; pistilScore: number }
): VisualMatchScoreResult["penalties"] {
  const penalties = {
    densityMismatch: 0,
    trichomeMismatch: 0,
    colorMismatch: 0,
    pistilMismatch: 0,
  };
  
  // Density penalty: if outside tolerance band
  if (!checkDensityTolerance(signature.densityScore, baseline.densityRange)) {
    const distanceFromTolerance = Math.min(
      Math.abs(signature.densityScore - (baseline.densityRange.typical - baseline.densityRange.tolerance)),
      Math.abs(signature.densityScore - (baseline.densityRange.typical + baseline.densityRange.tolerance))
    );
    penalties.densityMismatch = Math.min(0.3, distanceFromTolerance / 100); // Max 30% penalty
  }
  
  // Trichome penalty: if outside range
  if (
    signature.trichomeScore < baseline.trichomeRange.min ||
    signature.trichomeScore > baseline.trichomeRange.max
  ) {
    const distanceFromRange = Math.min(
      Math.abs(signature.trichomeScore - baseline.trichomeRange.min),
      Math.abs(signature.trichomeScore - baseline.trichomeRange.max)
    );
    penalties.trichomeMismatch = Math.min(0.25, distanceFromRange / 100); // Max 25% penalty
  }
  
  // Color penalty: if primary color doesn't match
  if (signature.colorProfile.primary !== baseline.colorBaseline.primary && 
      signature.colorProfile.primary !== "mixed" && 
      baseline.colorBaseline.primary !== "mixed") {
    penalties.colorMismatch = 0.2; // 20% penalty for primary color mismatch
  }
  
  // Pistil penalty: if no color overlap
  const observedPistilColors = signature.pistilProfile.colors.map(c => c.toLowerCase());
  const baselinePistilColors = baseline.colorBaseline.pistilColors.map(c => c.toLowerCase());
  const hasPistilMatch = observedPistilColors.some(obs => 
    baselinePistilColors.some(base => obs.includes(base) || base.includes(obs))
  );
  if (!hasPistilMatch) {
    penalties.pistilMismatch = 0.15; // 15% penalty for pistil mismatch
  }
  
  return penalties;
}

/**
 * Phase 4.9.3.4.1 — Check Density Tolerance
 */
function checkDensityTolerance(
  observed: number,
  range: VisualBaselineRange["densityRange"]
): boolean {
  return (
    observed >= (range.typical - range.tolerance) &&
    observed <= (range.typical + range.tolerance)
  );
}

/**
 * Phase 4.9.3.4.2 — Check Trichome Tolerance
 */
function checkTrichomeTolerance(
  observed: number,
  range: VisualBaselineRange["trichomeRange"]
): boolean {
  return observed >= range.min && observed <= range.max;
}

/**
 * Phase 4.9.3.7 — Build Explanation
 */
function buildExplanation(
  signature: VisualSignature,
  baseline: VisualBaselineRange,
  scores: { densityScore: number; trichomeScore: number; colorScore: number; pistilScore: number },
  withinTolerance: VisualMatchScoreResult["withinTolerance"],
  overallScore: number
): string[] {
  const explanation: string[] = [];
  
  if (overallScore >= 0.85) {
    explanation.push("Strong visual match with expected strain characteristics");
  } else if (overallScore >= 0.70) {
    explanation.push("Good visual match with expected strain characteristics");
  } else if (overallScore >= 0.55) {
    explanation.push("Moderate visual match — some traits differ from expected");
  } else {
    explanation.push("Limited visual match — significant differences from expected profile");
  }
  
  // Feature-specific explanations
  if (withinTolerance.density) {
    explanation.push(`Density (${signature.densityScore}) within expected range (${baseline.densityRange.min}-${baseline.densityRange.max})`);
  } else {
    explanation.push(`Density (${signature.densityScore}) outside expected range (${baseline.densityRange.min}-${baseline.densityRange.max})`);
  }
  
  if (withinTolerance.trichome) {
    explanation.push(`Trichome coverage (${signature.trichomeScore}) within expected range (${baseline.trichomeRange.min}-${baseline.trichomeRange.max})`);
  } else {
    explanation.push(`Trichome coverage (${signature.trichomeScore}) outside expected range (${baseline.trichomeRange.min}-${baseline.trichomeRange.max})`);
  }
  
  if (withinTolerance.color) {
    explanation.push(`Color profile matches expected baseline`);
  } else {
    explanation.push(`Color profile differs from expected (observed: ${signature.colorProfile.primary}, expected: ${baseline.colorBaseline.primary})`);
  }
  
  if (withinTolerance.pistil) {
    explanation.push(`Pistil colors match expected baseline`);
  } else {
    explanation.push(`Pistil colors differ from expected`);
  }
  
  return explanation;
}

/**
 * Phase 4.9.3 — Score Multiple Candidate Strains
 * 
 * Scores multiple candidate strains against a single image signature
 * Returns ranked list with visual match scores
 */
export function scoreCandidateStrains(
  imageSignature: VisualSignature,
  candidateStrains: CultivarReference[]
): Array<{
  strain: CultivarReference;
  visualMatchScore: number;
  result: VisualMatchScoreResult;
}> {
  const scored = candidateStrains.map(strain => {
    const result = calculateImageStrainMatchScore(imageSignature, strain);
    return {
      strain,
      visualMatchScore: result.visualMatchScore,
      result,
    };
  });
  
  // Sort by visual match score (highest first)
  scored.sort((a, b) => b.visualMatchScore - a.visualMatchScore);
  
  return scored;
}

/**
 * Phase 4.9.4 — Multi-Image Consensus (VSI)
 * 
 * Across 2-5 images:
 * - Average visualMatchScore
 * - Boost consistent features
 * - Flag contradictions
 * 
 * Output:
 * - visualConsensusScore: 0-1, normalized consensus score
 * - visualConfidenceNote: Human-readable explanation
 */
export type VisualConsensusResult = {
  visualConsensusScore: number; // 0-1, normalized consensus score across images
  averageMatchScore: number; // 0-1, simple average of all image match scores
  consistencyBoost: number; // 0-1, boost for consistent features across images
  contradictionPenalty: number; // 0-1, penalty for contradictory features
  perImageScores: Array<{
    imageIndex: number;
    visualMatchScore: number;
    featureScores: VisualMatchScoreResult["featureScores"];
  }>;
  consistentFeatures: string[]; // Features that match across all images
  contradictoryFeatures: string[]; // Features that contradict across images
  visualConfidenceNote: string; // Human-readable explanation
};

/**
 * Phase 4.9.4 — Calculate Multi-Image Visual Consensus
 * 
 * Takes multiple image signatures and a candidate strain
 * Returns consensus score with consistency boost and contradiction flags
 */
export function calculateMultiImageVisualConsensus(
  imageSignatures: VisualSignature[],
  strain: CultivarReference
): VisualConsensusResult {
  if (imageSignatures.length === 0) {
    return {
      visualConsensusScore: 0,
      averageMatchScore: 0,
      consistencyBoost: 0,
      contradictionPenalty: 0,
      perImageScores: [],
      consistentFeatures: [],
      contradictoryFeatures: [],
      visualConfidenceNote: "No images available for visual consensus",
    };
  }
  
  // Phase 4.9.4.1 — Calculate visual match score for each image
  const perImageScores = imageSignatures.map((signature, idx) => {
    const matchResult = calculateImageStrainMatchScore(signature, strain);
    return {
      imageIndex: idx,
      visualMatchScore: matchResult.visualMatchScore,
      featureScores: matchResult.featureScores,
      fullResult: matchResult, // Store full result for analysis
    };
  });
  
  // Phase 4.9.4.2 — Calculate average match score
  const averageMatchScore = perImageScores.reduce((sum, score) => sum + score.visualMatchScore, 0) / perImageScores.length;
  
  // Phase 4.9.4.3 — Detect consistent features (features that match across all images)
  const consistentFeatures = detectConsistentFeatures(perImageScores);
  
  // Phase 4.9.4.4 — Detect contradictory features (features that differ significantly)
  const contradictoryFeatures = detectContradictoryFeatures(perImageScores);
  
  // Phase 4.9.4.5 — Calculate consistency boost
  const consistencyBoost = calculateConsistencyBoost(consistentFeatures, perImageScores.length);
  
  // Phase 4.9.4.6 — Calculate contradiction penalty
  const contradictionPenalty = calculateContradictionPenalty(contradictoryFeatures, perImageScores.length);
  
  // Phase 4.9.4.7 — Calculate final consensus score
  // Base: average match score
  // Boost: consistency across images
  // Penalty: contradictions
  const visualConsensusScore = Math.max(0, Math.min(1,
    averageMatchScore + consistencyBoost - contradictionPenalty
  ));
  
  // Phase 4.9.4.8 — Generate confidence note
  const visualConfidenceNote = generateConsensusConfidenceNote(
    visualConsensusScore,
    averageMatchScore,
    consistencyBoost,
    contradictionPenalty,
    consistentFeatures,
    contradictoryFeatures,
    perImageScores.length
  );
  
  return {
    visualConsensusScore,
    averageMatchScore,
    consistencyBoost,
    contradictionPenalty,
    perImageScores: perImageScores.map(({ imageIndex, visualMatchScore, featureScores }) => ({
      imageIndex,
      visualMatchScore,
      featureScores,
    })),
    consistentFeatures,
    contradictoryFeatures,
    visualConfidenceNote,
  };
}

/**
 * Phase 4.9.4.3 — Detect Consistent Features
 * Features that match well across all images
 */
function detectConsistentFeatures(
  perImageScores: Array<{
    imageIndex: number;
    visualMatchScore: number;
    featureScores: VisualMatchScoreResult["featureScores"];
    fullResult: VisualMatchScoreResult;
  }>
): string[] {
  const consistent: string[] = [];
  
  if (perImageScores.length < 2) return consistent;
  
  // Check if density scores are consistent (within 0.1 of each other)
  const densityScores = perImageScores.map(s => s.featureScores.density);
  const densityVariance = calculateVariance(densityScores);
  if (densityVariance < 0.1) {
    consistent.push("density");
  }
  
  // Check if trichome scores are consistent
  const trichomeScores = perImageScores.map(s => s.featureScores.trichome);
  const trichomeVariance = calculateVariance(trichomeScores);
  if (trichomeVariance < 0.1) {
    consistent.push("trichome");
  }
  
  // Check if color scores are consistent
  const colorScores = perImageScores.map(s => s.featureScores.color);
  const colorVariance = calculateVariance(colorScores);
  if (colorVariance < 0.1) {
    consistent.push("color");
  }
  
  // Check if pistil scores are consistent
  const pistilScores = perImageScores.map(s => s.featureScores.pistil);
  const pistilVariance = calculateVariance(pistilScores);
  if (pistilVariance < 0.1) {
    consistent.push("pistil");
  }
  
  // Check if all images are within tolerance
  const allWithinTolerance = perImageScores.every(s => 
    s.fullResult.withinTolerance.density &&
    s.fullResult.withinTolerance.trichome &&
    s.fullResult.withinTolerance.color &&
    s.fullResult.withinTolerance.pistil
  );
  if (allWithinTolerance) {
    consistent.push("all_features");
  }
  
  return consistent;
}

/**
 * Phase 4.9.4.4 — Detect Contradictory Features
 * Features that differ significantly across images
 */
function detectContradictoryFeatures(
  perImageScores: Array<{
    imageIndex: number;
    visualMatchScore: number;
    featureScores: VisualMatchScoreResult["featureScores"];
    fullResult: VisualMatchScoreResult;
  }>
): string[] {
  const contradictory: string[] = [];
  
  if (perImageScores.length < 2) return contradictory;
  
  // Check for high variance in density scores
  const densityScores = perImageScores.map(s => s.featureScores.density);
  const densityVariance = calculateVariance(densityScores);
  if (densityVariance > 0.3) {
    contradictory.push("density");
  }
  
  // Check for high variance in trichome scores
  const trichomeScores = perImageScores.map(s => s.featureScores.trichome);
  const trichomeVariance = calculateVariance(trichomeScores);
  if (trichomeVariance > 0.3) {
    contradictory.push("trichome");
  }
  
  // Check for high variance in color scores
  const colorScores = perImageScores.map(s => s.featureScores.color);
  const colorVariance = calculateVariance(colorScores);
  if (colorVariance > 0.3) {
    contradictory.push("color");
  }
  
  // Check for mixed tolerance results (some within, some outside)
  const densityToleranceMix = perImageScores.some(s => s.fullResult.withinTolerance.density) &&
    perImageScores.some(s => !s.fullResult.withinTolerance.density);
  if (densityToleranceMix) {
    contradictory.push("density_tolerance");
  }
  
  const trichomeToleranceMix = perImageScores.some(s => s.fullResult.withinTolerance.trichome) &&
    perImageScores.some(s => !s.fullResult.withinTolerance.trichome);
  if (trichomeToleranceMix) {
    contradictory.push("trichome_tolerance");
  }
  
  return contradictory;
}

/**
 * Phase 4.9.4.5 — Calculate Consistency Boost
 * Rewards features that are consistent across images
 */
function calculateConsistencyBoost(
  consistentFeatures: string[],
  imageCount: number
): number {
  if (consistentFeatures.length === 0) return 0;
  
  // Base boost per consistent feature
  const baseBoostPerFeature = 0.05; // 5% per feature
  let boost = consistentFeatures.length * baseBoostPerFeature;
  
  // Extra boost if all features are consistent
  if (consistentFeatures.includes("all_features")) {
    boost += 0.1; // Additional 10% boost
  }
  
  // Scale by image count (more images = more impressive consistency)
  const imageCountMultiplier = Math.min(1.2, 1.0 + (imageCount - 2) * 0.1);
  boost *= imageCountMultiplier;
  
  // Cap boost at 0.2 (20%)
  return Math.min(0.2, boost);
}

/**
 * Phase 4.9.4.6 — Calculate Contradiction Penalty
 * Penalizes features that contradict across images
 */
function calculateContradictionPenalty(
  contradictoryFeatures: string[],
  imageCount: number
): number {
  if (contradictoryFeatures.length === 0) return 0;
  
  // Base penalty per contradictory feature
  const basePenaltyPerFeature = 0.08; // 8% per feature
  let penalty = contradictoryFeatures.length * basePenaltyPerFeature;
  
  // Extra penalty for tolerance mix (some within, some outside)
  const toleranceMixCount = contradictoryFeatures.filter(f => f.includes("tolerance")).length;
  if (toleranceMixCount > 0) {
    penalty += toleranceMixCount * 0.05; // Additional 5% per tolerance mix
  }
  
  // Scale by image count (more images = more significant contradiction)
  const imageCountMultiplier = Math.min(1.3, 1.0 + (imageCount - 2) * 0.15);
  penalty *= imageCountMultiplier;
  
  // Cap penalty at 0.3 (30%)
  return Math.min(0.3, penalty);
}

/**
 * Phase 4.9.4.8 — Generate Consensus Confidence Note
 */
function generateConsensusConfidenceNote(
  consensusScore: number,
  averageScore: number,
  consistencyBoost: number,
  contradictionPenalty: number,
  consistentFeatures: string[],
  contradictoryFeatures: string[],
  imageCount: number
): string {
  if (consensusScore >= 0.85) {
    if (consistentFeatures.length >= 3) {
      return `Strong visual consensus across ${imageCount} images — all key features align with expected strain characteristics`;
    }
    return `Strong visual match across ${imageCount} images`;
  } else if (consensusScore >= 0.70) {
    if (consistentFeatures.length >= 2) {
      return `Good visual consensus across ${imageCount} images — most features align consistently`;
    }
    return `Good visual match across ${imageCount} images`;
  } else if (consensusScore >= 0.55) {
    if (contradictoryFeatures.length > 0) {
      return `Moderate visual match — some features vary across ${imageCount} images, suggesting phenotype variance or different growth stages`;
    }
    return `Moderate visual match across ${imageCount} images`;
  } else {
    if (contradictoryFeatures.length > 0) {
      return `Limited visual consensus — significant feature contradictions across ${imageCount} images suggest this may not be the correct strain`;
    }
    return `Limited visual match across ${imageCount} images`;
  }
}

/**
 * Helper: Calculate Variance
 * Returns variance of an array of numbers (0-1 scale)
 */
function calculateVariance(scores: number[]): number {
  if (scores.length < 2) return 0;
  
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / scores.length;
  
  return Math.sqrt(variance); // Return standard deviation (normalized)
}
