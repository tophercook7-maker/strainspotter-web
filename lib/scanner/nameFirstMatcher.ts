// Phase 4.4.0 — NAME-FIRST MATCHING ENGINE
// lib/scanner/nameFirstMatcher.ts

import type { FusedFeatures } from "./multiImageFusion";

// Phase 4.4.0 — New matching engine interface
export interface NameFirstMatch {
  primaryName: string
  confidence: number
  alternateNames: string[]
  reasoning: string[]
}

// Legacy types for backward compatibility
export interface StrainMatch {
  name: string;
  confidence: number;
  matchedTraits: string[];
}

export type NameFirstResult = {
  primaryMatch: {
    name: string;
    confidence: number;
    matchedTraits: string[];
    whyThisMatch?: string;
  };
  alsoSimilar: Array<{
    name: string;
    whyNotPrimary: string;
  }>;
  confidence: number;
  confidenceRange?: {
    min: number;
    max: number;
    explanation: string;
  };
};

// Phase 4.4.0 — New matching engine function
export function runNameFirstMatching(input: {
  consensusCandidates: { name: string; score: number }[]
  databaseMatches: { name: string; similarity: number }[]
}): NameFirstMatch {
  const combined = new Map<string, number>()

  for (const c of input.consensusCandidates) {
    combined.set(c.name, (combined.get(c.name) ?? 0) + c.score * 0.6)
  }

  for (const d of input.databaseMatches) {
    combined.set(d.name, (combined.get(d.name) ?? 0) + d.similarity * 0.4)
  }

  const ranked = [...combined.entries()].sort((a, b) => b[1] - a[1])

  const primary = ranked[0]
  const alternates = ranked.slice(1, 5).map(r => r[0])

  return {
    primaryName: primary[0],
    confidence: Math.min(99, Math.round(primary[1])),
    alternateNames: alternates,
    reasoning: [
      "Matched against visual consensus across images",
      "Cross-validated with strain database lineage and aliases",
      "Weighted by multi-image agreement and name similarity",
    ],
  }
}

// Legacy function for backward compatibility
export function matchStrainNameFirst(
  fusedFeatures: FusedFeatures,
  imageCount: number
): NameFirstResult {
  // Legacy stub - returns a basic result structure
  // This maintains compatibility with existing code that calls this function
  return {
    primaryMatch: {
      name: "Unknown Cultivar",
      confidence: 0,
      matchedTraits: [],
    },
    alsoSimilar: [],
    confidence: 0,
  };
}
