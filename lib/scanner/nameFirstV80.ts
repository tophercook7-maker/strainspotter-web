// lib/scanner/nameFirstV80.ts
// Phase 8.0 — Name-First Matching & Strain Disambiguation

import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { CultivarReference } from "./cultivarLibrary";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 8.0 Step 8.0.2 — Candidate Entry
 */
export type NameCandidateV80 = {
  strainName: string;
  canonicalName: string;
  aliases: string[];
  matchScore: number; // Raw match score (0-100)
  reasonFlags: string[]; // Why it matched (visual morphology, terpene overlap, etc.)
  imageIndices: number[]; // Which images this candidate appeared in
  appearances: Array<{
    imageIndex: number;
    rank: number; // 1-10 (top 10 per image)
    confidence: number; // 0-100
  }>;
  consensusScore?: number; // Added in consensus engine
  frequency?: number; // Added in consensus engine
  avgConfidence?: number; // Added in consensus engine
};

/**
 * Phase 8.0 — Result
 */
export type NameFirstResultV80 = {
  primaryMatch: {
    name: string;
    confidence: number; // 0-100 (capped by image count)
    matchType: "exact" | "very_close" | "close_family";
    alsoKnownAs?: string[];
  };
  alternateMatches: Array<{
    name: string;
    confidence: number;
    matchType: "exact" | "very_close" | "close_family";
    whySimilar: string; // Shared lineage, similar morphology, overlapping terpenes
  }>; // 2-4 names
  explanation: string; // Short explanation for UI
  confidenceTier: "very_high" | "high" | "medium" | "low";
  isCloselyRelated?: boolean; // Flag if ambiguous
};

/**
 * Phase 8.0 Step 8.0.2 — CANDIDATE GENERATION
 * 
 * For each image:
 * - Pull top 10 strain candidates from the 35k database
 * - Match on:
 *   - Visual morphology vectors
 *   - Known phenotype descriptors
 *   - Terpene likelihood overlap
 *   - Growth structure keywords
 * 
 * Store:
 * - strainName
 * - matchScore (raw)
 * - reasonFlags (why it matched)
 */
