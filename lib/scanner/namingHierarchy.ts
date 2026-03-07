// lib/scanner/namingHierarchy.ts
// Phase 3.5 Part A — Naming Hierarchy & Closest Match Engine

import type { FusedFeatures } from "./multiImageFusion";
import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";

/**
 * Phase 3.5 Part B — Compare fused features to strain visual profile
 * Returns similarity score (0-100) and matched traits
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
 * Phase 3.5 Part A — Match Type
 */
export type MatchType = "exact" | "closest_cultivar" | "strain_family";

/**
 * Phase 3.5 Part A — Naming Result
 */
export type NamingResult = {
  name: string;
  matchType: MatchType;
  confidenceRange: { min: number; max: number; explanation: string };
  similarityScore: number; // 0-100
  rationale: string; // One-sentence explanation
  alternateMatches: Array<{
    name: string;
    similarityScore: number;
    whyNotPrimary: string;
  }>;
};

/**
 * Phase 3.5 Part A — Naming Hierarchy
 * 
 * 1. Exact Match - Visual traits strongly align, high overlap
 * 2. Closest Known Cultivar - Common strain with strongest similarity
 * 3. Strain Family - If cultivar-level uncertain, e.g. "OG Kush–type"
 * 
 * NEVER return: "Unknown", "Unidentified", empty name
 */
export function determineStrainName(
  fused: FusedFeatures,
  imageCount: number,
  existingCandidates?: Array<{ name: string; confidence: number }>
): NamingResult {
  // Phase 3.5 Part B — Match Scoring
  // Score all candidates
  const scored: Array<{
    strain: CultivarReference;
    score: number;
    matchedTraits: string[];
  }> = [];

  for (const strain of CULTIVAR_LIBRARY) {
    const { score, matchedTraits } = compareToStrain(fused, strain);
    if (score > 0) {
      scored.push({ strain, score, matchedTraits });
    }
  }

  // Sort by score DESC
  scored.sort((a, b) => b.score - a.score);

  // If we have existing candidates from consensus, prioritize those
  if (existingCandidates && existingCandidates.length > 0) {
    const candidateMap = new Map(existingCandidates.map(c => [c.name, c.confidence]));
    scored.sort((a, b) => {
      const aPriority = candidateMap.has(a.strain.name) ? 100 : 0;
      const bPriority = candidateMap.has(b.strain.name) ? 100 : 0;
      return (bPriority + b.score) - (aPriority + a.score);
    });
  }

  // Phase 3.5 Part A — Determine match type and name
  if (scored.length === 0) {
    // Phase 3.5 Part A — Fallback to strain family (never "Unknown")
    return generateStrainFamilyName(fused, imageCount);
  }

  const topMatch = scored[0];
  const similarityScore = topMatch.score;

  // Phase 3.5 Part A — Determine if it's exact match or closest cultivar
  let matchType: MatchType;
  let name: string;
  let confidenceMin: number;
  let confidenceMax: number;
  let rationale: string;

  if (similarityScore >= 85 && imageCount >= 2) {
    // Phase 3.5 Part A — Exact Match
    matchType = "exact";
    name = topMatch.strain.name;
    confidenceMin = Math.max(80, similarityScore - 5);
    confidenceMax = Math.min(96, similarityScore + 5);
    rationale = `Strong visual alignment with ${name}. ${topMatch.matchedTraits.slice(0, 3).join(", ")} consistently match across ${imageCount} image${imageCount > 1 ? "s" : ""}.`;
  } else if (similarityScore >= 60) {
    // Phase 3.5 Part A — Closest Known Cultivar
    matchType = "closest_cultivar";
    name = topMatch.strain.name;
    confidenceMin = Math.max(60, similarityScore - 8);
    confidenceMax = Math.min(92, similarityScore + 8);
    rationale = `Closest known match: ${name}. Visual characteristics align with ${topMatch.matchedTraits.slice(0, 2).join(" and ")} based on ${imageCount} image${imageCount > 1 ? "s" : ""}.`;
  } else {
    // Phase 3.5 Part A — Strain Family (if similarity is too low for cultivar-level certainty)
    matchType = "strain_family";
    // Determine family from top matches
    const familyName = determineStrainFamily(topMatch.strain, scored.slice(1, 3));
    name = familyName;
    confidenceMin = Math.max(55, similarityScore - 10);
    confidenceMax = Math.min(75, similarityScore + 10);
    rationale = `Most closely related to ${topMatch.strain.name}-type cultivars. Visual traits suggest ${topMatch.strain.type.toLowerCase()}-dominant lineage with similar morphology.`;
  }

  // Phase 3.5 Part D — Honesty Rules: Confidence is a RANGE, not a single %
  // No hard 99-100% unless lab data exists (we don't have lab data, so cap at 96%)
  const explanation = matchType === "exact"
    ? "High visual similarity across multiple images with strong trait alignment"
    : matchType === "closest_cultivar"
    ? "Closest known cultivar match based on visual characteristics"
    : "General strain family classification based on observed traits";

  // Generate alternates
  const alternates = scored.slice(1, 4).map((alt, idx) => {
    const scoreDiff = topMatch.score - alt.score;
    let whyNot = "Lower similarity score";
    if (scoreDiff > 20) {
      whyNot = "Significantly lower trait alignment";
    } else if (scoreDiff > 10) {
      whyNot = "Fewer matching traits";
    } else {
      whyNot = "Slightly lower overall match";
    }
    
    return {
      name: alt.strain.name,
      similarityScore: alt.score,
      whyNotPrimary: whyNot,
    };
  });

  return {
    name,
    matchType,
    confidenceRange: {
      min: confidenceMin,
      max: confidenceMax,
      explanation,
    },
    similarityScore,
    rationale,
    alternateMatches: alternates,
  };
}

