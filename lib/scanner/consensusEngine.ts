// lib/scanner/consensusEngine.ts
// Phase 2.7 Part N — Multi-Image Consensus Matching

import type { WikiResult } from "./types";
import type { FusedFeatures } from "./multiImageFusion";
import { computeImageSimilarity } from "./duplicateImageDetection";
import type { StrainMatch } from "./nameFirstMatcher";
import { matchStrainNameFirst } from "./nameFirstMatcher";
import { determineStrainName } from "./namingHierarchy";
import { assignImageWeights, applyQualityWeights, type ImageWeight } from "./imageWeighting";
import { adjustConsensusWeight } from "./consensusWeights";

export type ImageAngle = "top" | "side" | "macro";

export type MultiImageScanInput = {
  images: File[]; // Actual image files
  angles?: ImageAngle[]; // Optional angle hints
};

// Phase 3.0 Part B — Per-Image Analysis
export type CandidateStrain = {
  name: string;
  confidence: number;
  traitsMatched: string[];
};

export type ImageObservation = { // Phase 3.1 Part A — Image type classification
  imageType: "plant" | "bud" | "macro" | "unknown";
  confidence: number;
};

export type ImageResult = {
  imageIndex: number;
  candidateStrains: CandidateStrain[]; // Phase 3.0 Part B — Multiple candidates per image
  detectedTraits: {
    budStructure?: "low" | "medium" | "high";
    trichomeDensity?: "low" | "medium" | "high";
    pistilColor?: string;
    leafShape?: "narrow" | "broad";
  };
  uncertaintySignals: string[];
  wikiResult: WikiResult;
  imageObservation?: ImageObservation; // Phase 3.1 Part A — Image type classification
  imageHash?: string; // Phase 4.0.1 — Hash for diversity checking
  diversityPenalty?: number; // Phase 4.0.2 — Penalty applied due to similarity with other images
  embedding?: number[]; // Phase 4.0.4 — Visual embedding for duplicate detection
  meta?: { // Phase 4.0.3 — Image metadata for angle inference
    width: number;
    height: number;
    focusScore: number;
    edgeDensity: number;
  };
  inferredAngle?: "macro-bud" | "side-profile" | "top-canopy" | "unknown"; // Phase 4.0.3 — Inferred image angle
  qualityScores?: import("./imageQualityScoring").ImageQualityScores; // STEP 5.5.1 — Silent quality scores (not shown to users)
};

// Legacy type (keep for backward compat)
export type ImageScanResult = {
  imageIndex: number;
  strainCandidate: string;
  confidenceScore: number;
  keyTraits: string[];
  wikiResult: WikiResult;
};

// Phase 3.0 Part C — Consensus Merge
export type ConsensusResult = {
  primaryMatch: {
    name: string;
    confidence: number; // Phase 3.0 Part D — 80-99% calibrated
    reason: string;
  };
  alternates: Array<{
    name: string;
    confidence: number;
  }>;
  agreementScore: number; // Phase 3.0 Part C — 0-100
  strainName: string; // Legacy (use primaryMatch.name)
  confidenceRange: { min: number; max: number; explanation: string }; // Legacy
  whyThisMatch: string; // Legacy (use primaryMatch.reason)
  alternateMatches: Array<{
    name: string;
    whyNotPrimary: string;
  }>; // Legacy
  lowConfidence: boolean; // Legacy
  agreementLevel: "high" | "medium" | "low"; // Legacy
  notes?: string[]; // Phase 4.0.4 — Analysis notes (e.g., low diversity warnings)
};

/**
 * Phase 3.0 Part B — Per-Image Analysis (Enhanced)
 * Run wiki engine independently for each image
 * Returns ImageResult[] with candidateStrains[] array
 */
export async function analyzePerImageV3(
  images: File[],
  imageCount: number
): Promise<ImageResult[]> {
  const { analyzeImage } = await import("./imageAnalysis");
  const results: ImageResult[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const result = await analyzeImage(image, i, imageCount);
    results.push(result);
  }

  return results;
}

/**
 * Phase 2.7 Part N Step 2 — Per-Image Analysis (Legacy)
 * Run wiki engine independently for each image
 */
