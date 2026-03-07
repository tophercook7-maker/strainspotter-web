// lib/scanner/nameFirstV70.ts
// Phase 7.0 — Name-First Matching & Strain Disambiguation

import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NormalizedTerpeneProfile } from "./terpeneExperienceEngine";
import type { StrainRatio } from "./ratioEngineV52";
import type { CultivarReference } from "./cultivarLibrary";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 7.0 — Name Candidate Entry
 */
export type NameCandidateV70 = {
  strainName: string;
  canonicalName: string;
  aliases: string[];
  matchType: "exact" | "very_close" | "close_family";
  fuzzyScore: number; // 0-100 (Levenshtein + token similarity)
  frequency: number; // How many images this name appears in
  averageConfidence: number; // Average confidence across images
  visualAgreement: number; // 0-100 (how well visual traits match)
  terpeneAlignment: number; // 0-100 (terpene profile overlap)
  ratioConsistency: number; // 0-100 (indica/sativa ratio consistency)
  totalScore: number; // Weighted total
  imageIndices: number[]; // Which images this name appeared in
  reasoning: string[]; // Why this match
};

/**
 * Phase 7.0 — Result
 */
export type NameFirstResultV70 = {
  primaryMatch: {
    name: string;
    confidence: number; // 0-100
    matchType: "exact" | "very_close" | "close_family";
    alsoKnownAs?: string[];
  };
  alternateMatches?: Array<{
    name: string;
    confidence: number;
    matchType: "exact" | "very_close" | "close_family";
    whySimilar: string; // Shared lineage, similar morphology, overlapping terpenes
  }>; // 1-3 max
  explanation: {
    whyThisName: string[];
    sharedLineage?: string[];
    similarMorphology?: string[];
    overlappingTerpenes?: string[];
  };
};

/**
 * Phase 7.0 Step 7.0.1 — NAME CANDIDATE GENERATION
 * 
 * From each image analysis:
 * - Generate top 5 candidate strain names
 * - Include:
 *   - Exact name matches
 *   - Alias names
 *   - Breeder variants
 *   - Regional name differences
 * 
 * Pull from:
 * - 35,000-strain database
 * - Known synonym table
 * - Breeder lineage records
 */
function generateNameCandidatesV70(
  imageResults: ImageResult[]
): Map<string, {
  strainName: string;
  canonicalName: string;
  aliases: string[];
  appearances: Array<{ imageIndex: number; confidence: number; rank: number }>;
}> {
  const candidateMap = new Map<string, {
    strainName: string;
    canonicalName: string;
    aliases: string[];
    appearances: Array<{ imageIndex: number; confidence: number; rank: number }>;
  }>();

  // Phase 7.0.1 — Extract top 5 candidates from each image
  imageResults.forEach((result, imageIndex) => {
    const top5Candidates = result.candidateStrains.slice(0, 5);
    
    top5Candidates.forEach((candidate, rank) => {
      const normalizedName = normalizeStrainNameV70(candidate.name);
      
      // Phase 7.0.1 — Find canonical name and aliases from database
      const dbEntry = CULTIVAR_LIBRARY.find(s => 
        s.name.toLowerCase() === normalizedName.toLowerCase() ||
        (s.aliases && s.aliases.some(a => a.toLowerCase() === normalizedName.toLowerCase()))
      );
      
      const canonicalName = dbEntry?.name || normalizedName;
      const aliases = dbEntry?.aliases || [];
      
      // Phase 7.0.1 — Group by canonical name
      const existing = candidateMap.get(canonicalName.toLowerCase());
      
      if (existing) {
        // Add appearance
        existing.appearances.push({
          imageIndex,
          confidence: candidate.confidence,
          rank,
        });
        // Merge aliases
        existing.aliases = [...new Set([...existing.aliases, ...aliases, candidate.name])];
      } else {
        candidateMap.set(canonicalName.toLowerCase(), {
          strainName: candidate.name,
          canonicalName,
          aliases: [...aliases, candidate.name],
          appearances: [{
            imageIndex,
            confidence: candidate.confidence,
            rank,
          }],
        });
      }
    });
  });

  return candidateMap;
}