/**
 * Phase 3.5 Part A — Generate strain family name when cultivar-level uncertain
 * NEVER returns "Unknown"
 */
function generateStrainFamilyName(
  fused: FusedFeatures,
  imageCount: number
): NamingResult {
  // Determine family based on dominant traits
  const type = fused.leafShape === "broad" ? "Indica" : "Sativa";
  const density = fused.budStructure;
  const trichomeLevel = fused.trichomeDensity;

  // Find closest strain families
  const similarFamilies = CULTIVAR_LIBRARY.filter(s => {
    return (
      (s.type === type || s.dominantType === type) &&
      (s.morphology.budDensity === density || s.visualProfile?.budStructure === density) &&
      (s.morphology.trichomeDensity === trichomeLevel || s.visualProfile?.trichomeDensity === trichomeLevel)
    );
  });

  if (similarFamilies.length > 0) {
    // Use most common family name
    const familyNames = similarFamilies.map(s => {
      // Extract family from name (e.g., "OG Kush" → "OG Kush-type")
      return s.name;
    });
    
    // Group by base name
    const nameCounts = new Map<string, number>();
    familyNames.forEach(name => {
      const base = name.split(/[#\s]/)[0]; // Get base name (before #, space variations)
      nameCounts.set(base, (nameCounts.get(base) || 0) + 1);
    });
    
    const mostCommon = Array.from(nameCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    
    if (mostCommon) {
      return {
        name: `${mostCommon}-type`,
        matchType: "strain_family",
        confidenceRange: {
          min: 55,
          max: 70,
          explanation: "Strain family classification based on visual characteristics",
        },
        similarityScore: 50,
        rationale: `Visual characteristics align with ${mostCommon}-type cultivars. The ${type.toLowerCase()}-dominant structure and ${density} bud density suggest this lineage.`,
        alternateMatches: similarFamilies.slice(1, 3).map(s => ({
          name: s.name,
          similarityScore: 45,
          whyNotPrimary: "Similar family characteristics",
        })),
      };
    }
  }

  // Final fallback: Use type-based generic name
  const genericName = type === "Indica" 
    ? "Indica-dominant Hybrid"
    : type === "Sativa"
    ? "Sativa-dominant Hybrid"
    : "Hybrid Cultivar";

  return {
    name: genericName,
    matchType: "strain_family",
    confidenceRange: {
      min: 50,
      max: 65,
      explanation: "General classification based on observed morphological traits",
    },
    similarityScore: 45,
    rationale: `Visual analysis suggests a ${type.toLowerCase()}-dominant cultivar with ${density} bud structure and ${trichomeLevel} trichome density. More images from different angles would improve identification precision.`,
    alternateMatches: [],
  };
}

/**
 * Phase 3.5 Part A — Determine strain family name from top matches
 */
function determineStrainFamily(
  primary: CultivarReference,
  alternates: Array<{ strain: CultivarReference; score: number }>
): string {
  // Check if alternates share lineage with primary
  const primaryParents = extractParents(primary.genetics);
  
  for (const alt of alternates) {
    const altParents = extractParents(alt.strain.genetics);
    const sharedParents = primaryParents.filter(p => altParents.includes(p));
    
    if (sharedParents.length > 0) {
      // Return family name based on shared parent
      return `${sharedParents[0]}-lineage`;
    }
  }
  
  // Check for common family patterns
  if (primary.name.includes("OG")) {
    return "OG Kush-type";
  }
  if (primary.name.includes("Cookies")) {
    return "Cookies lineage";
  }
  if (primary.name.includes("Haze")) {
    return "Haze-type";
  }
  if (primary.name.includes("Purple")) {
    return "Purple-type";
  }
  
  // Default: use primary name with "-type" suffix
  return `${primary.name}-type`;
}

/**
 * Extract parent strain names from genetics string
 */
function extractParents(genetics: string): string[] {
  const parents: string[] = [];
  const patterns = [
    /([^×x/]+)\s*[×x/]\s*([^×x/]+)/gi,
    /([^×x/]+)\s+and\s+([^×x/]+)/gi,
  ];

  for (const pattern of patterns) {
    const match = genetics.match(pattern);
    if (match) {
      match.forEach(m => {
        const parts = m.split(/[×x/]/).map(p => p.trim());
        parents.push(...parts);
      });
    }
  }

  return parents
    .map(p => p.trim())
    .filter(p => p.length > 0 && !p.toLowerCase().includes("unknown"));
}