export async function analyzePerImage(
  images: File[],
  imageCount: number
): Promise<ImageScanResult[]> {
  const results: ImageScanResult[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    // Run wiki engine for this image
    const wikiResult = await import("./wikiEngine").then(m => 
      m.runWikiEngine(image, imageCount)
    );

    // Extract strain candidate and confidence
    const strainCandidate = wikiResult.identity.strainName || "Closest Known Cultivar";
    const confidenceScore = wikiResult.identity.confidence || 60;

    // Extract key traits
    const keyTraits: string[] = [];
    if (wikiResult.morphology.budStructure) {
      keyTraits.push(wikiResult.morphology.budStructure);
    }
    if (wikiResult.morphology.trichomes) {
      keyTraits.push(wikiResult.morphology.trichomes);
    }
    if (wikiResult.genetics.dominance) {
      keyTraits.push(wikiResult.genetics.dominance);
    }

    results.push({
      imageIndex: i,
      strainCandidate,
      confidenceScore,
      keyTraits,
      wikiResult,
    });
  }

  return results;
}

/**
 * Phase 3.0 Part C — Consensus Merge Engine
 * Build consensus result from multiple image results
 * Enhanced version with overlap detection and trait alignment
 */
export function buildConsensusResultV3(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number,
  samePlantLikely: boolean = false
): ConsensusResult {
  if (imageResults.length === 0) {
    throw new Error("No image results provided for consensus");
  }

  // Phase 4.0.3 — Angle-aware confidence weighting
  const angleWeights: Record<string, number> = {
    "macro-bud": 1.15,
    "side-profile": 1.0,
    "top-canopy": 0.9,
    "unknown": 0.85,
  };

  // Phase 3.7 Part C — Image Weighting Logic
  const imageWeights = assignImageWeights(imageCount);
  const adjustedWeights = applyQualityWeights(imageWeights, imageResults);
  console.log("Phase 3.7 Part C — Image weights:", Array.from(adjustedWeights.entries()).map(([idx, w]) => 
    `Image ${idx}: ${(w.finalWeight * 100).toFixed(1)}% (base: ${(w.baseWeight * 100).toFixed(0)}%, quality: ${(w.qualityMultiplier * 100).toFixed(0)}%, issues: ${w.qualityIssues.join(", ") || "none"})`
  ));

  // Phase 3.1 Part D — Track image types for diversity bonus
  const imageTypes = imageResults.map(r => r.imageObservation?.imageType || "unknown");
  const uniqueImageTypes = new Set(imageTypes.filter(t => t !== "unknown"));
  const hasTypeDiversity = uniqueImageTypes.size > 1;
  console.log(`Image types: ${imageTypes.join(", ")}, Diversity: ${hasTypeDiversity}`);

  // Phase 3.0 Part C — Identify overlapping strain names across images
  // Phase 3.1 Part D — Also track image types per strain
  const strainAggregates = new Map<string, {
    appearances: number;
    totalConfidence: number;
    traitMatches: Set<string>;
    imageIndices: number[];
    imageTypes: Set<string>; // Phase 3.1 Part D — Track which image types agreed
  }>();

  imageResults.forEach((result, idx) => {
    const imageType = result.imageObservation?.imageType || "unknown";
    // Phase 4.0.2 — Use diversity-adjusted confidence
    const weightedCandidates = result.candidateStrains.map(c => ({
      ...c,
      weightedScore: c.confidence * (result.diversityPenalty ?? 1),
    }));
    weightedCandidates.forEach(candidate => {
      const existing = strainAggregates.get(candidate.name) || {
        appearances: 0,
        totalConfidence: 0,
        traitMatches: new Set<string>(),
        imageIndices: [],
        imageTypes: new Set<string>(), // Phase 3.1 Part D
      };
      existing.appearances++;
      existing.totalConfidence += candidate.weightedScore;
      candidate.traitsMatched.forEach(trait => existing.traitMatches.add(trait));
      existing.imageIndices.push(idx);
      existing.imageTypes.add(imageType); // Phase 3.1 Part D — Track image type
      strainAggregates.set(candidate.name, existing);
    });
  });

  // Phase 3.0 Part C — Boost confidence when same strain appears in ≥2 images
  // Calculate agreement score based on overlap
  let primaryMatch: { name: string; confidence: number; reason: string } | null = null;
  let maxScore = 0;
  let agreementScore = 0;

  strainAggregates.forEach((data, strainName) => {
    // Phase 3.7 Part C — Use weighted average confidence
    const avgConfidence = data.totalConfidence / data.appearances;
    let score = avgConfidence;

    // Phase 3.7 Part D — Promote strains that appear across images
    // Phase 3.7 Part D — Penalize one-off matches more strongly
    if (data.appearances >= 2) {
      // Phase 3.7 Part D — Stronger boost for cross-image agreement
      let agreementBonus = (data.appearances - 1) * 15; // +15% per additional agreeing image (increased from 12%)
      // Phase 4.1.9 — Adjust consensus weight if same-plant detected
      agreementBonus = adjustConsensusWeight({
        baseWeight: agreementBonus,
        samePlantLikely,
      });
      score += agreementBonus;
      agreementScore = Math.max(agreementScore, Math.round((data.appearances / imageCount) * 100));
    } else {
      // Phase 3.7 Part D — Penalize one-off matches (only appear in 1 image)
      const oneOffPenalty = 10; // -10% penalty for single-image matches
      score -= oneOffPenalty;
      console.log(`Phase 3.7 Part D — One-off match penalty: ${strainName} (-${oneOffPenalty}%)`);
    }

    // Phase 3.0 Part C — Boost when traits align
    const traitAlignmentBonus = data.traitMatches.size * 2; // +2% per unique matched trait
    score += traitAlignmentBonus;

    // Phase 3.1 Part D — Boost when agreeing traits come from DIFFERENT image types
    // Example: Plant structure + bud trichomes = strong match
    if (data.imageTypes.size > 1) {
      const typeDiversityBonus = (data.imageTypes.size - 1) * 8; // +8% per additional unique image type
      score += typeDiversityBonus;
      console.log(`Strain ${strainName}: ${data.imageTypes.size} different image types agree (+${typeDiversityBonus}%)`);
    }

    // Phase 3.0 Part C — Penalize when images disagree (variance in traits)
    const variancePenalty = calculateTraitVariance(imageResults, strainName, data.imageIndices) * 0.5;
    score -= variancePenalty;

    if (score > maxScore) {
      maxScore = score;
      const appearances = data.appearances;
      const typeDiversity = data.imageTypes.size > 1;
      
      // Phase 3.1 Part D — Enhanced reason with image type diversity
      let reason = "";
      if (appearances >= 2) {
        if (typeDiversity) {
          reason = `${appearances} out of ${imageCount} images (${Array.from(data.imageTypes).join(", ")}) identified this strain, with ${data.traitMatches.size} matching traits across different perspectives`;
        } else {
          reason = `${appearances} out of ${imageCount} images identified this strain, with ${data.traitMatches.size} matching traits`;
        }
      } else {
        reason = `Best match based on visual analysis with ${data.traitMatches.size} matching traits`;
      }
      
      primaryMatch = {
        name: strainName,
        confidence: Math.round(Math.max(80, Math.min(99, score))), // Phase 3.0 Part D — 80-99% range
        reason,
      };
    }
  });

  // Phase 3.5 Part A — Naming Hierarchy: Always return a result, never fail silently
  // Phase 3.5 Part A — Never return "Unknown" unless truly impossible
  if (!primaryMatch) {
    // Phase 4.0.2 — Use diversity-adjusted confidence
    const topResult = imageResults[0];
    const topCandidate = topResult?.candidateStrains[0];
    if (topCandidate && topCandidate.name && topCandidate.name !== "Unknown") {
      const weightedConfidence = topCandidate.confidence * (topResult.diversityPenalty ?? 1);
      primaryMatch = {
        name: topCandidate.name,
        confidence: Math.min(82, weightedConfidence), // Phase 4.0 Part D — 1 image cap at 82%
        reason: "Best match based on visual analysis",
      };
    } else {
      // Phase 3.5 Part A — Use naming hierarchy for fallback (never "Unknown")
      // Phase 4.0.2 — Use diversity-adjusted confidence
      // Phase 4.0.3 — Apply angle-aware weighting
      const weightedCandidates = imageResults.flatMap(r => {
        const penalty = r.diversityPenalty ?? 1;
        const angleWeight = angleWeights[r.inferredAngle ?? "unknown"] ?? 1;
        return r.candidateStrains.map(c => ({
          name: c.name,
          confidence: c.confidence * penalty * angleWeight,
        }));
      });
      const namingResult = determineStrainName(
        fusedFeatures,
        imageCount,
        weightedCandidates
      );
      
      primaryMatch = {
        name: namingResult.name, // Phase 3.5 Part A — Always a valid name
        confidence: Math.round((namingResult.confidenceRange.min + namingResult.confidenceRange.max) / 2),
        reason: namingResult.rationale,
      };
      console.warn("Phase 3.5 Part A — Used naming hierarchy fallback due to no consensus candidates");
    }
  }
  
  // Phase 3.5 Part A — Ensure name is never "Unknown", "Unidentified", or empty
  if (
    primaryMatch.name === "Unknown" || 
    primaryMatch.name === "Unidentified" ||
    !primaryMatch.name || 
    primaryMatch.name.trim().length === 0
  ) {
    const namingResult = determineStrainName(fusedFeatures, imageCount);
    primaryMatch.name = namingResult.name;
    primaryMatch.confidence = Math.round((namingResult.confidenceRange.min + namingResult.confidenceRange.max) / 2);
    primaryMatch.reason = namingResult.rationale;
    console.warn("Phase 3.5 Part A — Prevented invalid name, using naming hierarchy");
  }

  // Phase 3.0 Part D — Confidence Calibration
  // Apply caps based on image count
  if (imageCount === 1) {
    primaryMatch.confidence = Math.min(92, primaryMatch.confidence);
  } else if (imageCount === 2 && primaryMatch.confidence > 96) {
    // Check if both images agreed
    const agreementCount = strainAggregates.get(primaryMatch.name)?.appearances || 0;
    if (agreementCount < 2) {
      primaryMatch.confidence = Math.min(92, primaryMatch.confidence);
    } else {
      primaryMatch.confidence = Math.min(96, primaryMatch.confidence);
    }
  } else if (imageCount === 3) {
    const agreementCount = strainAggregates.get(primaryMatch.name)?.appearances || 0;
    if (agreementCount >= 2) {
      primaryMatch.confidence = Math.min(99, primaryMatch.confidence);
    } else {
      primaryMatch.confidence = Math.min(96, primaryMatch.confidence);
    }
  }

  // Build alternates (top 3 other strains)
  const alternates: Array<{ name: string; confidence: number }> = [];
  const sortedStrains = Array.from(strainAggregates.entries())
    .filter(([name]) => name !== primaryMatch.name)
    .sort((a, b) => {
      const scoreA = (a[1].totalConfidence / a[1].appearances) + (a[1].appearances >= 2 ? (a[1].appearances - 1) * 12 : 0);
      const scoreB = (b[1].totalConfidence / b[1].appearances) + (b[1].appearances >= 2 ? (b[1].appearances - 1) * 12 : 0);
      return scoreB - scoreA;
    })
    .slice(0, 3);

  sortedStrains.forEach(([name, data]) => {
    const avgConfidence = data.totalConfidence / data.appearances;
    let altConfidence = avgConfidence;
    if (data.appearances >= 2) {
      altConfidence += (data.appearances - 1) * 12;
    }
    alternates.push({
      name,
      confidence: Math.round(Math.max(60, Math.min(95, altConfidence))),
    });
  });

  // Phase 3.1 Part E — Get primary strain data for agreement score boost
  const primaryStrainDataForAgreement = strainAggregates.get(primaryMatch.name);
  const hasMultiTypeAgreementForAgreement = primaryStrainDataForAgreement && primaryStrainDataForAgreement.imageTypes.size > 1;
  const hasAgreementForAgreement = primaryStrainDataForAgreement && primaryStrainDataForAgreement.appearances >= 2;

  // Phase 3.1 Part E — Update agreement score based on type diversity
  if (hasMultiTypeAgreementForAgreement && hasAgreementForAgreement) {
    agreementScore = Math.min(100, agreementScore + (primaryStrainDataForAgreement.imageTypes.size - 1) * 15);
    console.log(`Phase 3.1 Part E — Agreement score boosted to ${agreementScore}% due to type diversity`);
  }

  // Legacy compatibility
  // Phase 4.0 Part D — Update confidence range caps to match new limits
  const maxAllowed = imageCount === 1 ? 82 : imageCount === 2 ? 90 : imageCount >= 3 ? 99 : 95;
  const confidenceRange = {
    min: Math.max(60, primaryMatch.confidence - 4),
    max: Math.min(maxAllowed, primaryMatch.confidence + 4),
    explanation: hasMultiTypeAgreementForAgreement && hasAgreementForAgreement
      ? `High agreement across ${primaryStrainDataForAgreement.imageTypes.size} different image types`
      : agreementScore >= 80 
      ? "High agreement across multiple images"
      : agreementScore >= 60
      ? "Moderate agreement with some variation"
      : "Lower agreement due to image variation",
  };

  // Phase 4.0.4 — never hard-fail due to similarity
  // Calculate diversity score from image embeddings
  let diversityScore = 1.0; // Default to high diversity
  if (imageResults.length >= 2) {
    const embeddings = imageResults
      .map(r => r.embedding)
      .filter((e): e is number[] => Array.isArray(e) && e.length > 0);
    
    if (embeddings.length >= 2) {
      // Calculate average similarity (lower = more diverse)
      let totalSimilarity = 0;
      let comparisons = 0;
      for (let i = 0; i < embeddings.length; i++) {
        for (let j = i + 1; j < embeddings.length; j++) {
          const sim = computeImageSimilarity(embeddings[i], embeddings[j]);
          totalSimilarity += sim;
          comparisons++;
        }
      }
      // Diversity score is inverse of average similarity (1.0 = completely different, 0.0 = identical)
      diversityScore = comparisons > 0 ? 1.0 - (totalSimilarity / comparisons) : 1.0;
    } else {
      // Fallback: use average diversityPenalty as proxy for diversity
      const avgPenalty = imageResults.reduce((sum, r) => sum + (r.diversityPenalty ?? 1.0), 0) / imageResults.length;
      diversityScore = avgPenalty; // Lower penalty = lower diversity
    }
  }

  // Cap confidence if diversity is low
  let finalConfidence = primaryMatch.confidence;
  const notes: string[] = [];
  
  if (diversityScore < 0.6) {
    finalConfidence = Math.min(finalConfidence, 88);
    notes.push(
      "Images appear visually similar. Accuracy may improve with varied angles."
    );
  }

  // Update primaryMatch with capped confidence
  const adjustedPrimaryMatch = {
    ...primaryMatch,
    confidence: finalConfidence,
  };

  // Determine agreement level
  const agreementLevel: "high" | "medium" | "low" = agreementScore >= 80 ? "high" : agreementScore >= 60 ? "medium" : "low";
  const lowConfidence = adjustedPrimaryMatch.confidence < 70;

  return {
    // Phase 3.0 Part C — New structure
    primaryMatch: adjustedPrimaryMatch,
    alternates,
    agreementScore,
    // Legacy fields
    strainName: adjustedPrimaryMatch.name,
    confidenceRange,
    whyThisMatch: adjustedPrimaryMatch.reason,
    alternateMatches: alternates.map(a => ({
      name: a.name,
      whyNotPrimary: `Confidence: ${a.confidence}% (lower than primary match)`,
    })),
    lowConfidence,
    agreementLevel,
    // Phase 4.0.4 — Include notes for low diversity
    ...(notes.length > 0 && { notes }),
  };
}

