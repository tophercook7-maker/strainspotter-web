// Phase 5.3.2 — CONFIDENCE SOURCES (INTERNAL)
// lib/scanner/confidenceSources.ts

/**
 * Phase 5.3.2 — Confidence Sources
 * 
 * Confidence score weighted by:
 * - Image diversity (angles, distance)
 * - Visual feature strength
 * - Name consensus frequency
 * - Database lineage match
 * - Clone/variant agreement
 * 
 * Lowest signal caps final score.
 */

export type ConfidenceSourceSignals = {
  imageDiversity: number; // 0-1: angles, distance diversity
  visualFeatureStrength: number; // 0-1: visual feature clarity and strength
  nameConsensusFrequency: number; // 0-1: how often name appears across images/sources
  databaseLineageMatch: number; // 0-1: database lineage/genetics match strength
  cloneVariantAgreement: number; // 0-1: clone/variant agreement across sources
};

export type ConfidenceSourceResult = {
  signals: ConfidenceSourceSignals;
  lowestSignal: number; // The minimum signal (weakest link)
  lowestSignalName: keyof ConfidenceSourceSignals; // Which signal is weakest
  cappedConfidence: number; // Final confidence capped by lowest signal
  explanation: string; // User-facing explanation
};

/**
 * Phase 5.3.2.1 — Calculate Image Diversity Signal
 * 
 * Measures diversity of angles and distances across images.
 * Returns 0-1 score.
 */
export function calculateImageDiversitySignal(args: {
  imageCount: number;
  uniqueAngles: number; // Number of unique angles detected
  angleDiversityScore?: number; // 0-1 if available from angleDiversity.ts
  distanceDiversity?: number; // 0-1 if available (macro vs wide shots)
}): number {
  const { imageCount, uniqueAngles, angleDiversityScore, distanceDiversity } = args;
  
  if (imageCount === 0) {
    return 0;
  }
  
  if (imageCount === 1) {
    // Single image has no diversity
    return 0.3; // Low but not zero (single image can still be useful)
  }
  
  // Use angleDiversityScore if available (from angleDiversity.ts)
  if (angleDiversityScore !== undefined) {
    return Math.max(0, Math.min(1, angleDiversityScore));
  }
  
  // Fallback: calculate from unique angles
  const angleRatio = uniqueAngles / imageCount;
  const baseScore = Math.min(1, angleRatio);
  
  // Boost if distance diversity is present
  const distanceBoost = distanceDiversity ? distanceDiversity * 0.2 : 0;
  
  return Math.max(0, Math.min(1, baseScore + distanceBoost));
}

/**
 * Phase 5.3.2.2 — Calculate Visual Feature Strength Signal
 * 
 * Measures how strong and clear visual features are.
 * Returns 0-1 score.
 */