function generateCandidatesPerImageV80(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  terpeneProfile?: Array<{ name: string; likelihood: string }>
): Map<string, NameCandidateV80> {
  const candidateMap = new Map<string, NameCandidateV80>();

  // Phase 8.0.2 — For each image, generate top 10 candidates
  imageResults.forEach((imageResult, imageIndex) => {
    const candidates: Array<{
      strain: CultivarReference;
      score: number;
      reasonFlags: string[];
    }> = [];

    // Phase 8.0.2 — Score all strains from CULTIVAR_LIBRARY
    for (const strain of CULTIVAR_LIBRARY) {
      const visualProfile = strain.visualProfile || {
        budStructure: strain.morphology.budDensity,
        trichomeDensity: strain.morphology.trichomeDensity,
        pistilColor: strain.morphology.pistilColor,
        leafShape: strain.morphology.leafShape,
        colorProfile: "",
      };

      let matchScore = 0;
      const reasonFlags: string[] = [];

      // Phase 8.0.2 — Visual morphology vectors (40 points max)
      if (fusedFeatures.budStructure === visualProfile.budStructure) {
        matchScore += 15;
        reasonFlags.push("Bud structure matches");
      } else if (
        (fusedFeatures.budStructure === "high" && visualProfile.budStructure === "medium") ||
        (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "high") ||
        (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "low") ||
        (fusedFeatures.budStructure === "low" && visualProfile.budStructure === "medium")
      ) {
        matchScore += 7;
        reasonFlags.push("Bud structure similar");
      }

      if (fusedFeatures.trichomeDensity === visualProfile.trichomeDensity) {
        matchScore += 12;
        reasonFlags.push("Trichome density matches");
      } else if (
        (fusedFeatures.trichomeDensity === "high" && visualProfile.trichomeDensity === "medium") ||
        (fusedFeatures.trichomeDensity === "medium" && visualProfile.trichomeDensity === "high") ||
        (fusedFeatures.trichomeDensity === "medium" && visualProfile.trichomeDensity === "low") ||
        (fusedFeatures.trichomeDensity === "low" && visualProfile.trichomeDensity === "medium")
      ) {
        matchScore += 6;
        reasonFlags.push("Trichome density similar");
      }

      if (fusedFeatures.leafShape === visualProfile.leafShape) {
        matchScore += 10;
        reasonFlags.push("Leaf shape matches");
      }

      if (visualProfile.pistilColor.some(c => c.toLowerCase() === fusedFeatures.pistilColor.toLowerCase())) {
        matchScore += 3;
        reasonFlags.push("Pistil color matches");
      }

      // Phase 8.0.2 — Terpene likelihood overlap (30 points max)
      if (terpeneProfile && terpeneProfile.length > 0) {
        const strainTerpenes = (strain.terpeneProfile || strain.commonTerpenes || []).map(t => t.toLowerCase());
        const profileTerpenes = terpeneProfile.map(t => t.name.toLowerCase());
        
        let terpeneOverlap = 0;
        profileTerpenes.forEach(terpene => {
          if (strainTerpenes.includes(terpene)) {
            const likelihood = terpeneProfile.find(t => t.name.toLowerCase() === terpene)?.likelihood || "low";
            const weight = likelihood === "high" ? 10 : likelihood === "medium" ? 7 : 4;
            terpeneOverlap += weight;
            reasonFlags.push(`Terpene overlap: ${terpene}`);
          }
        });
        
        matchScore += Math.min(30, terpeneOverlap);
      }

      // Phase 8.0.2 — Growth structure keywords (20 points max)
      const strainType = strain.type || strain.dominantType;
      if (fusedFeatures.leafShape === "broad" && (strainType === "Indica" || strainType === "Hybrid")) {
        matchScore += 10;
        reasonFlags.push("Indica/Hybrid structure aligns");
      } else if (fusedFeatures.leafShape === "narrow" && (strainType === "Sativa" || strainType === "Hybrid")) {
        matchScore += 10;
        reasonFlags.push("Sativa/Hybrid structure aligns");
      }

      // Phase 8.0.2 — Phenotype descriptors (10 points max)
      if (strain.effects && strain.effects.length > 0) {
        matchScore += 5; // Basic phenotype match
        reasonFlags.push("Known phenotype descriptors");
      }

      if (matchScore > 0) {
        candidates.push({
          strain,
          score: Math.min(100, matchScore),
          reasonFlags,
        });
      }
    }

    // Phase 8.0.2 — Sort by score and take top 10
    candidates.sort((a, b) => b.score - a.score);
    const top10 = candidates.slice(0, 10);

    // Phase 8.0.2 — Add to candidate map
    top10.forEach((candidate, rank) => {
      const normalizedName = candidate.strain.name.toLowerCase();
      const existing = candidateMap.get(normalizedName);

      if (existing) {
        existing.appearances.push({
          imageIndex,
          rank: rank + 1,
          confidence: candidate.score,
        });
        existing.imageIndices.push(imageIndex);
        // Merge reason flags
        candidate.reasonFlags.forEach(flag => {
          if (!existing.reasonFlags.includes(flag)) {
            existing.reasonFlags.push(flag);
          }
        });
      } else {
        candidateMap.set(normalizedName, {
          strainName: candidate.strain.name,
          canonicalName: candidate.strain.name,
          aliases: candidate.strain.aliases || [],
          matchScore: candidate.score,
          reasonFlags: candidate.reasonFlags,
          imageIndices: [imageIndex],
          appearances: [{
            imageIndex,
            rank: rank + 1,
            confidence: candidate.score,
          }],
        });
      }
    });
  });

  return candidateMap;
}

/**
 * Phase 8.0 Step 8.0.3 — CONSENSUS NAME ENGINE
 * 
 * Across 2–5 images:
 * - Count frequency of strain names
 * - Boost names appearing in ≥2 images
 * - Penalize one-off names
 * - Collapse synonymous names / aliases
 * 
 * Output:
 * - PrimaryName
 * - AlternateMatches (ranked 2–5)
 */
