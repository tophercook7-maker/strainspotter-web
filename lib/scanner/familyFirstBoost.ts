// Phase 4.6.2 — Family-First Confidence Boost
// lib/scanner/familyFirstBoost.ts

import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";
import { getStrainFamily, getSiblingStrains, type StrainFamily } from "./strainFamilyMap";

/**
 * Family-first confidence boost result
 */
export type FamilyFirstResult = {
  useFamilyFirst: boolean;
  familyName: string | null;
  closestStrainInFamily: string | null;
  familyConfidence: number;
  strainRanking: Array<{ name: string; confidence: number; reason: string }>;
  displayFormat: string; // e.g., "OG Kush lineage (closest match: Tahoe OG)"
  explanation: string[];
};

/**
 * Phase 4.6.2 — Apply family-first confidence boost
 * 
 * Rule: If exact strain uncertain but family is strong:
 * - Lock family
 * - Soft-rank strains inside family
 * 
 * Example: "OG Kush lineage (closest match: Tahoe OG)"
 */
export function applyFamilyFirstConfidenceBoost(args: {
  primaryStrainName: string;
  exactStrainConfidence: number;
  candidateStrains?: Array<{ name: string; confidence: number }>;
  imageCount: number;
}): FamilyFirstResult {
  const {
    primaryStrainName,
    exactStrainConfidence,
    candidateStrains = [],
    imageCount,
  } = args;

  // Default: don't use family-first
  const defaultResult: FamilyFirstResult = {
    useFamilyFirst: false,
    familyName: null,
    closestStrainInFamily: null,
    familyConfidence: exactStrainConfidence,
    strainRanking: [],
    displayFormat: primaryStrainName,
    explanation: [],
  };

  // Only apply if exact strain confidence is uncertain (< 75%)
  if (exactStrainConfidence >= 75) {
    return defaultResult;
  }

  // Find family for the primary strain
  const family = getStrainFamily(primaryStrainName);
  if (!family || family.siblingStrains.length < 2) {
    // No family found or family too small
    return defaultResult;
  }

  // Calculate family confidence
  // Family confidence is higher when:
  // - Multiple sibling strains appear in candidates
  // - Visual signals align with family traits
  // - Database has strong lineage data
  
  let familyConfidence = exactStrainConfidence;
  const familyStrainsInCandidates: Array<{ name: string; confidence: number }> = [];
  
  // Check how many family members appear in candidates
  for (const candidate of candidateStrains) {
    if (family.siblingStrains.includes(candidate.name)) {
      familyStrainsInCandidates.push(candidate);
    }
  }

  // Boost family confidence if multiple family members appear
  if (familyStrainsInCandidates.length >= 2) {
    // Multiple family members suggest strong family match
    familyConfidence = Math.min(85, exactStrainConfidence + 15);
  } else if (familyStrainsInCandidates.length === 1) {
    // Single family member, moderate boost
    familyConfidence = Math.min(80, exactStrainConfidence + 10);
  } else {
    // No family members in candidates, but family exists
    // Check if primary strain is in family
    if (family.siblingStrains.includes(primaryStrainName)) {
      // Primary strain is in family, small boost
      familyConfidence = Math.min(78, exactStrainConfidence + 8);
    } else {
      // Primary strain not in family, don't boost
      return defaultResult;
    }
  }

  // Only use family-first if family confidence is significantly higher
  // (at least 5% higher than exact strain confidence)
  if (familyConfidence < exactStrainConfidence + 5) {
    return defaultResult;
  }

  // Soft-rank strains within family
  const strainRanking: Array<{ name: string; confidence: number; reason: string }> = [];
  
  // Start with primary strain (if it's in the family)
  if (family.siblingStrains.includes(primaryStrainName)) {
    strainRanking.push({
      name: primaryStrainName,
      confidence: exactStrainConfidence,
      reason: "Primary match from visual analysis",
    });
  }

  // Add other family members from candidates
  for (const candidate of familyStrainsInCandidates) {
    if (candidate.name !== primaryStrainName) {
      // Slightly lower confidence for other family members
      const candidateConfidence = Math.max(55, candidate.confidence - 5);
      strainRanking.push({
        name: candidate.name,
        confidence: candidateConfidence,
        reason: `Family member with ${candidate.confidence}% visual match`,
      });
    }
  }

  // Add other family members not in candidates (lower confidence)
  for (const sibling of family.siblingStrains) {
    if (sibling !== primaryStrainName && !strainRanking.some(s => s.name === sibling)) {
      // Much lower confidence for family members not in candidates
      const siblingConfidence = Math.max(50, familyConfidence - 20);
      strainRanking.push({
        name: sibling,
        confidence: siblingConfidence,
        reason: "Related family member",
      });
    }
  }

  // Sort by confidence (highest first)
  strainRanking.sort((a, b) => b.confidence - a.confidence);

  // Closest strain is the top-ranked one
  const closestStrainInFamily = strainRanking[0]?.name || primaryStrainName;

  // Build display format: "OG Kush lineage (closest match: Tahoe OG)"
  const displayFormat = `${family.familyName} lineage (closest match: ${closestStrainInFamily})`;

  // Build explanation
  const explanation: string[] = [
    `Strong ${family.familyName} family match detected`,
    `Family confidence: ${familyConfidence}% (vs ${exactStrainConfidence}% for exact strain)`,
    `Found ${familyStrainsInCandidates.length} family member(s) in candidates`,
    `Closest match within family: ${closestStrainInFamily}`,
  ];

  console.log("Phase 4.6.2 — Family-first confidence boost applied:", {
    familyName: family.familyName,
    exactStrainConfidence,
    familyConfidence,
    closestStrainInFamily,
    strainRanking: strainRanking.slice(0, 3), // Top 3
  });

  return {
    useFamilyFirst: true,
    familyName: family.familyName,
    closestStrainInFamily,
    familyConfidence,
    strainRanking,
    displayFormat,
    explanation,
  };
}

/**
 * Get family context for a strain (for UI display)
 */
export function getFamilyContext(strainName: string): {
  familyName: string | null;
  siblingCount: number;
  parentLineage: string[];
} {
  const family = getStrainFamily(strainName);
  if (!family) {
    return {
      familyName: null,
      siblingCount: 0,
      parentLineage: [],
    };
  }

  return {
    familyName: family.familyName,
    siblingCount: family.siblingStrains.length,
    parentLineage: family.parentLineage,
  };
}