export function calculateVisualFeatureStrengthSignal(args: {
  visualAlignment: number; // 0-1: visual channel score from fingerprint
  visualClarity?: number; // 0-1: image clarity/distinctness if available
  visualConsensusScore?: number; // 0-1: multi-image visual consensus if available
}): number {
  const { visualAlignment, visualClarity, visualConsensusScore } = args;
  
  // Base score from visual alignment
  let score = visualAlignment;
  
  // Boost if visual clarity is high
  if (visualClarity !== undefined) {
    score = (score * 0.7) + (visualClarity * 0.3);
  }
  
  // Boost if multi-image visual consensus is strong
 if (visualConsensusScore !== undefined) {
    score = (score * 0.6) + (visualConsensusScore * 0.4);
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Phase 5.3.2.3 — Calculate Name Consensus Frequency Signal
 * 
 * Measures how frequently the primary name appears across images and sources.
 * Returns 0-1 score.
 */
export function calculateNameConsensusFrequencySignal(args: {
  imageCount: number;
  imagesWithName: number; // How many images have this name in top candidates
  hasDatabaseMatch: boolean; // Database has this name
  nameFrequency?: number; // 0-1: normalized frequency if available
}): number {
  const { imageCount, imagesWithName, hasDatabaseMatch, nameFrequency } = args;
  
  if (imageCount === 0) {
    return 0;
  }
  
  // Calculate image consensus ratio
  const imageConsensusRatio = imagesWithName / imageCount;
  
  // Base score from image consensus
  let score = imageConsensusRatio;
  
  // Boost if database match exists
  if (hasDatabaseMatch) {
    score = score * 0.8 + 0.2; // Add 20% boost
  }
  
  // Use nameFrequency if available (more precise)
  if (nameFrequency !== undefined) {
    score = (score * 0.6) + (nameFrequency * 0.4);
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Phase 5.3.2.4 — Calculate Database Lineage Match Signal
 * 
 * Measures how well the database lineage/genetics match.
 * Returns 0-1 score.
 */
export function calculateDatabaseLineageMatchSignal(args: {
  geneticAlignment: number; // 0-1: genetics channel score from fingerprint
  hasLineageData: boolean; // Database has lineage/genetics data
  lineageMatchStrength?: number; // 0-1: specific lineage match strength if available
}): number {
  const { geneticAlignment, hasLineageData, lineageMatchStrength } = args;
  
  // Base score from genetic alignment
  let score = geneticAlignment;
  
  // Penalize if no lineage data available
  if (!hasLineageData) {
    score = score * 0.6; // Reduce by 40%
  }
  
  // Use lineageMatchStrength if available (more precise)
  if (lineageMatchStrength !== undefined) {
    score = (score * 0.7) + (lineageMatchStrength * 0.3);
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Phase 5.3.2.5 — Calculate Clone/Variant Agreement Signal
 * 
 * Measures agreement across clones/variants of the same strain.
 * Returns 0-1 score.
 */
export function calculateCloneVariantAgreementSignal(args: {
  hasCloneDetection: boolean; // Clone detection was triggered
  cloneAgreement?: number; // 0-1: agreement across clones if available
  variantAgreement?: number; // 0-1: agreement across variants if available
  hasDisambiguation: boolean; // Name disambiguation was needed
}): number {
  const { hasCloneDetection, cloneAgreement, variantAgreement, hasDisambiguation } = args;
  
  // If no clone detection, assume high agreement (no ambiguity)
  if (!hasCloneDetection && !hasDisambiguation) {
    return 0.9; // High agreement when no clones detected
  }
  
  // If clone detection triggered, use agreement scores
  if (cloneAgreement !== undefined) {
    return Math.max(0, Math.min(1, cloneAgreement));
  }
  
  if (variantAgreement !== undefined) {
    return Math.max(0, Math.min(1, variantAgreement));
  }
  
  // If disambiguation was needed but no agreement score, reduce confidence
  if (hasDisambiguation) {
    return 0.7; // Moderate agreement when disambiguation needed
  }
  
  // Default: moderate agreement
  return 0.8;
}

/**
 * Phase 5.3.2 — Calculate Confidence Sources
 * 
 * Calculates all 5 confidence source signals and applies "lowest signal caps final score" rule.
 */
export function calculateConfidenceSources(args: {
  // Image diversity inputs
  imageCount: number;
  uniqueAngles?: number;
  angleDiversityScore?: number;
  distanceDiversity?: number;
  
  // Visual feature strength inputs
  visualAlignment: number; // 0-1
  visualClarity?: number; // 0-1
  visualConsensusScore?: number; // 0-1
  
  // Name consensus frequency inputs
  imagesWithName?: number;
  hasDatabaseMatch: boolean;
  nameFrequency?: number; // 0-1
  
  // Database lineage match inputs
  geneticAlignment: number; // 0-1
  hasLineageData: boolean;
  lineageMatchStrength?: number; // 0-1
  
  // Clone/variant agreement inputs
  hasCloneDetection?: boolean;
  cloneAgreement?: number; // 0-1
  variantAgreement?: number; // 0-1
  hasDisambiguation?: boolean;
  
  // Current confidence (before capping)
  currentConfidence: number; // 0-100
}): ConfidenceSourceResult {
  const {
    imageCount,
    uniqueAngles,
    angleDiversityScore,
    distanceDiversity,
    visualAlignment,
    visualClarity,
    visualConsensusScore,
    imagesWithName,
    hasDatabaseMatch,
    nameFrequency,
    geneticAlignment,
    hasLineageData,
    lineageMatchStrength,
    hasCloneDetection,
    cloneAgreement,
    variantAgreement,
    hasDisambiguation,
    currentConfidence,
  } = args;
  
  // Calculate all 5 signals
  const signals: ConfidenceSourceSignals = {
    imageDiversity: calculateImageDiversitySignal({
      imageCount,
      uniqueAngles: uniqueAngles ?? 1,
      angleDiversityScore,
      distanceDiversity,
    }),
    visualFeatureStrength: calculateVisualFeatureStrengthSignal({
      visualAlignment,
      visualClarity,
      visualConsensusScore,
    }),
    nameConsensusFrequency: calculateNameConsensusFrequencySignal({
      imageCount,
      imagesWithName: imagesWithName ?? imageCount,
      hasDatabaseMatch,
      nameFrequency,
    }),
    databaseLineageMatch: calculateDatabaseLineageMatchSignal({
      geneticAlignment,
      hasLineageData,
      lineageMatchStrength,
    }),
    cloneVariantAgreement: calculateCloneVariantAgreementSignal({
      hasCloneDetection: hasCloneDetection ?? false,
      cloneAgreement,
      variantAgreement,
      hasDisambiguation: hasDisambiguation ?? false,
    }),
  };
  
  // Phase 5.3.2 — Lowest signal caps final score
  const signalValues = Object.values(signals);
  const lowestSignal = Math.min(...signalValues);
  
  // Find which signal is lowest
  const signalNames: (keyof ConfidenceSourceSignals)[] = [
    "imageDiversity",
    "visualFeatureStrength",
    "nameConsensusFrequency",
    "databaseLineageMatch",
    "cloneVariantAgreement",
  ];
  const lowestSignalIndex = signalValues.indexOf(lowestSignal);
  const lowestSignalName = signalNames[lowestSignalIndex];
  
  // Cap confidence by lowest signal (convert signal 0-1 to 0-100, then cap)
  const lowestSignalPercent = lowestSignal * 100;
  const cappedConfidence = Math.min(currentConfidence, lowestSignalPercent);
  
  // Generate explanation
  const signalLabels: Record<keyof ConfidenceSourceSignals, string> = {
    imageDiversity: "image diversity",
    visualFeatureStrength: "visual feature strength",
    nameConsensusFrequency: "name consensus",
    databaseLineageMatch: "database lineage match",
    cloneVariantAgreement: "clone/variant agreement",
  };
  
  const explanation = `Confidence capped by ${signalLabels[lowestSignalName]} (${Math.round(lowestSignal * 100)}%)`;
  
  return {
    signals,
    lowestSignal,
    lowestSignalName,
    cappedConfidence,
    explanation,
  };
}