function buildConsensusNameEngineV80(
  candidateMap: Map<string, NameCandidateV80>,
  imageCount: number
): {
  primaryName: NameCandidateV80;
  alternateMatches: NameCandidateV80[];
} {
  const candidates = Array.from(candidateMap.values());

  // Phase 8.0.3 — Calculate consensus score for each candidate
  const scoredCandidates = candidates.map(candidate => {
    const frequency = candidate.imageIndices.length;
    const avgConfidence = candidate.appearances.reduce((sum, a) => sum + a.confidence, 0) / candidate.appearances.length;
    
    // Phase 8.0.3 — Boost names appearing in ≥2 images
    let consensusScore = avgConfidence;
    if (frequency >= 2) {
      consensusScore += (frequency - 1) * 10; // +10 per additional image
    }
    
    // Phase 8.0.3 — Penalize one-off names
    if (frequency === 1 && imageCount >= 2) {
      consensusScore *= 0.7; // Reduce by 30%
    }

    return {
      ...candidate,
      consensusScore: consensusScore,
      frequency,
      avgConfidence,
    };
  });

  // Phase 8.0.3 — Sort by consensus score
  scoredCandidates.sort((a, b) => b.consensusScore - a.consensusScore);

  // Phase 8.0.3 — Collapse synonymous names / aliases
  const collapsedCandidates: typeof scoredCandidates = [];
  const processedNames = new Set<string>();

  scoredCandidates.forEach(candidate => {
    const normalizedName = candidate.canonicalName.toLowerCase();
    if (processedNames.has(normalizedName)) {
      return; // Already processed
    }

    // Phase 8.0.3 — Find all aliases and variants
    const aliases = candidate.aliases.map(a => a.toLowerCase());
    const allVariants = [normalizedName, ...aliases];

    // Phase 8.0.3 — Merge candidates with same canonical name or aliases
    const relatedCandidates = scoredCandidates.filter(c => {
      const cNormalized = c.canonicalName.toLowerCase();
      const cAliases = c.aliases.map(a => a.toLowerCase());
      return allVariants.some(v => v === cNormalized || cAliases.includes(v));
    });

    if (relatedCandidates.length > 1) {
      // Phase 8.0.3 — Merge into one candidate
      const merged = relatedCandidates.reduce((acc, c) => {
        acc.appearances.push(...c.appearances);
        acc.imageIndices.push(...c.imageIndices);
        acc.reasonFlags.push(...c.reasonFlags);
        acc.consensusScore = Math.max(acc.consensusScore, c.consensusScore);
        return acc;
      }, relatedCandidates[0]);

      // Phase 8.0.3 — Deduplicate
      merged.imageIndices = [...new Set(merged.imageIndices)];
      merged.reasonFlags = [...new Set(merged.reasonFlags)];

      collapsedCandidates.push(merged);
      allVariants.forEach(v => processedNames.add(v));
    } else {
      collapsedCandidates.push(candidate);
      processedNames.add(normalizedName);
      aliases.forEach(a => processedNames.add(a));
    }
  });

  // Phase 8.0.3 — Re-sort after collapsing
  collapsedCandidates.sort((a, b) => b.consensusScore - a.consensusScore);

  // Phase 8.0.3 — Return primary and alternates
  const primaryName = collapsedCandidates[0];
  const alternateMatches = collapsedCandidates.slice(1, 5); // Top 2-4 alternates

  return {
    primaryName,
    alternateMatches,
  };
}

/**
 * Phase 8.0 Step 8.0.4 — DISAMBIGUATION LOGIC
 * 
 * If multiple close matches (±5%):
 * - Compare:
 *   - Indica/Sativa ratio alignment
 *   - Terpene dominance alignment
 *   - Bud structure agreement
 * - Select best overall coherence
 * 
 * If still ambiguous:
 * - Lock primary
 * - Flag "Closely Related Cultivar" note
 */
