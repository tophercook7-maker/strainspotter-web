// lib/scanner/nameCompetition.ts
// Phase 4.1 Step 4.1.3 — Name Competition Scoring

import type { StrainShortlist } from "./strainShortlist";
import type { CultivarReference } from "./cultivarLibrary";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";
import type { FusedFeatures } from "./multiImageFusion";

/**
 * Phase 4.1 Step 4.1.3 — Name Score Result
 */
export type NameScoreResult = {
  strainName: string;
  totalScore: number; // 0-100 (sum of all dimension scores)
  scores: {
    visualStructure: number; // 0-30
    trichomeFrost: number; // 0-20
    color: number; // 0-15
    phenotypeVariance: number; // 0-20
    crossImageAgreement: number; // 0-15
  };
  contradictions: string[]; // Contradictions that reduced score
  strainProfile: CultivarReference; // Canonical profile (ground truth)
  shortlistEntry: StrainShortlist; // Original shortlist entry
};

/**
 * Phase 4.1 Step 4.1.2 — Load Strain Truth Profile
 * 
 * FOR EACH strain in shortlist:
 * - Pull canonical profile from CULTIVAR_LIBRARY:
 *   - expectedBudStructure
 *   - trichomeDensityRange
 *   - colorSpectrum
 *   - calyxShape
 *   - knownPhenotypeVariance
 *   - lineage fingerprints
 * 
 * LOCK: This data is read-only "ground truth"
 */
function loadStrainTruthProfile(strainName: string): CultivarReference | null {
  // Phase 4.1 Step 4.1.2 — Find strain in CULTIVAR_LIBRARY
  return CULTIVAR_LIBRARY.find(
    strain => strain.name === strainName || strain.aliases.includes(strainName)
  ) || null;
}

/**
 * Phase 4.1 Step 4.1.3 — Score Visual Structure Match (0-30)
 */
function scoreVisualStructure(
  fused: FusedFeatures,
  profile: CultivarReference
): { score: number; details: string } {
  let score = 0;
  const details: string[] = [];

  const visualProfile = profile.visualProfile || {
    budStructure: profile.morphology.budDensity,
    trichomeDensity: profile.morphology.trichomeDensity,
    pistilColor: profile.morphology.pistilColor,
    leafShape: profile.morphology.leafShape,
    colorProfile: "",
  };

  // Bud structure match (15 points)
  if (fused.budStructure === visualProfile.budStructure) {
    score += 15;
    details.push(`Bud structure matches: ${visualProfile.budStructure}`);
  } else {
    // Partial match (5 points if close)
    if (
      (fused.budStructure === "high" && visualProfile.budStructure === "medium") ||
      (fused.budStructure === "medium" && visualProfile.budStructure === "high") ||
      (fused.budStructure === "medium" && visualProfile.budStructure === "low") ||
      (fused.budStructure === "low" && visualProfile.budStructure === "medium")
    ) {
      score += 5;
      details.push(`Bud structure partially matches: ${fused.budStructure} vs ${visualProfile.budStructure}`);
    }
  }

  // Leaf shape match (15 points)
  if (fused.leafShape === visualProfile.leafShape) {
    score += 15;
    details.push(`Leaf shape matches: ${visualProfile.leafShape}`);
  } else {
    // Partial match based on genetics (5 points)
    const strainType = profile.type || profile.dominantType;
    if (fused.leafShape === "broad" && (strainType === "Indica" || strainType === "Hybrid")) {
      score += 5;
      details.push(`Leaf shape aligns with ${strainType} genetics`);
    } else if (fused.leafShape === "narrow" && (strainType === "Sativa" || strainType === "Hybrid")) {
      score += 5;
      details.push(`Leaf shape aligns with ${strainType} genetics`);
    }
  }

  return { score: Math.min(30, score), details: details.join(", ") };
}

/**
 * Phase 4.1 Step 4.1.3 — Score Trichome & Frost Match (0-20)
 */