/**
 * Calculate trait variance across images for a specific strain
 * Phase 3.0 Part C — Penalize when images disagree
 */
function calculateTraitVariance(
  imageResults: ImageResult[],
  strainName: string,
  imageIndices: number[]
): number {
  if (imageIndices.length <= 1) return 0;

  const relevantResults = imageResults.filter((_, idx) => imageIndices.includes(idx));
  const traitSets = relevantResults.map(r => {
    const candidate = r.candidateStrains.find(c => c.name === strainName);
    return candidate?.traitsMatched || [];
  });

  // Count disagreements
  let disagreements = 0;
  const allTraits = new Set(traitSets.flat());
  allTraits.forEach(trait => {
    const presenceCount = traitSets.filter(ts => ts.includes(trait)).length;
    if (presenceCount > 0 && presenceCount < relevantResults.length) {
      disagreements++; // Trait present in some but not all
    }
  });

  return Math.round((disagreements / allTraits.size) * 100);
}

/**
 * Phase 2.7 Part N Step 3 — Consensus Engine (Legacy)
 * Build consensus result from multiple image scan results
 */
export function buildConsensusResult(
  imageResults: ImageScanResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number
): ConsensusResult {
  if (imageResults.length === 0) {
    throw new Error("No image results provided for consensus");
  }

  // Count strain name matches across images
  const strainCounts = new Map<string, { count: number; totalConfidence: number; traits: Set<string> }>();
  
  imageResults.forEach(result => {
    const name = result.strainCandidate;
    if (name && name !== "Unknown") {
      const existing = strainCounts.get(name) || { count: 0, totalConfidence: 0, traits: new Set<string>() };
      existing.count++;
      existing.totalConfidence += result.confidenceScore;
      result.keyTraits.forEach(trait => existing.traits.add(trait));
      strainCounts.set(name, existing);
    }
  });

  // Phase 2.7 Part N Step 3 — Weight by confidence and count
  // If ≥2 images agree → boost confidence
  // If all differ → choose highest overlap of traits
  
  let primaryStrain = "";
  let maxScore = 0;

  // Score each strain by agreement
  strainCounts.forEach((data, strainName) => {
    const avgConfidence = data.totalConfidence / data.count;
    const agreementBonus = data.count >= 2 ? (data.count - 1) * 10 : 0; // +10% per additional agreeing image
    const score = avgConfidence + agreementBonus;

    if (score > maxScore) {
      maxScore = score;
      primaryStrain = strainName;
    }
  });

  // Determine agreement level based on final primary strain
  let agreementLevel: "high" | "medium" | "low" = "low";
  if (primaryStrain) {
    const primaryData = strainCounts.get(primaryStrain);
    if (primaryData) {
      const agreementRatio = primaryData.count / imageResults.length;
      if (agreementRatio >= 0.8) {
        agreementLevel = "high";
      } else if (primaryData.count >= 2) {
        agreementLevel = "medium";
      } else {
        agreementLevel = "low";
      }
    }
  }

  // If no consensus, use name-first matcher as fallback
  if (!primaryStrain || primaryStrain === "Unknown" || primaryStrain === "Closest Known Cultivar") {
    const nameFirstResult = matchStrainNameFirst(fusedFeatures, imageCount);
    primaryStrain = nameFirstResult.primaryMatch.name;
  }

  // Phase 3.0 Part D — Confidence Calibration
  // 1 image → cap at 92%, 2 images agreeing → up to 96%, 3 images agreeing → up to 99%
  let calibratedConfidence = Math.round(maxScore);
  if (imageCount === 1) {
    calibratedConfidence = Math.min(92, calibratedConfidence);
  } else if (imageCount === 2) {
    const agreementCount = strainCounts.get(primaryStrain)?.count || 0;
    if (agreementCount >= 2) {
      calibratedConfidence = Math.min(96, calibratedConfidence);
    } else {
      calibratedConfidence = Math.min(92, calibratedConfidence);
    }
  } else if (imageCount === 3) {
    const agreementCount = strainCounts.get(primaryStrain)?.count || 0;
    if (agreementCount >= 2) {
      calibratedConfidence = Math.min(99, calibratedConfidence);
    } else {
      calibratedConfidence = Math.min(96, calibratedConfidence);
    }
  }
  
  // Phase 2.7 Part N Step 4 — Confidence Normalization
  // Range format, cap max at 99%, NEVER show 100%
  const baseConfidence = Math.min(99, Math.max(80, calibratedConfidence));
  const rangeWidth = agreementLevel === "high" ? 4 : agreementLevel === "medium" ? 6 : 8;
  const confidenceMin = Math.max(80, baseConfidence - Math.floor(rangeWidth / 2));
  const confidenceMax = Math.min(99, baseConfidence + Math.ceil(rangeWidth / 2));

  // Phase 2.7 Part N Step 6 — Fallback Rule
  const lowConfidence = confidenceMax < 70;

  // Generate why this match explanation
  const agreeingImages = imageResults.filter(r => r.strainCandidate === primaryStrain).length;
  let whyThisMatch = "";
  if (agreeingImages >= 2) {
    whyThisMatch = `${agreeingImages} out of ${imageResults.length} images identified this as ${primaryStrain}. `;
    whyThisMatch += `Visual traits including ${Array.from(strainCounts.get(primaryStrain)?.traits || []).slice(0, 3).join(", ")} showed consistent agreement.`;
  } else {
    whyThisMatch = `Based on fused visual features across ${imageResults.length} images, ${primaryStrain} best matches the observed morphology. `;
    whyThisMatch += `While images showed some variation, the dominant traits consistently pointed to this cultivar.`;
  }

  // Get alternate matches (other strains that appeared)
  const alternateMatches: Array<{ name: string; whyNotPrimary: string }> = [];
  const sortedStrains = Array.from(strainCounts.entries())
    .sort((a, b) => {
      const scoreA = (a[1].totalConfidence / a[1].count) + (a[1].count >= 2 ? (a[1].count - 1) * 10 : 0);
      const scoreB = (b[1].totalConfidence / b[1].count) + (b[1].count >= 2 ? (b[1].count - 1) * 10 : 0);
      return scoreB - scoreA;
    })
    .filter(([name]) => name !== primaryStrain)
    .slice(0, 3);

  sortedStrains.forEach(([name, data]) => {
    const count = data.count;
    const whyNot = count === 1 
      ? "Only appeared in one image"
      : `Appeared in ${count} images but with lower confidence`;
    alternateMatches.push({ name, whyNotPrimary: whyNot });
  });

  // If we don't have enough alternates, use name-first matcher
  if (alternateMatches.length < 2) {
    const nameFirstResult = matchStrainNameFirst(fusedFeatures, imageCount);
    nameFirstResult.alsoSimilar.slice(0, 2 - alternateMatches.length).forEach(alt => {
      if (!alternateMatches.find(a => a.name === alt.name)) {
        alternateMatches.push(alt);
      }
    });
  }

  // Calculate agreement score (0-100)
  const agreementScore = Math.round((agreeingImages / imageResults.length) * 100);
  
  // Phase 3.0 Part D — Apply confidence calibration
  let calibratedConf = Math.round(maxScore);
  if (imageCount === 1) {
    calibratedConf = Math.min(92, calibratedConf);
  } else if (imageCount === 2 && agreeingImages >= 2) {
    calibratedConf = Math.min(96, calibratedConf);
  } else if (imageCount === 3 && agreeingImages >= 2) {
    calibratedConf = Math.min(99, calibratedConf);
  }
  
  // Build primary match
  const primaryMatch = {
    name: primaryStrain,
    confidence: calibratedConf, // Phase 3.0 Part D — Calibrated confidence
    reason: whyThisMatch,
  };

  // Build alternates
  const alternates = alternateMatches.slice(0, 3).map(alt => {
    const altData = strainCounts.get(alt.name);
    const avgConfidence = altData ? altData.totalConfidence / altData.count : 60;
    return {
      name: alt.name,
      confidence: Math.round(avgConfidence),
    };
  });

  return {
    // Phase 3.0 Part C — New structure
    primaryMatch,
    alternates,
    agreementScore,
    // Legacy fields (keep for backward compat)
    strainName: primaryStrain,
    confidenceRange: {
      min: confidenceMin,
      max: confidenceMax,
      explanation: agreementLevel === "high" 
        ? "High agreement across multiple images"
        : agreementLevel === "medium"
        ? "Moderate agreement with some variation"
        : "Lower agreement due to image variation",
    },
    whyThisMatch,
    alternateMatches: alternateMatches.slice(0, 3),
    lowConfidence,
    agreementLevel,
  };
}