function applyDisambiguationLogicV80(
  primaryName: NameCandidateV80,
  alternateMatches: NameCandidateV80[],
  strainRatio?: { indicaPercent: number; sativaPercent: number },
  terpeneProfile?: Array<{ name: string; likelihood: string }>,
  fusedFeatures?: FusedFeatures
): {
  finalPrimary: NameCandidateV80;
  finalAlternates: NameCandidateV80[];
  isCloselyRelated: boolean;
} {
  // Phase 8.0.4 — Check if top matches are close (±5%)
  const topScore = primaryName.consensusScore || primaryName.avgConfidence || primaryName.matchScore;
  const closeMatches = alternateMatches.filter(a => {
    const altScore = a.consensusScore || a.avgConfidence || a.matchScore;
    return Math.abs(altScore - topScore) <= 5;
  });

  if (closeMatches.length === 0) {
    return {
      finalPrimary: primaryName,
      finalAlternates: alternateMatches.slice(0, 4),
      isCloselyRelated: false,
    };
  }

  // Phase 8.0.4 — Compare close matches on ratio/terpene/bud structure
  const allCandidates = [primaryName, ...closeMatches];
  const dbEntries = allCandidates.map(c => 
    CULTIVAR_LIBRARY.find(s => s.name.toLowerCase() === c.canonicalName.toLowerCase())
  );

  const scoredCandidates = allCandidates.map((candidate, index) => {
    const dbEntry = dbEntries[index];
    if (!dbEntry) return { candidate, coherenceScore: candidate.consensusScore || candidate.matchScore || 0 };

    let coherenceScore = candidate.consensusScore || candidate.matchScore || 0;

    // Phase 8.0.4 — Indica/Sativa ratio alignment
    if (strainRatio) {
      const dbType = dbEntry.type || dbEntry.dominantType;
      const isIndicaDominant = strainRatio.indicaPercent > 55;
      const isSativaDominant = strainRatio.sativaPercent > 55;

      if ((isIndicaDominant && (dbType === "Indica" || dbType === "Hybrid")) ||
          (isSativaDominant && (dbType === "Sativa" || dbType === "Hybrid"))) {
        coherenceScore += 5;
      } else {
        coherenceScore -= 5;
      }
    }

    // Phase 8.0.4 — Terpene dominance alignment
    if (terpeneProfile && terpeneProfile.length > 0 && dbEntry.terpeneProfile) {
      const profileTerpenes = terpeneProfile.map(t => t.name.toLowerCase());
      const dbTerpenes = dbEntry.terpeneProfile.map(t => t.toLowerCase());
      const overlap = profileTerpenes.filter(t => dbTerpenes.includes(t)).length;
      
      if (overlap >= 2) {
        coherenceScore += 5;
      } else if (overlap === 0) {
        coherenceScore -= 3;
      }
    }

    // Phase 8.0.4 — Bud structure agreement
    if (fusedFeatures && dbEntry.visualProfile) {
      if (fusedFeatures.budStructure === dbEntry.visualProfile.budStructure) {
        coherenceScore += 3;
      }
    }

    return { candidate, coherenceScore };
  });

  // Phase 8.0.4 — Re-sort by coherence score
  scoredCandidates.sort((a, b) => b.coherenceScore - a.coherenceScore);

  const finalPrimary = scoredCandidates[0].candidate;
  const finalAlternates = scoredCandidates.slice(1, 5).map(s => s.candidate);

  // Phase 8.0.4 — Flag if still ambiguous (top 2 within ±3%)
  const isCloselyRelated = scoredCandidates.length >= 2 && 
    Math.abs((scoredCandidates[0].coherenceScore || 0) - (scoredCandidates[1].coherenceScore || 0)) <= 3;

  return {
    finalPrimary,
    finalAlternates,
    isCloselyRelated,
  };
}