function scoreTrichomeFrost(
  fused: FusedFeatures,
  profile: CultivarReference
): { score: number; details: string } {
  let score = 0;
  const details: string[] = [];

  const visualProfile = profile.visualProfile || {
    budStructure: profile.morphology.budDensity,
    trichomeDensity: profile.morphology.trichomeDensity,
    pistilColor: profile.morphology.pistilColor,
    leafShape: profile.morphology.leafShape,
    colorProfile: "",
  };

  // Trichome density match (20 points)
  if (fused.trichomeDensity === visualProfile.trichomeDensity) {
    score += 20;
    details.push(`Trichome density matches: ${visualProfile.trichomeDensity}`);
  } else {
    // Partial match (7 points if close)
    if (
      (fused.trichomeDensity === "high" && visualProfile.trichomeDensity === "medium") ||
      (fused.trichomeDensity === "medium" && visualProfile.trichomeDensity === "high") ||
      (fused.trichomeDensity === "medium" && visualProfile.trichomeDensity === "low") ||
      (fused.trichomeDensity === "low" && visualProfile.trichomeDensity === "medium")
    ) {
      score += 7;
      details.push(`Trichome density partially matches: ${fused.trichomeDensity} vs ${visualProfile.trichomeDensity}`);
    }
  }

  return { score: Math.min(20, score), details: details.join(", ") };
}

/**
 * Phase 4.1 Step 4.1.3 — Score Color Match (0-15)
 */
function scoreColor(
  fused: FusedFeatures,
  profile: CultivarReference
): { score: number; details: string } {
  let score = 0;
  const details: string[] = [];

  const visualProfile = profile.visualProfile || {
    budStructure: profile.morphology.budDensity,
    trichomeDensity: profile.morphology.trichomeDensity,
    pistilColor: profile.morphology.pistilColor,
    leafShape: profile.morphology.leafShape,
    colorProfile: "",
  };

  // Pistil color match (15 points)
  const pistilMatch = visualProfile.pistilColor.some(
    c => c.toLowerCase() === fused.pistilColor.toLowerCase()
  );
  if (pistilMatch) {
    score += 15;
    details.push(`Pistil color matches: ${fused.pistilColor}`);
  } else {
    // Partial match based on color families (5 points)
    const colorFamilies: Record<string, string[]> = {
      orange: ["orange", "amber", "brown"],
      red: ["red", "orange", "pink"],
      white: ["white", "yellow", "cream"],
      purple: ["purple", "pink", "red"],
    };
    const fusedFamily = Object.keys(colorFamilies).find(family =>
      colorFamilies[family].includes(fused.pistilColor.toLowerCase())
    );
    const profileFamily = Object.keys(colorFamilies).find(family =>
      visualProfile.pistilColor.some(c => colorFamilies[family].includes(c.toLowerCase()))
    );
    if (fusedFamily && profileFamily && fusedFamily === profileFamily) {
      score += 5;
      details.push(`Pistil color in same family: ${fusedFamily}`);
    }
  }

  return { score: Math.min(15, score), details: details.join(", ") };
}

/**
 * Phase 4.1 Step 4.1.3 — Score Phenotype Variance Fit (0-20)
 * 
 * RULES:
 * - Allow phenotype variance (do NOT hard-fail)
 * - Score based on how well observed traits fit within known variance range
 */
function scorePhenotypeVariance(
  fused: FusedFeatures,
  profile: CultivarReference,
  shortlistEntry: StrainShortlist
): { score: number; details: string; contradictions: string[] } {
  let score = 20; // Start with full score
  const details: string[] = [];
  const contradictions: string[] = [];

  // Phase 4.1 Step 4.1.3 — Check trait consistency across images
  const allTraits = Array.from(shortlistEntry.perImageTraits.values()).flat();
  const uniqueTraits = new Set(allTraits);

  // If traits are consistent across images, boost score
  if (shortlistEntry.appearancesAcrossImages >= 2) {
    const traitConsistency = uniqueTraits.size / allTraits.length;
    if (traitConsistency > 0.7) {
      details.push(`High trait consistency across ${shortlistEntry.appearancesAcrossImages} images`);
    } else {
      // Some variance is expected (phenotype variation)
      score -= 5;
      contradictions.push(`Trait variation observed across images (phenotype variance)`);
      details.push(`Phenotype variance detected across ${shortlistEntry.appearancesAcrossImages} images`);
    }
  }

  // Check if observed traits align with expected genetics
  const strainType = profile.type || profile.dominantType;
  if (fused.leafShape === "broad" && (strainType === "Indica" || strainType === "Hybrid")) {
    details.push(`Structure aligns with ${strainType} genetics`);
  } else if (fused.leafShape === "narrow" && (strainType === "Sativa" || strainType === "Hybrid")) {
    details.push(`Structure aligns with ${strainType} genetics`);
  } else {
    // Minor penalty for mismatch (phenotype variance allowed)
    score -= 3;
    contradictions.push(`Leaf shape (${fused.leafShape}) doesn't fully align with ${strainType} genetics`);
    details.push(`Minor phenotype variance: ${fused.leafShape} vs expected ${strainType} structure`);
  }

  return {
    score: Math.max(0, Math.min(20, score)),
    details: details.join(", "),
    contradictions,
  };
}

