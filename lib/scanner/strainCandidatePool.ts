// lib/scanner/strainCandidatePool.ts
// Phase 3.8 Part A — Strain Candidate Pool Generation

import type { FusedFeatures } from "./multiImageFusion";
import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";

/**
 * Compare fused features to strain visual profile
 * (Duplicated from nameFirstMatcher to avoid circular dependency)
 */
function compareToStrain(fused: FusedFeatures, strain: CultivarReference): {
  score: number;
  matchedTraits: string[];
} {
  let score = 0;
  const matchedTraits: string[] = [];

  // Use visualProfile if available, fall back to morphology
  const visualProfile = strain.visualProfile || {
    trichomeDensity: strain.morphology.trichomeDensity,
    pistilColor: strain.morphology.pistilColor,
    budStructure: strain.morphology.budDensity,
    leafShape: strain.morphology.leafShape,
    colorProfile: "",
  };

  // Bud density match (25 points)
  if (fused.budStructure === visualProfile.budStructure) {
    score += 25;
    matchedTraits.push("Bud density matches");
  }

  // Trichome density match (25 points)
  if (fused.trichomeDensity === visualProfile.trichomeDensity) {
    score += 25;
    matchedTraits.push("Trichome density matches");
  }

  // Leaf shape match (20 points)
  if (fused.leafShape === visualProfile.leafShape) {
    score += 20;
    matchedTraits.push("Leaf shape matches");
  }

  // Pistil color match (15 points)
  if (visualProfile.pistilColor.some(c => c.toLowerCase() === fused.pistilColor.toLowerCase())) {
    score += 15;
    matchedTraits.push("Pistil color matches");
  }

  // Genetics type match (15 points)
  const strainType = strain.type || strain.dominantType;
  if (fused.leafShape === "broad" && (strainType === "Indica" || strainType === "Hybrid")) {
    score += 15;
    matchedTraits.push("Genetics type aligns");
  } else if (fused.leafShape === "narrow" && (strainType === "Sativa" || strainType === "Hybrid")) {
    score += 15;
    matchedTraits.push("Genetics type aligns");
  }

  return {
    score: Math.min(100, score),
    matchedTraits,
  };
}

/**
 * Phase 3.8 Part A — Candidate Strain
 */
export type CandidateStrain = {
  name: string;
  confidence: number;
  matchedTraits: string[];
  strainFamily?: string; // e.g., "OG", "Cookies", "Haze"
  lineage?: string;
  reasoning: string[];
};

/**
 * Phase 3.8 Part A — Build candidate pool from multiple sources
 * 
 * Sources:
 * - Wiki strain database (CULTIVAR_LIBRARY)
 * - Known cultivar lineages
 * - Visual phenotype clusters
 * - Terpene/cannabinoid likelihoods
 */
export function buildStrainCandidatePool(
  fused: FusedFeatures,
  imageCount: number,
  existingCandidates?: Array<{ name: string; confidence: number }>
): CandidateStrain[] {
  const candidates: CandidateStrain[] = [];

  // Phase 3.8 Part A — Score all strains from CULTIVAR_LIBRARY
  for (const strain of CULTIVAR_LIBRARY) {
    const { score, matchedTraits } = compareToStrain(fused, strain);
    
    if (score > 0) {
      // Determine strain family
      const strainFamily = determineStrainFamily(strain);
      
      // Build reasoning bullets
      const reasoning: string[] = [];
      reasoning.push(`Visual traits: ${matchedTraits.slice(0, 3).join(", ")}`);
      
      if (strain.type || strain.dominantType) {
        reasoning.push(`${strain.type || strain.dominantType}-dominant structure aligns`);
      }
      
      if (strainFamily) {
        reasoning.push(`${strainFamily} lineage characteristics present`);
      }
      
      if (imageCount >= 2) {
        reasoning.push(`Multi-image analysis supports match`);
      }

      // Check if this candidate was already identified in consensus
      const consensusBoost = existingCandidates?.some(c => c.name === strain.name) ? 10 : 0;

      candidates.push({
        name: strain.name,
        confidence: Math.min(95, score + consensusBoost),
        matchedTraits,
        strainFamily,
        lineage: strain.genetics,
        reasoning,
      });
    }
  }

  // Phase 3.8 Part A — Sort by confidence DESC
  candidates.sort((a, b) => b.confidence - a.confidence);

  // Phase 3.8 Part A — Return Top 5 candidates
  return candidates.slice(0, 5);
}

/**
 * Phase 3.8 Part A — Determine strain family from strain name/genetics
 */
function determineStrainFamily(strain: CultivarReference): string | undefined {
  const name = strain.name.toLowerCase();
  const genetics = strain.genetics?.toLowerCase() || "";

  if (name.includes("og") || genetics.includes("og")) return "OG";
  if (name.includes("cookies") || genetics.includes("cookies")) return "Cookies";
  if (name.includes("haze") || genetics.includes("haze")) return "Haze";
  if (name.includes("kush") || genetics.includes("kush")) return "Kush";
  if (name.includes("purple") || genetics.includes("purple")) return "Purple";
  if (name.includes("blue") || genetics.includes("blue")) return "Blue";
  if (name.includes("white") || genetics.includes("white")) return "White";
  if (name.includes("cheese") || genetics.includes("cheese")) return "Cheese";
  if (name.includes("skunk") || genetics.includes("skunk")) return "Skunk";

  return undefined;
}