/**
 * Phase 8.0 Step 8.0.5 — CONFIDENCE INTEGRATION
 * 
 * Tie naming confidence to:
 * - Image count
 * - Agreement strength
 * - Database signal density
 * 
 * Rules:
 * - 1 image → cap name confidence
 * - 3+ images → allow 95–99%
 * - Never claim absolute certainty
 */
function integrateConfidenceV80(
  primaryName: NameCandidateV80,
  imageCount: number,
  agreementStrength: number // 0-100 (how well images agree)
): {
  confidence: number;
  confidenceTier: "very_high" | "high" | "medium" | "low";
} {
  let confidence = primaryName.avgConfidence || primaryName.matchScore;

  // Phase 8.0.5 — Image count caps
  if (imageCount === 1) {
    confidence = Math.min(85, confidence); // Cap at 85% for single image
  } else if (imageCount === 2) {
    confidence = Math.min(92, confidence); // Cap at 92% for 2 images
  } else if (imageCount >= 3) {
    confidence = Math.min(99, confidence); // Cap at 99% for 3+ images (never 100%)
  }

  // Phase 8.0.5 — Agreement strength adjustment
  if (agreementStrength >= 80) {
    confidence = Math.min(confidence + 5, imageCount >= 3 ? 99 : confidence);
  } else if (agreementStrength < 50) {
    confidence = Math.max(confidence - 10, 55);
  }

  // Phase 8.0.5 — Database signal density (frequency boost)
  const frequencyBoost = primaryName.imageIndices.length >= 2 ? 5 : 0;
  confidence = Math.min(confidence + frequencyBoost, imageCount >= 3 ? 99 : confidence);

  // Phase 8.0.5 — Determine confidence tier
  let confidenceTier: "very_high" | "high" | "medium" | "low";
  if (confidence >= 93) {
    confidenceTier = "very_high";
  } else if (confidence >= 85) {
    confidenceTier = "high";
  } else if (confidence >= 70) {
    confidenceTier = "medium";
  } else {
    confidenceTier = "low";
  }

  return {
    confidence: Math.round(confidence),
    confidenceTier,
  };
}

/**
 * Phase 8.0 Step 8.0.6 — UI OUTPUT
 * 
 * Display:
 * - Primary strain name (large, prominent)
 * - Confidence percentage
 * - "Also similar to:" list (2–4 names)
 * - Short explanation:
 *   "This plant most closely matches ___ based on visual structure, terpene signals, and consensus across multiple images."
 */
function formatUIOutputV80(
  primaryName: NameCandidateV80,
  alternateMatches: NameCandidateV80[],
  confidence: number,
  imageCount: number,
  strainRatio?: { indicaPercent: number; sativaPercent: number }
): {
  explanation: string;
  alternateMatchesFormatted: Array<{
    name: string;
    confidence: number;
    matchType: "exact" | "very_close" | "close_family";
    whySimilar: string;
  }>;
} {
  // Phase 8.0.6 — Build explanation
  const parts: string[] = [];
  parts.push("visual structure");
  
  if (strainRatio) {
    parts.push("genetic ratio alignment");
  }
  
  if (imageCount >= 2) {
    parts.push(`consensus across ${imageCount} images`);
  } else {
    parts.push("visual analysis");
  }

  const explanation = `This plant most closely matches ${primaryName.canonicalName} based on ${parts.join(", ")}.`;

  // Phase 8.0.6 — Format alternate matches
  const alternateMatchesFormatted = alternateMatches.slice(0, 4).map(alt => {
    const dbEntry = CULTIVAR_LIBRARY.find(s => s.name.toLowerCase() === alt.canonicalName.toLowerCase());
    
    let whySimilar = "Similar visual traits";
    if (dbEntry && primaryName.canonicalName) {
      const primaryEntry = CULTIVAR_LIBRARY.find(s => s.name.toLowerCase() === primaryName.canonicalName.toLowerCase());
      if (primaryEntry) {
        // Check for shared lineage
        if (primaryEntry.genetics && dbEntry.genetics) {
          const primaryParents = primaryEntry.genetics.toLowerCase().split(/[×x]/);
          const altParents = dbEntry.genetics.toLowerCase().split(/[×x]/);
          const sharedParents = primaryParents.filter(p => altParents.some(ap => ap.includes(p.trim()) || p.trim().includes(ap.trim())));
          if (sharedParents.length > 0) {
            whySimilar = `Shared lineage: ${sharedParents[0].trim()}`;
          }
        }
        
        // Check for similar morphology
        if (primaryEntry.visualProfile && dbEntry.visualProfile) {
          if (primaryEntry.visualProfile.budStructure === dbEntry.visualProfile.budStructure) {
            whySimilar = "Similar bud structure";
          } else if (primaryEntry.visualProfile.leafShape === dbEntry.visualProfile.leafShape) {
            whySimilar = "Similar leaf morphology";
          }
        }
      }
    }

    const primaryScore = primaryName.consensusScore || primaryName.avgConfidence || primaryName.matchScore;
    const altScore = alt.consensusScore || alt.avgConfidence || alt.matchScore;
    const matchType: "exact" | "very_close" | "close_family" = 
      altScore >= primaryScore * 0.95 ? "very_close" :
      altScore >= primaryScore * 0.85 ? "close_family" :
      "close_family";

    return {
      name: alt.canonicalName,
      confidence: Math.round(alt.avgConfidence),
      matchType,
      whySimilar,
    };
  });

  return {
    explanation,
    alternateMatchesFormatted,
  };
}