/**
 * Phase 4.1 Step 4.1.3 — Score Cross-Image Agreement Bonus (0-15)
 * 
 * RULES:
 * - Boost strains appearing in ≥2 images
 */
function scoreCrossImageAgreement(
  shortlistEntry: StrainShortlist
): { score: number; details: string } {
  let score = 0;
  const details: string[] = [];

  // Phase 4.1 Step 4.1.3 — Boost for appearing in multiple images
  if (shortlistEntry.appearancesAcrossImages >= 3) {
    score = 15;
    details.push(`Strong agreement: identified in ${shortlistEntry.appearancesAcrossImages} images`);
  } else if (shortlistEntry.appearancesAcrossImages >= 2) {
    score = 10;
    details.push(`Good agreement: identified in ${shortlistEntry.appearancesAcrossImages} images`);
  } else {
    score = 5;
    details.push(`Single image identification`);
  }

  // Bonus for high average confidence
  if (shortlistEntry.avgConfidence >= 85) {
    score += 2;
    details.push(`High average confidence: ${shortlistEntry.avgConfidence.toFixed(0)}%`);
  }

  return { score: Math.min(15, score), details: details.join(", ") };
}

/**
 * Phase 4.1 Step 4.1.3 — Name Competition Scoring
 * 
 * FOR EACH strain:
 * Score across dimensions:
 * - Visual Structure Match (0–30)
 * - Trichome & Frost Match (0–20)
 * - Color Match (0–15)
 * - Phenotype Variance Fit (0–20)
 * - Cross-Image Agreement Bonus (0–15)
 * 
 * RULES:
 * - Penalize contradictions
 * - Boost strains appearing in ≥2 images
 * - Allow phenotype variance (do NOT hard-fail)
 * 
 * OUTPUT: NameScoreResult[] (ranked)
 */
export function scoreNameCompetition(
  shortlist: StrainShortlist[],
  fusedFeatures: FusedFeatures
): NameScoreResult[] {
  const results: NameScoreResult[] = [];

  for (const entry of shortlist) {
    // Phase 4.1 Step 4.1.2 — Load strain truth profile
    const strainProfile = loadStrainTruthProfile(entry.name);
    
    if (!strainProfile) {
      // Skip if strain not found in library
      console.warn(`Phase 4.1 Step 4.1.2 — Strain "${entry.name}" not found in CULTIVAR_LIBRARY, skipping`);
      continue;
    }

    // Phase 4.1 Step 4.1.3 — Score each dimension
    const structureScore = scoreVisualStructure(fusedFeatures, strainProfile);
    const trichomeScore = scoreTrichomeFrost(fusedFeatures, strainProfile);
    const colorScore = scoreColor(fusedFeatures, strainProfile);
    const varianceResult = scorePhenotypeVariance(fusedFeatures, strainProfile, entry);
    const agreementScore = scoreCrossImageAgreement(entry);

    // Phase 4.1 Step 4.1.3 — Calculate total score
    const totalScore = 
      structureScore.score +
      trichomeScore.score +
      colorScore.score +
      varianceResult.score +
      agreementScore.score;

    results.push({
      strainName: entry.name,
      totalScore: Math.min(100, totalScore),
      scores: {
        visualStructure: structureScore.score,
        trichomeFrost: trichomeScore.score,
        color: colorScore.score,
        phenotypeVariance: varianceResult.score,
        crossImageAgreement: agreementScore.score,
      },
      contradictions: varianceResult.contradictions,
      strainProfile,
      shortlistEntry: entry,
    });
  }

  // Phase 4.1 Step 4.1.3 — Sort by total score (desc)
  results.sort((a, b) => b.totalScore - a.totalScore);

  return results;
}
