// Phase 4.0.4 — NAME TRUST & DISAMBIGUATION LAYER
// lib/scanner/nameTrustV404.ts

/**
 * Phase 4.0.4 — Name Trust Result
 * 
 * Makes the strain name feel earned, stable, and explainable.
 */
export type NameTrustResult = {
  finalName: string;
  trustLevel: "Very High" | "High" | "Medium" | "Low";
  stabilityScore: number; // 0..1
  ambiguity: boolean;
  alternateNames?: string[];
  explanation: string[];
};

/**
 * Phase 4.0.4 — Compute Name Trust V404
 * 
 * Determines name stability, trust level, and ambiguity based on:
 * - Frequency across images
 * - Database match status
 * - Confidence level
 */
export function computeNameTrustV404(args: {
  primaryName: string;
  perImageTopNames: string[]; // top candidate per image
  distinctImageCount: number;
  dbExactMatch: boolean;
  dbAliasMatch: boolean;
  confidencePercent: number;
}): NameTrustResult {
  const {
    primaryName,
    perImageTopNames,
    distinctImageCount,
    dbExactMatch,
    dbAliasMatch,
    confidencePercent,
  } = args;

  // Safety: Never output empty name
  const safeName = primaryName && primaryName.trim() !== "" 
    ? primaryName.trim() 
    : "Closest Known Cultivar";

  // A) Frequency - Count how many times primaryName appears in perImageTopNames
  const nameFrequency = perImageTopNames.filter(name => 
    name && name.trim().toLowerCase() === safeName.toLowerCase()
  ).length;
  
  const stabilityScore = distinctImageCount > 0 
    ? nameFrequency / Math.max(1, distinctImageCount)
    : 1.0; // Single image = full stability

  // B) Trust tiers
  let trustLevel: "Very High" | "High" | "Medium" | "Low";
  
  if (stabilityScore >= 0.75 && dbExactMatch && confidencePercent >= 90) {
    trustLevel = "Very High";
  } else if (stabilityScore >= 0.6 && (dbExactMatch || dbAliasMatch)) {
    trustLevel = "High";
  } else if (stabilityScore >= 0.4) {
    trustLevel = "Medium";
  } else {
    trustLevel = "Low";
  }

  // C) Ambiguity
  const ambiguity = stabilityScore < 0.55 || confidencePercent < 70;

  // D) Alternate names (if ambiguous)
  let alternateNames: string[] | undefined = undefined;
  if (ambiguity) {
    // Count frequency of non-primary names
    const nameCounts = new Map<string, number>();
    perImageTopNames.forEach(name => {
      if (name && name.trim() !== "" && name.trim().toLowerCase() !== safeName.toLowerCase()) {
        const normalized = name.trim();
        nameCounts.set(normalized, (nameCounts.get(normalized) || 0) + 1);
      }
    });

    // Get top 3 most frequent alternate names
    const sortedAlternates = Array.from(nameCounts.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
      .slice(0, 3)
      .map(([name]) => name);

    if (sortedAlternates.length > 0) {
      alternateNames = sortedAlternates;
    }
  }

  // E) Explanation text (plain English)
  const explanation: string[] = [];

  // Frequency explanation
  if (distinctImageCount > 1) {
    explanation.push(
      `Name appears consistently across ${nameFrequency} of ${distinctImageCount} images`
    );
  } else {
    explanation.push("Name identified from single image analysis");
  }

  // Database match explanation
  if (dbExactMatch) {
    explanation.push("Exact database match found");
  } else if (dbAliasMatch) {
    explanation.push("Matched via known alias");
  } else {
    explanation.push("Closest known match from visual analysis");
  }

  // Confidence explanation
  explanation.push("Confidence calibrated using multi-image consensus");

  // Ambiguity explanation
  if (ambiguity) {
    if (stabilityScore < 0.55) {
      explanation.push("Visual signals overlap with related cultivars");
    }
    if (confidencePercent < 70) {
      explanation.push("Lower confidence due to limited visual variance");
    }
  }

  return {
    finalName: safeName,
    trustLevel,
    stabilityScore,
    ambiguity,
    alternateNames,
    explanation,
  };
}