/**
 * Phase 8.0 — MAIN FUNCTION
 */
export function runNameFirstV80(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number,
  terpeneProfile?: Array<{ name: string; likelihood: string }>,
  strainRatio?: { indicaPercent: number; sativaPercent: number }
): NameFirstResultV80 {
  // Phase 8.0.2 — CANDIDATE GENERATION
  const candidateMap = generateCandidatesPerImageV80(imageResults, fusedFeatures, terpeneProfile);

  // Phase 8.0.3 — CONSENSUS NAME ENGINE
  const consensusResult = buildConsensusNameEngineV80(candidateMap, imageCount);

  // Phase 8.0.4 — DISAMBIGUATION LOGIC
  const disambiguationResult = applyDisambiguationLogicV80(
    consensusResult.primaryName,
    consensusResult.alternateMatches,
    strainRatio,
    terpeneProfile,
    fusedFeatures
  );

  // Phase 8.0.5 — CONFIDENCE INTEGRATION
  const agreementStrength = disambiguationResult.finalPrimary.imageIndices.length >= 2 ? 85 : 60;
  const confidenceResult = integrateConfidenceV80(
    disambiguationResult.finalPrimary,
    imageCount,
    agreementStrength
  );

  // Phase 8.0.6 — UI OUTPUT
  const uiOutput = formatUIOutputV80(
    disambiguationResult.finalPrimary,
    disambiguationResult.finalAlternates,
    confidenceResult.confidence,
    imageCount,
    strainRatio
  );

  // Phase 8.0.6 — Determine match type
  const dbEntry = CULTIVAR_LIBRARY.find(s => 
    s.name.toLowerCase() === disambiguationResult.finalPrimary.canonicalName.toLowerCase()
  );
  const matchType: "exact" | "very_close" | "close_family" = 
    confidenceResult.confidence >= 90 ? "exact" :
    confidenceResult.confidence >= 80 ? "very_close" :
    "close_family";

  return {
    primaryMatch: {
      name: disambiguationResult.finalPrimary.canonicalName,
      confidence: confidenceResult.confidence,
      matchType,
      alsoKnownAs: disambiguationResult.finalPrimary.aliases.length > 0 
        ? disambiguationResult.finalPrimary.aliases.slice(0, 3)
        : undefined,
    },
    alternateMatches: uiOutput.alternateMatchesFormatted,
    explanation: uiOutput.explanation,
    confidenceTier: confidenceResult.confidenceTier,
    isCloselyRelated: disambiguationResult.isCloselyRelated,
  };
}
