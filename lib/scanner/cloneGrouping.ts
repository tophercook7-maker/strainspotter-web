// lib/scanner/cloneGrouping.ts
// STEP 6.0.2 — CLONE GROUPING ENGINE

import { normalizeStrainName } from "./nameNormalization";
import type { NameScoreResult } from "./nameCompetition";
import type { CultivarReference } from "./cultivarLibrary";

export type CloneGroup = {
  rootName: string;
  canonicalName: string; // The best overall name for the group
  variants: string[]; // Original names included in this group
  avgScore: number;
  maxScore: number;
  confidence: number; // 0-1 (clone confidence)
  representativeProfile: CultivarReference;
};

/**
 * Groups candidates into clone groups based on root name, lineage, and morphology.
 */
export function groupClones(
  scoredResults: NameScoreResult[]
): CloneGroup[] {
  const groups = new Map<string, CloneGroup>();

  scoredResults.forEach(result => {
    const rootName = normalizeStrainName(result.strainName);
    
    if (groups.has(rootName)) {
      const group = groups.get(rootName)!;
      group.variants.push(result.strainName);
      group.maxScore = Math.max(group.maxScore, result.totalScore);
      group.avgScore = (group.avgScore * (group.variants.length - 1) + result.totalScore) / group.variants.length;
      
      // If this variant has a higher score, update the representative profile
      if (result.totalScore > group.maxScore) {
        group.representativeProfile = result.strainProfile;
        group.canonicalName = result.strainName;
      }
    } else {
      groups.set(rootName, {
        rootName,
        canonicalName: result.strainName,
        variants: [result.strainName],
        avgScore: result.totalScore,
        maxScore: result.totalScore,
        confidence: result.strainProfile.aliases?.length ? 0.9 : 0.7, // Basic heuristic
        representativeProfile: result.strainProfile,
      });
    }
  });

  // Convert map to array and sort by maxScore
  return Array.from(groups.values()).sort((a, b) => b.maxScore - a.maxScore);
}

/**
 * Calculates similarity between two strain profiles to aid in grouping.
 */
export function calculateProfileSimilarity(
  p1: CultivarReference,
  p2: CultivarReference
): number {
  let score = 0;
  let total = 0;

  // 1. Lineage similarity (if available)
  if (p1.genetics && p2.genetics) {
    const l1 = p1.genetics.toLowerCase();
    const l2 = p2.genetics.toLowerCase();
    if (l1 === l2) score += 40;
    else if (l1.includes(l2) || l2.includes(l1)) score += 20;
    total += 40;
  }

  // 2. Morphology similarity
  if (p1.morphology && p2.morphology) {
    if (p1.morphology.budDensity === p2.morphology.budDensity) score += 20;
    if (p1.morphology.leafShape === p2.morphology.leafShape) score += 20;
    if (p1.morphology.trichomeDensity === p2.morphology.trichomeDensity) score += 20;
    total += 60;
  }

  return total > 0 ? score / total : 0;
}