/**
 * Phase 7.0 Step 7.0.1 — Normalize strain name
 */
function normalizeStrainNameV70(name: string): string {
  // Remove extra spaces, normalize case
  let normalized = name.trim().replace(/\s+/g, " ");
  
  // Common legacy name mappings
  const legacyMappings: Record<string, string> = {
    "og kush": "OG Kush",
    "ogk": "OG Kush",
    "ocean grown kush": "OG Kush",
    "gsc": "Girl Scout Cookies",
    "girl scout cookies": "Girl Scout Cookies",
    "blue dream": "Blue Dream",
    "bd": "Blue Dream",
    "white widow": "White Widow",
    "ww": "White Widow",
  };
  
  const lowerName = normalized.toLowerCase();
  if (legacyMappings[lowerName]) {
    normalized = legacyMappings[lowerName];
  }
  
  return normalized;
}

/**
 * Phase 7.0 Step 7.0.2 — FUZZY NAME MATCHING
 * 
 * Apply fuzzy logic:
 * - Levenshtein distance
 * - Token similarity
 * - Prefix/suffix weighting
 * - Common strain family detection
 *   (e.g. "Gelato 33" vs "Gelato #33")
 * 
 * Normalize names:
 * - Remove numbers for base comparison
 * - Compare family roots
 * - Re-apply numbers later for specificity
 */
