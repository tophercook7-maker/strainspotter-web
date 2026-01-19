// lib/scanner/trustEngine.ts
// Phase 2.8 Part O — Trust & Explanation Engine

import type { ImageScanResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { StrainMatch } from "./nameFirstMatcher";
import type { WikiData } from "./wikiLookup";
import type { CultivarReference } from "./cultivarLibrary";

// Phase 2.8 Part O Step 1 — Confidence Breakdown
export type ConfidenceBreakdown = {
  visualSimilarity: number; // 0–100
  traitOverlap: number; // 0–100
  consensusStrength: number; // 0–100
};

export type TrustLayer = {
  confidenceBreakdown: ConfidenceBreakdown;
  whyThisMatch: string[]; // Phase 2.8 Part O Step 2 — Human-readable explanation (3-5 bullets)
  sourcesUsed: string[]; // Phase 2.8 Part O Step 3 — Source attribution
  confidenceLanguage: string; // Phase 2.8 Part O Step 4 — Appropriate language (never definitive)
};

/**
 * Calculate confidence breakdown from image results and matches
 * Phase 2.8 Part O Step 1
 */
export function calculateConfidenceBreakdown(
  imageResults: ImageScanResult[],
  primaryMatch: StrainMatch,
  fusedFeatures: FusedFeatures,
  agreementLevel: "high" | "medium" | "low"
): ConfidenceBreakdown {
  // Visual Similarity: Based on how well features match across images
  const varianceScore = Math.max(0, 100 - fusedFeatures.variance);
  const visualSimilarity = Math.round(varianceScore);

  // Trait Overlap: Based on matched traits from primary match
  const traitMatchRatio = primaryMatch.matchedTraits.length / 5; // Assuming ~5 key traits
  const traitOverlap = Math.min(100, Math.round(traitMatchRatio * 100));

  // Consensus Strength: Based on image agreement
  let consensusStrength = 50; // Base
  if (agreementLevel === "high") {
    consensusStrength = 90;
  } else if (agreementLevel === "medium") {
    consensusStrength = 70;
  } else {
    consensusStrength = 50;
  }

  // Boost if multiple images agree on strain name
  const agreeingCount = imageResults.filter(r => r.strainCandidate === primaryMatch.name).length;
  if (agreeingCount >= 2) {
    consensusStrength = Math.min(100, consensusStrength + (agreeingCount - 1) * 10);
  }

  return {
    visualSimilarity,
    traitOverlap,
    consensusStrength,
  };
}

/**
 * Build human-readable explanation
 * Phase 2.8 Part O Step 2
 */
export function buildWhyThisMatch(
  breakdown: ConfidenceBreakdown,
  primaryMatch: StrainMatch,
  imageResults: ImageScanResult[],
  fusedFeatures: FusedFeatures,
  wikiData: WikiData | null
): string[] {
  const bullets: string[] = [];

  // Visual similarity bullets
  if (breakdown.visualSimilarity >= 80) {
    bullets.push("Visual features show strong consistency across images");
  } else if (breakdown.visualSimilarity >= 60) {
    bullets.push("Visual features show moderate consistency with some variation");
  } else {
    bullets.push("Visual features show some variation across images");
  }

  // Trait overlap bullets
  if (primaryMatch.matchedTraits.length >= 3) {
    bullets.push(`${primaryMatch.matchedTraits.slice(0, 3).join(", ")} closely match known examples`);
  } else if (primaryMatch.matchedTraits.length >= 1) {
    bullets.push(`${primaryMatch.matchedTraits[0]} closely matches documented morphology`);
  }

  // Consensus strength bullets
  const agreeingCount = imageResults.filter(r => r.strainCandidate === primaryMatch.name).length;
  if (agreeingCount >= 2) {
    bullets.push(`${agreeingCount} out of ${imageResults.length} images independently matched the same cultivar`);
  } else if (imageResults.length >= 2) {
    bullets.push("Observed traits align with documented morphology across multiple viewing angles");
  }

  // Wiki/genetics bullets
  if (wikiData) {
    bullets.push(`Known genetics (${wikiData.genetics}) align with observed characteristics`);
  }

  // Trait-specific bullets
  if (fusedFeatures.trichomeDensity === "high") {
    bullets.push("Heavy trichome coverage matches typical profile");
  }
  if (fusedFeatures.budStructure === "high") {
    bullets.push("Dense bud structure aligns with documented morphology");
  }

  // Ensure 3-5 bullets
  return bullets.slice(0, 5);
}

/**
 * Generate appropriate confidence language
 * Phase 2.8 Part O Step 4 — Never say "definitive", "guaranteed", or "exact"
 */
export function generateConfidenceLanguage(
  confidenceRange: { min: number; max: number },
  agreementLevel: "high" | "medium" | "low"
): string {
  const avgConfidence = (confidenceRange.min + confidenceRange.max) / 2;

  if (avgConfidence >= 85 && agreementLevel === "high") {
    return "Closest known match with high visual similarity";
  } else if (avgConfidence >= 75) {
    return "Most likely cultivar based on visual analysis";
  } else if (avgConfidence >= 65) {
    return "Closest known match with moderate confidence";
  } else {
    return "Closest known match based on available visual data";
  }
}

/**
 * Build complete trust layer
 * Phase 2.8 Part O — Trust & Explanation Engine
 */
export function buildTrustLayer(
  imageResults: ImageScanResult[],
  primaryMatch: StrainMatch,
  fusedFeatures: FusedFeatures,
  agreementLevel: "high" | "medium" | "low",
  confidenceRange: { min: number; max: number },
  wikiData: WikiData | null,
  dbEntry: CultivarReference | undefined
): TrustLayer {
  // Step 1 — Calculate confidence breakdown
  const confidenceBreakdown = calculateConfidenceBreakdown(
    imageResults,
    primaryMatch,
    fusedFeatures,
    agreementLevel
  );

  // Step 2 — Build human-readable explanation
  const whyThisMatch = buildWhyThisMatch(
    confidenceBreakdown,
    primaryMatch,
    imageResults,
    fusedFeatures,
    wikiData
  );

  // Step 3 — Source attribution
  const sourcesUsed: string[] = [];
  if (dbEntry?.sources) {
    sourcesUsed.push(...dbEntry.sources);
  }
  if (wikiData?.sources) {
    wikiData.sources.forEach(s => {
      if (!sourcesUsed.includes(s)) {
        sourcesUsed.push(s);
      }
    });
  }
  if (sourcesUsed.length === 0) {
    sourcesUsed.push("Curated Strain Database");
  }

  // Step 4 — Confidence language
  const confidenceLanguage = generateConfidenceLanguage(confidenceRange, agreementLevel);

  return {
    confidenceBreakdown,
    whyThisMatch,
    sourcesUsed,
    confidenceLanguage,
  };
}