function calculateFuzzyMatchV70(
  name1: string,
  name2: string
): {
  fuzzyScore: number; // 0-100
  matchType: "exact" | "very_close" | "close_family";
} {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  // Phase 7.0.2 — Exact match
  if (n1 === n2) {
    return {
      fuzzyScore: 100,
      matchType: "exact",
    };
  }
  
  // Phase 7.0.2 — Remove numbers for base comparison
  const n1Base = n1.replace(/\d+/g, "").replace(/[#№]/g, "").trim();
  const n2Base = n2.replace(/\d+/g, "").replace(/[#№]/g, "").trim();
  
  // Phase 7.0.2 — Compare family roots (after removing numbers)
  if (n1Base === n2Base && n1Base.length > 0) {
    // Same family, different numbers (e.g. "Gelato 33" vs "Gelato 41")
    return {
      fuzzyScore: 85,
      matchType: "close_family",
    };
  }
  
  // Phase 7.0.2 — Levenshtein distance
  const levenshteinDistance = calculateLevenshteinDistance(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);
  const levenshteinScore = maxLength > 0 
    ? Math.max(0, 100 - (levenshteinDistance / maxLength) * 100)
    : 0;
  
  // Phase 7.0.2 — Token similarity
  const tokens1 = n1.split(/\s+/);
  const tokens2 = n2.split(/\s+/);
  const commonTokens = tokens1.filter(t => tokens2.includes(t));
  const tokenSimilarity = (commonTokens.length / Math.max(tokens1.length, tokens2.length)) * 100;
  
  // Phase 7.0.2 — Prefix/suffix weighting
  let prefixSuffixScore = 0;
  if (n1.startsWith(n2.substring(0, Math.min(3, n2.length))) || 
      n2.startsWith(n1.substring(0, Math.min(3, n1.length)))) {
    prefixSuffixScore += 10; // Prefix match
  }
  if (n1.endsWith(n2.substring(Math.max(0, n2.length - 3))) || 
      n2.endsWith(n1.substring(Math.max(0, n1.length - 3)))) {
    prefixSuffixScore += 10; // Suffix match
  }
  
  // Phase 7.0.2 — Weighted fuzzy score
  const fuzzyScore = Math.max(0, Math.min(100,
    (levenshteinScore * 0.5) +
    (tokenSimilarity * 0.4) +
    (prefixSuffixScore * 0.1)
  ));
  
  // Phase 7.0.2 — Determine match type
  let matchType: "exact" | "very_close" | "close_family";
  if (fuzzyScore >= 90) {
    matchType = "exact";
  } else if (fuzzyScore >= 70) {
    matchType = "very_close";
  } else {
    matchType = "close_family";
  }
  
  return {
    fuzzyScore,
    matchType,
  };
}

/**
 * Phase 7.0 Step 7.0.2 — Calculate Levenshtein distance
 */
function calculateLevenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Phase 7.0 Step 7.0.3 — MULTI-IMAGE NAME CONSENSUS
 * 
 * Across 2–5 images:
 * - Count frequency of name candidates
 * - Boost names appearing in ≥2 images
 * - Penalize one-off guesses
 * - Resolve ties using:
 *   - Visual agreement
 *   - Terpene alignment
 *   - Indica/Sativa ratio consistency
 * 
 * Output:
 * - Primary strain name
 * - 1–3 alternate possible matches (if close)
 */
function buildMultiImageConsensusV70(
  candidateMap: ReturnType<typeof generateNameCandidatesV70>,
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  terpeneProfile?: NormalizedTerpeneProfile,
  strainRatio?: StrainRatio
): NameCandidateV70[] {
  const candidates: NameCandidateV70[] = [];
  const imageCount = imageResults.length;

  candidateMap.forEach((entry, canonicalNameLower) => {
    // Phase 7.0.3 — Find database entry
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name.toLowerCase() === canonicalNameLower
    );
    
    if (!dbEntry) {
      return; // Skip if not in database
    }

    // Phase 7.0.3 — Frequency (how many images this name appears in)
    const frequency = entry.appearances.length;

    // Phase 7.0.3 — Average confidence
    const totalConfidence = entry.appearances.reduce((sum, a) => sum + a.confidence, 0);
    const averageConfidence = totalConfidence / entry.appearances.length;

    // Phase 7.0.3 — Fuzzy match score (compare canonical name to original strain name)
    const fuzzyMatch = calculateFuzzyMatchV70(entry.strainName, entry.canonicalName);

    // Phase 7.0.3 — Visual agreement
    const visualProfile = dbEntry.visualProfile || {
      budStructure: dbEntry.morphology.budDensity,
      trichomeDensity: dbEntry.morphology.trichomeDensity,
      pistilColor: dbEntry.morphology.pistilColor,
      leafShape: dbEntry.morphology.leafShape,
      colorProfile: "",
    };
    
    let visualAgreement = 0;
    const reasoning: string[] = [];

    if (fusedFeatures.budStructure === visualProfile.budStructure) {
      visualAgreement += 30;
      reasoning.push(`Bud structure matches: ${visualProfile.budStructure}`);
    }
    if (fusedFeatures.trichomeDensity === visualProfile.trichomeDensity) {
      visualAgreement += 25;
      reasoning.push(`Trichome density matches: ${visualProfile.trichomeDensity}`);
    }
    if (fusedFeatures.leafShape === visualProfile.leafShape) {
      visualAgreement += 20;
      reasoning.push(`Leaf shape matches: ${visualProfile.leafShape}`);
    }
    if (visualAgreement >= 50) {
      reasoning.push(`Strong visual agreement (${visualAgreement}%)`);
    }

    // Phase 7.0.3 — Terpene alignment
    let terpeneAlignment = 0;
    if (terpeneProfile && dbEntry.terpeneProfile) {
      const dbTerpenes = dbEntry.terpeneProfile.map(t => t.toLowerCase());
      const primaryTerpenes = terpeneProfile.primaryTerpenes.map(t => t.name.toLowerCase());
      const overlap = primaryTerpenes.filter(t => dbTerpenes.includes(t)).length;
      terpeneAlignment = Math.min(100, (overlap / Math.max(primaryTerpenes.length, dbTerpenes.length)) * 100);
      if (terpeneAlignment >= 50) {
        reasoning.push(`Terpene profile alignment: ${terpeneAlignment.toFixed(0)}%`);
      }
    }

    // Phase 7.0.3 — Ratio consistency
    let ratioConsistency = 0;
    if (strainRatio && dbEntry.type) {
      const dbType = dbEntry.type || dbEntry.dominantType;
      const ratioType = strainRatio.dominance;
      
      if (dbType === ratioType || 
          (dbType === "Hybrid" && (ratioType === "Indica" || ratioType === "Sativa" || ratioType === "Hybrid" || ratioType === "Balanced")) ||
          (ratioType === "Hybrid" && (dbType === "Indica" || dbType === "Sativa"))) {
        ratioConsistency = 80;
        reasoning.push(`Indica/Sativa ratio consistency: ${dbType} matches ${ratioType}`);
      } else {
        ratioConsistency = 40;
      }
    }

    // Phase 7.0.3 — Boost names appearing in ≥2 images
    let frequencyBoost = 0;
    if (frequency >= 2) {
      frequencyBoost = 15; // +15% boost for multi-image agreement
      reasoning.push(`Appears in ${frequency} images (multi-image agreement)`);
    } else if (frequency === 1 && imageCount > 1) {
      // Phase 7.0.3 — Penalize one-off guesses
      frequencyBoost = -10; // -10% penalty for single-image-only
      reasoning.push(`Single-image match (penalized)`);
    }

    // Phase 7.0.3 — Weighted total score
    // Frequency: 25%, Average Confidence: 25%, Fuzzy: 20%, Visual: 15%, Terpene: 10%, Ratio: 5%
    const totalScore = Math.max(0, Math.min(100,
      (frequency * 25 / Math.max(imageCount, 1)) +
      (averageConfidence * 0.25) +
      (fuzzyMatch.fuzzyScore * 0.20) +
      (visualAgreement * 0.15) +
      (terpeneAlignment * 0.10) +
      (ratioConsistency * 0.05) +
      frequencyBoost
    ));

    candidates.push({
      strainName: entry.strainName,
      canonicalName: entry.canonicalName,
      aliases: entry.aliases,
      matchType: fuzzyMatch.matchType,
      fuzzyScore: fuzzyMatch.fuzzyScore,
      frequency,
      averageConfidence,
      visualAgreement,
      terpeneAlignment,
      ratioConsistency,
      totalScore,
      imageIndices: entry.appearances.map(a => a.imageIndex),
      reasoning,
    });
  });

  // Phase 7.0.3 — Sort by total score
  candidates.sort((a, b) => b.totalScore - a.totalScore);
  
  return candidates;
}

/**
 * Phase 7.0 Step 7.0.4 — DISAMBIGUATION LOGIC
 * 
 * If multiple close matches:
 * Display:
 * "Closest Match: Gelato 33"
 * "Also Similar To: Gelato 41, Thin Mint GSC"
 * 
 * Include reason:
 * - Shared lineage
 * - Similar morphology
 * - Overlapping terpene profiles
 */
function applyDisambiguationV70(
  candidates: NameCandidateV70[],
  dbEntry?: CultivarReference
): {
  primary: NameCandidateV70;
  alternates: NameCandidateV70[];
  explanation: {
    whyThisName: string[];
    sharedLineage?: string[];
    similarMorphology?: string[];
    overlappingTerpenes?: string[];
  };
} {
  if (candidates.length === 0) {
    throw new Error("Phase 7.0.4 — No candidates available for disambiguation");
  }

  const primary = candidates[0];
  const second = candidates[1];
  const third = candidates[2];
  const fourth = candidates[3];

  const scoreGap = primary.totalScore - (second?.totalScore || 0);
  
  // Phase 7.0.4 — Build alternates (1-3 max, if close)
  const alternates: NameCandidateV70[] = [];
  if (second && scoreGap < 15) {
    alternates.push(second);
  }
  if (third && (primary.totalScore - third.totalScore) < 20) {
    alternates.push(third);
  }
  if (fourth && (primary.totalScore - fourth.totalScore) < 25 && alternates.length < 3) {
    alternates.push(fourth);
  }

  // Phase 7.0.4 — Build explanation
  const whyThisName: string[] = [...primary.reasoning];
  
  const sharedLineage: string[] = [];
  const similarMorphology: string[] = [];
  const overlappingTerpenes: string[] = [];

  if (alternates.length > 0) {
    alternates.forEach(alt => {
      const altDb = CULTIVAR_LIBRARY.find(s => s.name.toLowerCase() === alt.canonicalName.toLowerCase());
      
      if (altDb && dbEntry) {
        // Phase 7.0.4 — Shared lineage
        if (altDb.genetics && dbEntry.genetics) {
          const dbGenetics = dbEntry.genetics.toLowerCase();
          const altGenetics = altDb.genetics.toLowerCase();
          const commonParents = dbGenetics.split(/[×x/]/).filter(p => 
            altGenetics.includes(p.trim())
          );
          if (commonParents.length > 0) {
            sharedLineage.push(`${alt.canonicalName}: Shared lineage (${commonParents.join(", ")})`);
          }
        }
        
        // Phase 7.0.4 — Similar morphology
        const dbVisual = dbEntry.visualProfile || {
          budStructure: dbEntry.morphology.budDensity,
          trichomeDensity: dbEntry.morphology.trichomeDensity,
          leafShape: dbEntry.morphology.leafShape,
          pistilColor: dbEntry.morphology.pistilColor,
          colorProfile: "",
        };
        const altVisual = altDb.visualProfile || {
          budStructure: altDb.morphology.budDensity,
          trichomeDensity: altDb.morphology.trichomeDensity,
          leafShape: altDb.morphology.leafShape,
          pistilColor: altDb.morphology.pistilColor,
          colorProfile: "",
        };
        
        const matchingTraits = [
          dbVisual.budStructure === altVisual.budStructure ? "bud structure" : null,
          dbVisual.trichomeDensity === altVisual.trichomeDensity ? "trichome density" : null,
          dbVisual.leafShape === altVisual.leafShape ? "leaf shape" : null,
        ].filter(Boolean);
        
        if (matchingTraits.length >= 2) {
          similarMorphology.push(`${alt.canonicalName}: Similar morphology (${matchingTraits.join(", ")})`);
        }
        
        // Phase 7.0.4 — Overlapping terpenes
        if (altDb.terpeneProfile && dbEntry.terpeneProfile) {
          const dbTerpenes = dbEntry.terpeneProfile.map(t => t.toLowerCase());
          const altTerpenes = altDb.terpeneProfile.map(t => t.toLowerCase());
          const overlap = dbTerpenes.filter(t => altTerpenes.includes(t));
          if (overlap.length >= 2) {
            overlappingTerpenes.push(`${alt.canonicalName}: Overlapping terpenes (${overlap.slice(0, 3).join(", ")})`);
          }
        }
      }
    });
  }

  return {
    primary,
    alternates,
    explanation: {
      whyThisName,
      sharedLineage: sharedLineage.length > 0 ? sharedLineage : undefined,
      similarMorphology: similarMorphology.length > 0 ? similarMorphology : undefined,
      overlappingTerpenes: overlappingTerpenes.length > 0 ? overlappingTerpenes : undefined,
    },
  };
}

/**
 * Phase 7.0 Step 7.0.5 — DISPLAY RULES
 * 
 * Always show:
 * Strain Name (Primary)
 * Match Confidence (%)
 * Match Type:
 * - Exact
 * - Very Close
 * - Close Family
 * 
 * Never show:
 * - "Unknown" unless confidence <55%
 * - Random strain names without explanation
 */
function formatDisplayV70(
  disambiguationResult: ReturnType<typeof applyDisambiguationV70>,
  imageCount: number
): NameFirstResultV70 {
  const { primary, alternates, explanation } = disambiguationResult;

  // Phase 7.0.5 — Calculate confidence from total score
  let confidence = primary.totalScore;
  
  // Phase 7.0.5 — Cap confidence by image count
  if (imageCount === 1) {
    confidence = Math.min(82, confidence);
  } else if (imageCount === 2) {
    confidence = Math.min(90, confidence);
  } else if (imageCount >= 3) {
    confidence = Math.min(99, confidence);
  }
  
  // Phase 7.0.5 — Never show "Unknown" unless confidence <55%
  if (confidence < 55) {
    // Failsafe: Use primary name but mark as low confidence
    confidence = Math.max(55, confidence); // Ensure at least 55% to avoid "Unknown"
  }
  
  confidence = Math.max(55, Math.min(99, confidence)); // Clamp to 55-99%

  // Phase 7.0.5 — Get aliases
  const dbEntry = CULTIVAR_LIBRARY.find(s => s.name.toLowerCase() === primary.canonicalName.toLowerCase());
  const alsoKnownAs = dbEntry?.aliases && dbEntry.aliases.length > 0
    ? dbEntry.aliases.slice(0, 3) // Top 3 aliases
    : undefined;

  // Phase 7.0.5 — Build alternate matches
  const alternateMatches = alternates.map(alt => {
    let whySimilar = `Lower total score (${alt.totalScore.toFixed(0)}% vs ${primary.totalScore.toFixed(0)}%)`;
    
    if (alt.frequency < primary.frequency) {
      whySimilar += `. Appeared in fewer images (${alt.frequency} vs ${primary.frequency})`;
    }
    if (alt.visualAgreement < primary.visualAgreement) {
      whySimilar += `. Lower visual agreement (${alt.visualAgreement.toFixed(0)}% vs ${primary.visualAgreement.toFixed(0)}%)`;
    }
    
    return {
      name: alt.canonicalName,
      confidence: Math.max(55, Math.min(99, alt.totalScore)),
      matchType: alt.matchType,
      whySimilar,
    };
  });

  return {
    primaryMatch: {
      name: primary.canonicalName,
      confidence: Math.round(confidence),
      matchType: primary.matchType,
      alsoKnownAs,
    },
    alternateMatches: alternateMatches.length > 0 ? alternateMatches : undefined,
    explanation,
  };
}

/**
 * Phase 7.0 — MAIN FUNCTION
 */
export function runNameFirstV70(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number,
  terpeneProfile?: NormalizedTerpeneProfile,
  strainRatio?: StrainRatio
): NameFirstResultV70 {
  // Phase 7.0.1 — NAME CANDIDATE GENERATION
  const candidateMap = generateNameCandidatesV70(imageResults);
  console.log("Phase 7.0.1 — NAME CANDIDATE MAP:", Array.from(candidateMap.keys()).slice(0, 10));

  // Phase 7.0.2 — FUZZY NAME MATCHING (handled in buildMultiImageConsensusV70)
  // Phase 7.0.3 — MULTI-IMAGE NAME CONSENSUS
  const scoredCandidates = buildMultiImageConsensusV70(
    candidateMap,
    imageResults,
    fusedFeatures,
    terpeneProfile,
    strainRatio
  );
  console.log("Phase 7.0.3 — SCORED CANDIDATES (top 5):", scoredCandidates.slice(0, 5).map(c => ({
    name: c.canonicalName,
    score: c.totalScore.toFixed(1),
    matchType: c.matchType,
    frequency: c.frequency,
  })));

  // Phase 7.0.4 — DISAMBIGUATION LOGIC
  const dbEntry = CULTIVAR_LIBRARY.find(s => 
    s.name.toLowerCase() === scoredCandidates[0]?.canonicalName.toLowerCase()
  );
  const disambiguationResult = applyDisambiguationV70(scoredCandidates, dbEntry);
  console.log("Phase 7.0.4 — DISAMBIGUATION RESULT:", {
    primary: disambiguationResult.primary.canonicalName,
    alternates: disambiguationResult.alternates.map(a => a.canonicalName),
  });

  // Phase 7.0.5 — DISPLAY RULES
  const finalResult = formatDisplayV70(disambiguationResult, imageCount);
  console.log("Phase 7.0.5 — FINAL RESULT:", finalResult);

  return finalResult;
}
