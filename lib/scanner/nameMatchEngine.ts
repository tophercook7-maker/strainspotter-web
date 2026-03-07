// lib/scanner/nameMatchEngine.ts
// Phase 5.0.6 — Name-First Matching & Strain Disambiguation Engine

import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NormalizedTerpeneProfile } from "./terpeneExperienceEngine";
import type { CultivarReference } from "./cultivarLibrary";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";
import { fetchWiki } from "./wikiLookup"; // Phase 5.3.3 — For wiki cross-check

/**
 * Phase 5.0.8.1 — Name Candidate
 */
export type NameCandidate = {
  strainName: string;
  canonicalName: string;
  visualScore: number; // 0-100
  geneticsScore: number; // 0-100
  terpeneScore: number; // 0-100
  consensusBoost: number; // 0-100 (appears across images)
  finalScore: number; // Weighted final score
  appearances: number; // How many images identified this strain
  historicalFrequency?: number; // Historical frequency in DB (if available)
  perImageScore?: Map<number, number>; // Phase 5.0.8.1 — Per-image scores
  signalsMatched?: Map<number, string[]>; // Phase 5.0.8.1 — Signals matched per image
  similarityScore?: number; // Phase 5.1.1 — Similarity score (0-1)
  sourceSignals?: string[]; // Phase 5.1.1 — Source signals (database, alias, phenotype)
  matchType?: "exact" | "alias" | "misspelling" | "breeder_variant"; // Phase 5.3.1
  popularityScore?: number; // Phase 5.3.2 — Popularity/reference density (0-100)
  wikiCrossCheckScore?: number; // Phase 5.3.3 — Wiki + AI cross-check score (0-100)
};

/**
 * Phase 5.0.8.4 — Name Match Result
 */
export type NameMatchResult = {
  primaryName: string;
  confidence: number; // Phase 5.0.8.4 — Renamed from confidencePercent
  confidencePercent: number; // Keep for compatibility
  confidenceTierLabel?: string; // Phase 5.7.3 — Confidence tier label
  matchType?: "Exact" | "Likely" | "Approximate"; // Phase 5.9.4 — Match type
  strainTitle?: string; // Phase 5.9.4 — Strain title format ("Closest Known Match" or "Likely Match (Approximate)")
  databaseMatchType?: "exact" | "alias" | "no_match"; // Phase 8.1.3 — Database cross-check match type
  alternates: Array<{ // Phase 5.0.8.4 — Renamed from alternateMatches
    name: string;
    confidence: number; // Phase 5.0.8.4 — Renamed from score
    score: number; // Keep for compatibility
    reason: string; // Phase 5.0.8.4 — Renamed from whyNotPrimary
    whyNotPrimary: string; // Keep for compatibility
    whyClose?: string; // Phase 5.5.2 — Why it was close
    whyLost?: string; // Phase 5.5.2 — Why it lost
  }>;
  alternateMatches: Array<{ // Keep for compatibility
    name: string;
    score: number;
    whyNotPrimary: string;
    whyClose?: string; // Phase 5.5.2
    whyLost?: string; // Phase 5.5.2
  }>;
  explanation: {
    whyThisNameWon: string[];
    whyOthersLost: string[];
  };
  isCloselyRelated?: boolean; // Phase 5.0.6.3 — If top 2 are within 5%
  closelyRelatedName?: string; // Phase 5.0.6.3 — The other closely related name
  userLanguage?: string; // Phase 5.5.5 — Plain English explanation
};

/**
 * Phase 8.1.1 — PER-IMAGE NAME CANDIDATES
 * Phase 8.3.1 — Enhanced with aliases & spelling variants
 * 
 * For EACH image:
 * - Generate top 5 candidate strain names
 * - Include aliases & spelling variants
 * - Store confidence per candidate
 * 
 * Output per image:
 * {
 *   imageLabel: string,
 *   candidates: [
 *     { name: string, confidence: number }
 *   ]
 * }
 */
function generatePerImageNameCandidates(
  imageResults: ImageResult[]
): Array<{
  imageLabel: string;
  candidates: Array<{ name: string; confidence: number; traits?: string[] }>;
}> {
  const perImageNames: Array<{
    imageLabel: string;
    candidates: Array<{ name: string; confidence: number; traits?: string[] }>;
  }> = [];
  
  imageResults.forEach((result, imageIndex) => {
    const imageLabel = `Image ${imageIndex + 1}`;
    const baseCandidates = result.candidateStrains.slice(0, 5);
    const candidates: Array<{ name: string; confidence: number; traits?: string[] }> = [];
    
    // Phase 8.3.1 — Generate top 5 candidates with aliases & spelling variants
    baseCandidates.forEach(candidate => {
      // Phase 8.3.1 — Add base candidate
      candidates.push({
        name: candidate.name,
        confidence: candidate.confidence,
        traits: Array.isArray(candidate.traitsMatched) ? candidate.traitsMatched : [],
      });
      
      // Phase 8.3.1 — Check for aliases in database
      const dbEntry = CULTIVAR_LIBRARY.find(s => 
        s.name.toLowerCase() === candidate.name.toLowerCase() ||
        s.aliases?.some(a => a.toLowerCase() === candidate.name.toLowerCase())
      );
      
      if (dbEntry) {
        // Phase 8.3.1 — Add canonical name if different
        if (dbEntry.name.toLowerCase() !== candidate.name.toLowerCase()) {
          const existingCanonical = candidates.find(c => c.name.toLowerCase() === dbEntry.name.toLowerCase());
          if (!existingCanonical) {
            candidates.push({
              name: dbEntry.name, // Canonical name
              confidence: candidate.confidence * 0.95, // Slightly lower for alias
              traits: Array.isArray(candidate.traitsMatched) ? candidate.traitsMatched : [],
            });
          }
        }
        
        // Phase 8.3.1 — Add aliases (limit to 2 most common)
        if (dbEntry.aliases && dbEntry.aliases.length > 0) {
          dbEntry.aliases.slice(0, 2).forEach(alias => {
            const existingAlias = candidates.find(c => c.name.toLowerCase() === alias.toLowerCase());
            if (!existingAlias) {
              candidates.push({
                name: alias,
                confidence: candidate.confidence * 0.90, // Lower for alias
                traits: Array.isArray(candidate.traitsMatched) ? candidate.traitsMatched : [],
              });
            }
          });
        }
      }
      
      // Phase 8.3.1 — Add spelling variants (common misspellings)
      const spellingVariants = generateSpellingVariants(candidate.name);
      spellingVariants.forEach(variant => {
        const dbVariant = CULTIVAR_LIBRARY.find(s => 
          s.name.toLowerCase() === variant.toLowerCase() ||
          s.aliases?.some(a => a.toLowerCase() === variant.toLowerCase())
        );
        
        if (dbVariant && !candidates.find(c => c.name.toLowerCase() === variant.toLowerCase())) {
          candidates.push({
            name: variant,
            confidence: candidate.confidence * 0.85, // Lower for spelling variant
            traits: Array.isArray(candidate.traitsMatched) ? candidate.traitsMatched : [],
          });
        }
      });
    });
    
    // Phase 8.3.1 — Sort by confidence and take top 5
    candidates.sort((a, b) => b.confidence - a.confidence);
    const top5 = candidates.slice(0, 5);
    
    perImageNames.push({
      imageLabel,
      candidates: top5,
    });
  });
  
  console.log("NAME CANDIDATES:", perImageNames.map(img => 
    `${img.imageLabel}: ${img.candidates.map(c => `${c.name} (${c.confidence}%)`).join(", ")}`
  ).join(" | "));
  
  return perImageNames;
}

/**
 * Phase 8.3.1 — Generate spelling variants for a strain name
 */
function generateSpellingVariants(name: string): string[] {
  const variants: string[] = [];
  const lower = name.toLowerCase();
  
  // Common spelling variations
  if (lower.includes("kush")) {
    variants.push(name.replace(/kush/gi, "Kush"));
    variants.push(name.replace(/kush/gi, "KUSH"));
  }
  if (lower.includes("og")) {
    variants.push(name.replace(/og/gi, "OG"));
    variants.push(name.replace(/og/gi, "O.G."));
  }
  if (lower.includes("haze")) {
    variants.push(name.replace(/haze/gi, "Haze"));
    variants.push(name.replace(/haze/gi, "HAZE"));
  }
  
  // Space variations
  variants.push(name.replace(/\s+/g, ""));
  variants.push(name.replace(/\s+/g, "-"));
  variants.push(name.replace(/\s+/g, "_"));
  
  return variants.filter((v, i, arr) => arr.indexOf(v) === i && v.toLowerCase() !== name.toLowerCase());
}

/**
 * Phase 5.9.1 — NAME-FIRST PIPELINE
 * 
 * Before any effects or wiki text:
 * 1. Extract top candidate names from:
 *    - Database (primary)
 *    - Image traits
 *    - Terpene alignment
 *    - Genetics inference
 * 2. Rank names by:
 *    - Frequency across images
 *    - Trait overlap score
 *    - Alias matches
 *    - Penalty for contradictions
 * 
 * Output: Top 5 ranked strain names with confidence
 */
function generateNameCandidates(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  terpeneProfile?: NormalizedTerpeneProfile
): NameCandidate[] {
  const candidateMap = new Map<string, {
    strainName: string;
    appearances: number;
    imageIndices: number[];
    confidences: number[];
    perImageScores: Map<number, number>; // Phase 5.0.8.1 — Per-image scores
    signalsMatched: Map<number, string[]>; // Phase 5.0.8.1 — Signals matched per image
    sourceSignals: string[]; // Phase 5.1.1 — Source signals (database, alias, phenotype)
    matchType: "exact" | "alias" | "misspelling" | "breeder_variant"; // Phase 5.3.1
  }>();

  // Phase 5.3.1 — Collect candidates from each image (top 5 per image)
  const topN = 5; // Phase 5.3.1 — Top 5 candidates
  imageResults.forEach((result, imageIndex) => {
    result.candidateStrains.slice(0, topN).forEach(candidate => {
      const normalizedName = candidate.name.toLowerCase().trim();
      const existing = candidateMap.get(normalizedName);
      
      // Phase 5.1.1 — Extract signals matched from candidate
      const signalsMatched = Array.isArray(candidate.traitsMatched) 
        ? candidate.traitsMatched 
        : [];
      
      // Phase 5.3.1 — Determine source signals and match type
      const sourceSignals: string[] = [];
      let matchType: "exact" | "alias" | "misspelling" | "breeder_variant" = "exact";
      
      if (candidate.confidence > 80) {
        sourceSignals.push("database_high_match");
      } else if (candidate.confidence > 60) {
        sourceSignals.push("database_match");
      }
      if (signalsMatched.length > 0) {
        sourceSignals.push("phenotype_similarity");
      }
      
      // Phase 5.3.1 — Check match type: exact name, alias, misspelling, breeder variant
      const dbEntry = CULTIVAR_LIBRARY.find(s => 
        s.name.toLowerCase() === normalizedName ||
        s.aliases?.some(a => a.toLowerCase() === normalizedName)
      );
      
      if (dbEntry) {
        if (dbEntry.name.toLowerCase() === normalizedName) {
          matchType = "exact";
        } else if (dbEntry.aliases?.some(a => a.toLowerCase() === normalizedName)) {
          matchType = "alias";
          sourceSignals.push("alias_match");
        } else {
          // Check for misspelling (fuzzy match) or breeder variant
          const nameVariations = [
            candidate.name.replace(/\s+/g, ""),
            candidate.name.replace(/\s+/g, "-"),
            candidate.name.replace(/\s+/g, "_"),
          ];
          const isMisspelling = nameVariations.some(v => 
            dbEntry.name.toLowerCase().includes(v.toLowerCase()) ||
            v.toLowerCase().includes(dbEntry.name.toLowerCase())
          );
          if (isMisspelling) {
            matchType = "misspelling";
            sourceSignals.push("misspelling_match");
          } else if (dbEntry.breeder || dbEntry.breederNotes) {
            matchType = "breeder_variant";
            sourceSignals.push("breeder_variant");
          }
        }
      }
      
      if (existing) {
        existing.appearances++;
        existing.imageIndices.push(imageIndex);
        existing.confidences.push(candidate.confidence);
        existing.perImageScores.set(imageIndex, candidate.confidence);
        existing.signalsMatched.set(imageIndex, signalsMatched);
        // Phase 5.1.1 — Merge source signals
        existing.sourceSignals = Array.from(new Set([...existing.sourceSignals, ...sourceSignals]));
        // Phase 5.3.1 — Prefer exact match type if available
        if (matchType === "exact" && existing.matchType !== "exact") {
          existing.matchType = matchType;
        }
      } else {
        candidateMap.set(normalizedName, {
          strainName: candidate.name,
          appearances: 1,
          imageIndices: [imageIndex],
          confidences: [candidate.confidence],
          perImageScores: new Map([[imageIndex, candidate.confidence]]),
          signalsMatched: new Map([[imageIndex, signalsMatched]]),
          sourceSignals, // Phase 5.1.1
          matchType, // Phase 5.3.1
        });
      }
    });
  });

  // Phase 5.0.6.1 — Convert to candidate array and find database entries
  const candidates: NameCandidate[] = [];
  
  for (const [normalizedName, entry] of candidateMap.entries()) {
    // Find database entry
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name.toLowerCase() === normalizedName ||
      s.aliases?.some(a => a.toLowerCase() === normalizedName)
    );

    if (!dbEntry) {
      continue; // Skip if not in database
    }

    // Phase 5.1.1 — Calculate similarityScore (0-1) from average confidence
    const avgConfidence = entry.confidences.reduce((sum, c) => sum + c, 0) / entry.confidences.length;
    const similarityScore = avgConfidence / 100; // Convert to 0-1 range
    
    candidates.push({
      strainName: entry.strainName,
      canonicalName: dbEntry.name,
      visualScore: 0, // Will be calculated
      geneticsScore: 0, // Will be calculated
      terpeneScore: 0, // Will be calculated
      consensusBoost: 0, // Will be calculated
      finalScore: 0, // Will be calculated
      appearances: entry.appearances,
      historicalFrequency: dbEntry.sources?.length || 0, // Use sources count as proxy
      perImageScore: entry.perImageScores, // Phase 5.0.8.1
      signalsMatched: entry.signalsMatched, // Phase 5.0.8.1
      similarityScore, // Phase 5.1.1
      sourceSignals: entry.sourceSignals, // Phase 5.1.1
      matchType: entry.matchType, // Phase 5.3.1
    });
  }

  // Phase 5.3.1 — Sort by similarity score and take top 5
  candidates.sort((a, b) => {
    // Phase 5.3.1 — Prefer exact matches, then by similarity score
    const aExact = (a as any).matchType === "exact" ? 1 : 0;
    const bExact = (b as any).matchType === "exact" ? 1 : 0;
    if (aExact !== bExact) {
      return bExact - aExact;
    }
    return (b.similarityScore || 0) - (a.similarityScore || 0);
  });
  const topCandidates = candidates.slice(0, 5); // Phase 5.3.1 — Top 5

  console.log("Phase 5.3.1 — NAME-FIRST PIPELINE: Generated", topCandidates.length, "top candidates from", imageResults.length, "images");
  console.log("NAME CANDIDATES:", topCandidates.map(c => `${c.strainName} (${(c as any).matchType || "unknown"}, score: ${(c.similarityScore || 0).toFixed(2)})`).join(", "));

  return topCandidates;
}

/**
 * Phase 5.0.6.2 — Score Visual Morphology Similarity (0-100)
 */
function scoreVisualMorphology(
  fusedFeatures: FusedFeatures,
  dbEntry: CultivarReference
): number {
  let score = 0;
  const visualProfile = dbEntry.visualProfile || {
    budStructure: dbEntry.morphology?.budDensity || "medium",
    trichomeDensity: dbEntry.morphology?.trichomeDensity || "medium",
    leafShape: dbEntry.morphology?.leafShape || "broad",
    pistilColor: dbEntry.morphology?.pistilColor || ["orange"],
    colorProfile: "",
  };

  // Bud structure match (30 points)
  if (fusedFeatures.budStructure === visualProfile.budStructure) {
    score += 30;
  } else if (
    (fusedFeatures.budStructure === "high" && visualProfile.budStructure === "medium") ||
    (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "high") ||
    (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "low") ||
    (fusedFeatures.budStructure === "low" && visualProfile.budStructure === "medium")
  ) {
    score += 15; // Partial match
  }

  // Leaf shape match (25 points)
  if (fusedFeatures.leafShape === visualProfile.leafShape) {
    score += 25;
  } else {
    // Partial match based on genetics
    const strainType = dbEntry.type || dbEntry.dominantType;
    if (fusedFeatures.leafShape === "broad" && (strainType === "Indica" || strainType === "Hybrid")) {
      score += 12;
    } else if (fusedFeatures.leafShape === "narrow" && (strainType === "Sativa" || strainType === "Hybrid")) {
      score += 12;
    }
  }

  // Trichome density match (25 points)
  if (fusedFeatures.trichomeDensity === visualProfile.trichomeDensity) {
    score += 25;
  } else if (
    (fusedFeatures.trichomeDensity === "high" && visualProfile.trichomeDensity === "medium") ||
    (fusedFeatures.trichomeDensity === "medium" && visualProfile.trichomeDensity === "high") ||
    (fusedFeatures.trichomeDensity === "medium" && visualProfile.trichomeDensity === "low") ||
    (fusedFeatures.trichomeDensity === "low" && visualProfile.trichomeDensity === "medium")
  ) {
    score += 12; // Partial match
  }

  // Color match (20 points)
  const pistilMatch = visualProfile.pistilColor?.some(
    c => c.toLowerCase() === fusedFeatures.pistilColor?.toLowerCase()
  );
  if (pistilMatch) {
    score += 20;
  } else {
    // Partial match based on color families
    const colorFamilies: Record<string, string[]> = {
      orange: ["orange", "amber", "brown"],
      red: ["red", "orange", "pink"],
      white: ["white", "yellow", "cream"],
      purple: ["purple", "pink", "red"],
    };
    const fusedFamily = Object.keys(colorFamilies).find(family =>
      colorFamilies[family].includes(fusedFeatures.pistilColor?.toLowerCase() || "")
    );
    const profileFamily = Object.keys(colorFamilies).find(family =>
      visualProfile.pistilColor?.some(c => colorFamilies[family].includes(c.toLowerCase()))
    );
    if (fusedFamily && profileFamily && fusedFamily === profileFamily) {
      score += 10; // Same color family
    }
  }

  return Math.min(100, score);
}

/**
 * Phase 5.0.6.2 — Score Genetic Lineage Proximity (0-100)
 */
function scoreGeneticLineage(
  fusedFeatures: FusedFeatures,
  dbEntry: CultivarReference
): number {
  let score = 0;

  // Phase 5.0.6.2 — Check type alignment
  const strainType = dbEntry.type || dbEntry.dominantType;
  const expectedType = fusedFeatures.leafShape === "broad" ? "Indica" 
    : fusedFeatures.leafShape === "narrow" ? "Sativa"
    : "Hybrid";

  if (strainType === expectedType) {
    score += 40; // Strong type match
  } else if (strainType === "Hybrid" || expectedType === "Hybrid") {
    score += 25; // Partial match (hybrid can be either)
  } else {
    score += 10; // Weak match
  }

  // Phase 5.0.6.2 — Check lineage (if available)
  if (dbEntry.genetics) {
    score += 30; // Has lineage data (bonus)
    
    // Check if lineage suggests expected type
    const geneticsLower = dbEntry.genetics.toLowerCase();
    if (expectedType === "Indica" && (geneticsLower.includes("indica") || geneticsLower.includes("kush") || geneticsLower.includes("afghan"))) {
      score += 20; // Lineage supports indica
    } else if (expectedType === "Sativa" && (geneticsLower.includes("sativa") || geneticsLower.includes("haze") || geneticsLower.includes("thai"))) {
      score += 20; // Lineage supports sativa
    }
  } else {
    score += 10; // No lineage data (penalty)
  }

  // Phase 5.0.6.2 — Historical frequency bonus
  const historicalFrequency = dbEntry.sources?.length || 0;
  if (historicalFrequency >= 3) {
    score += 10; // Well-documented strain
  } else if (historicalFrequency >= 1) {
    score += 5; // Some documentation
  }

  return Math.min(100, score);
}

/**
 * Phase 5.0.6.2 — Score Terpene Overlap (0-100)
 */
function scoreTerpeneOverlap(
  terpeneProfile: NormalizedTerpeneProfile | undefined,
  dbEntry: CultivarReference
): number {
  if (!terpeneProfile || terpeneProfile.primaryTerpenes.length === 0) {
    return 50; // Neutral score if no terpene data
  }

  const dbTerpenes = (dbEntry.terpeneProfile || dbEntry.commonTerpenes || []).map(t => t.toLowerCase());
  if (dbTerpenes.length === 0) {
    return 50; // Neutral score if no database terpenes
  }

  const detectedTerpenes = terpeneProfile.primaryTerpenes.map(t => t.name.toLowerCase());
  const matchingTerpenes = detectedTerpenes.filter(t => dbTerpenes.includes(t));

  // Phase 5.0.6.2 — Calculate overlap percentage
  const overlapRatio = matchingTerpenes.length / Math.max(detectedTerpenes.length, dbTerpenes.length);
  const score = Math.round(overlapRatio * 100);

  return Math.min(100, score);
}

/**
 * Phase 5.0.8.2 — MULTI-IMAGE AGREEMENT: Boost/penalize based on image agreement
 * 
 * Rules:
 * - Boost strains appearing in ≥2 images
 * - Strong boost if ≥3 images agree
 * - Penalize one-off candidates
 * - Eliminate visually contradictory strains
 */
function calculateConsensusBoost(
  appearances: number,
  imageCount: number,
  avgConfidence: number // Not used, kept for signature compatibility
): number {
  if (imageCount === 1) {
    return 50; // No consensus for single image (neutral)
  }

  // Phase 5.0.8.2 — Boost for appearing in multiple images
  if (appearances >= 3) {
    return 100; // Strong boost: appears in ≥3 images
  } else if (appearances >= 2) {
    return 75; // Boost: appears in ≥2 images
  } else {
    return 25; // Penalty: one-off candidate (reduced from 30 to 25)
  }
}

/**
 * Phase 5.0.8.2 — Check for visually contradictory strains
 * 
 * Eliminate candidates that contradict visual features across images
 */
function checkVisualContradictions(
  candidate: NameCandidate,
  fusedFeatures: FusedFeatures,
  dbEntry: CultivarReference
): boolean {
  const visualProfile = dbEntry.visualProfile || {
    budStructure: dbEntry.morphology?.budDensity || "medium",
    trichomeDensity: dbEntry.morphology?.trichomeDensity || "medium",
    leafShape: dbEntry.morphology?.leafShape || "broad",
    pistilColor: dbEntry.morphology?.pistilColor || ["orange"],
    colorProfile: "",
  };

  // Phase 5.0.8.2 — Check for major contradictions
  // If fused features strongly suggest one type but database suggests opposite
  const strainType = dbEntry.type || dbEntry.dominantType;
  
  // Major contradiction: broad leaves (indica) but database says pure sativa
  if (fusedFeatures.leafShape === "broad" && strainType === "Sativa" && !strainType.includes("Hybrid")) {
    return true; // Contradictory
  }
  
  // Major contradiction: narrow leaves (sativa) but database says pure indica
  if (fusedFeatures.leafShape === "narrow" && strainType === "Indica" && !strainType.includes("Hybrid")) {
    return true; // Contradictory
  }

  return false; // No major contradiction
}

/**
 * Phase 5.0.8.2 — MULTI-IMAGE AGREEMENT: Build agreement map
 */
function buildAgreementMap(
  candidates: NameCandidate[],
  imageCount: number
): Map<string, {
  appearances: number;
  avgScore: number;
  imageIndices: number[];
}> {
  const agreementMap = new Map<string, {
    appearances: number;
    avgScore: number;
    imageIndices: number[];
  }>();

  candidates.forEach(candidate => {
    if (candidate.appearances >= 2) {
      // Phase 5.0.8.2 — Calculate average score across images
      const scores = Array.from(candidate.perImageScore?.values() || []);
      const avgScore = scores.length > 0 
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
        : 0;

      agreementMap.set(candidate.strainName, {
        appearances: candidate.appearances,
        avgScore,
        imageIndices: candidate.imageIndices || [],
      });
    }
  });

  console.log("Phase 5.0.8.2 — CONSENSUS AGREEMENT:", Array.from(agreementMap.entries()).slice(0, 5).map(([name, data]) => 
    `${name}: ${data.appearances} images, avg ${data.avgScore.toFixed(1)}%`
  ).join(", "));

  return agreementMap;
}

/**
 * Phase 5.7.1 — NAME-FIRST PIPELINE: Rank by:
 * - Image consensus frequency
 * - Database similarity score
 * - Morphology alignment
 * - Terpene likelihood overlap
 * 
 * FinalScore = 0.4 * visual + 0.3 * genetics + 0.2 * terpenes + 0.1 * consensusBoost
 */
export function scoreNameCandidates(
  candidates: NameCandidate[],
  fusedFeatures: FusedFeatures,
  terpeneProfile: NormalizedTerpeneProfile | undefined,
  imageCount: number
): NameCandidate[] {
  const scoredCandidates: NameCandidate[] = [];

  // Phase 5.0.8.2 — Build agreement map
  const agreementMap = buildAgreementMap(candidates, imageCount);

  for (const candidate of candidates) {
    // Find database entry
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name.toLowerCase() === candidate.canonicalName.toLowerCase() ||
      s.aliases?.some(a => a.toLowerCase() === candidate.canonicalName.toLowerCase())
    );

    if (!dbEntry) {
      continue; // Skip if not found
    }

    // Phase 5.0.8.2 — Eliminate visually contradictory strains
    if (checkVisualContradictions(candidate, fusedFeatures, dbEntry)) {
      console.log("Phase 5.0.8.2 — ELIMINATED:", candidate.strainName, "(visually contradictory)");
      continue; // Skip contradictory candidates
    }

    // Phase 5.0.6.2 — Calculate individual scores
    const visualScore = scoreVisualMorphology(fusedFeatures, dbEntry);
    const geneticsScore = scoreGeneticLineage(fusedFeatures, dbEntry);
    const terpeneScore = scoreTerpeneOverlap(terpeneProfile, dbEntry);
    
    // Phase 5.0.8.2 — Calculate consensus boost with multi-image agreement
    let consensusBoost = calculateConsensusBoost(candidate.appearances, imageCount, 75);
    
    // Phase 5.0.8.2 — Additional boost for strong agreement (≥3 images)
    if (candidate.appearances >= 3) {
      consensusBoost = Math.min(100, consensusBoost + 10); // Extra boost for 3+ images
    }
    
    // Phase 5.0.8.2 — Penalize one-off candidates more strongly
    if (candidate.appearances === 1 && imageCount > 1) {
      consensusBoost = Math.max(20, consensusBoost - 10); // Stronger penalty
    }

    // Phase 5.7.1 — Calculate final weighted score
    // Rank by: Image consensus frequency (consensusBoost), Database similarity score (geneticsScore), 
    // Morphology alignment (visualScore), Terpene likelihood overlap (terpeneScore)
    const finalScore = 
      (visualScore * 0.4) +      // Phase 5.7.1 — Morphology alignment
      (geneticsScore * 0.3) +    // Phase 5.7.1 — Database similarity score
      (terpeneScore * 0.2) +     // Phase 5.7.1 — Terpene likelihood overlap
      (consensusBoost * 0.1);    // Phase 5.7.1 — Image consensus frequency

    scoredCandidates.push({
      ...candidate,
      visualScore,
      geneticsScore,
      terpeneScore,
      consensusBoost,
      finalScore: Math.round(finalScore * 10) / 10,
    });
  }

  // Phase 5.0.6.2 — Sort by final score
  scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);

  console.log("Phase 5.0.6.2 — NAME SCORES: Scored", scoredCandidates.length, "candidates");
  console.log("NAME SCORES:", scoredCandidates.slice(0, 5).map(c => 
    `${c.strainName}: ${c.finalScore.toFixed(1)} (V:${c.visualScore} G:${c.geneticsScore} T:${c.terpeneScore} C:${c.consensusBoost})`
  ).join(", "));

  return scoredCandidates;
}

/**
 * Phase 5.3.2 — DISAMBIGUATION ENGINE
 * 
 * When multiple strains are similar:
 * Score each by:
 * - Visual match %
 * - Lineage overlap
 * - Terpene agreement
 * - Popularity / reference density
 * 
 * Produce:
 * {
 *   primaryName: string,
 *   confidence: number,
 *   alternates: Array<{
 *     name: string,
 *     confidence: number,
 *     whyNotPrimary: string
 *   }>
 * }
 */
function applyDisambiguationEngine(
  topCandidates: NameCandidate[],
  fusedFeatures: FusedFeatures,
  terpeneProfile: NormalizedTerpeneProfile | undefined,
  imageCount: number
): NameCandidate[] {
  if (topCandidates.length < 2) {
    return topCandidates;
  }

  const topScore = topCandidates[0].finalScore;
  const secondScore = topCandidates[1]?.finalScore || 0;
  const thirdScore = topCandidates[2]?.finalScore || 0;
  
  // Phase 5.1.2 — Check if top candidates are close (within ±6%)
  const gapToSecond = topScore - secondScore;
  const gapToThird = topScore - thirdScore;
  const gapPercentToSecond = (gapToSecond / topScore) * 100;
  const gapPercentToThird = (gapToThird / topScore) * 100;
  
  if (gapPercentToSecond > 6 && gapPercentToThird > 6) {
    return topCandidates; // Clear winner, no disambiguation needed
  }

  console.log("Phase 5.1.2 — DISAMBIGUATION ENGINE: Top candidates are close (gap:", gapPercentToSecond.toFixed(1), "%), applying disambiguation");

  // Phase 5.1.2 — Apply disambiguation to close candidates
  const disambiguated = topCandidates.map(candidate => {
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name.toLowerCase() === candidate.canonicalName.toLowerCase() ||
      s.aliases?.some(a => a.toLowerCase() === candidate.canonicalName.toLowerCase())
    );

    if (!dbEntry) {
      return candidate; // No disambiguation data
    }

    let disambiguationScore = 0;
    const disambiguationReasons: string[] = [];
    const penalties: string[] = [];

    // Phase 5.1.2 — Lineage overlap (compare with other candidates)
    if (dbEntry.genetics && dbEntry.genetics.includes("×")) {
      disambiguationScore += 2;
      disambiguationReasons.push("known lineage");
    }

    // Phase 5.1.2 — Terpene alignment
    if (terpeneProfile && terpeneProfile.primaryTerpenes.length > 0) {
      const dbTerpenes = (dbEntry.terpeneProfile || dbEntry.commonTerpenes || []).map(t => 
        typeof t === "string" ? t.toLowerCase() : t.name?.toLowerCase() || ""
      );
      const profileTerpenes = terpeneProfile.primaryTerpenes.map(t => t.name.toLowerCase());
      const overlap = profileTerpenes.filter(t => dbTerpenes.some(dt => dt.includes(t) || t.includes(dt))).length;
      if (overlap >= 2) {
        disambiguationScore += 3;
        disambiguationReasons.push(`terpene alignment (${overlap} matches)`);
      } else if (overlap >= 1) {
        disambiguationScore += 1;
        disambiguationReasons.push(`partial terpene alignment (${overlap} match)`);
      } else {
        penalties.push("terpene mismatch");
        disambiguationScore -= 1;
      }
    }

    // Phase 5.7.2 — DISAMBIGUATION ENGINE: Compare specific visual traits
    // Compare: Bud density, Calyx shape, Trichome coverage, Color spectrum
    const visualProfile = dbEntry.visualProfile || {
      budStructure: dbEntry.morphology?.budDensity || "medium",
      trichomeDensity: dbEntry.morphology?.trichomeDensity || "medium",
      leafShape: dbEntry.morphology?.leafShape || "broad",
      pistilColor: dbEntry.morphology?.pistilColor || ["orange"],
      colorProfile: dbEntry.morphology?.colorProfile || "",
    };
    
    let visualMatches = 0;
    const visualComparison: string[] = [];
    
    // Phase 5.7.2 — Bud density comparison
    if (fusedFeatures.budStructure === visualProfile.budStructure) {
      visualMatches++;
      disambiguationScore += 2;
      visualComparison.push("bud density matches");
    } else if (
      (fusedFeatures.budStructure === "high" && visualProfile.budStructure === "medium") ||
      (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "high") ||
      (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "low") ||
      (fusedFeatures.budStructure === "low" && visualProfile.budStructure === "medium")
    ) {
      visualMatches += 0.5;
      disambiguationScore += 1;
      visualComparison.push("bud density similar");
    } else {
      penalties.push("conflicting bud density");
      disambiguationScore -= 2;
    }
    
    // Phase 5.7.2 — Calyx shape (inferred from bud structure)
    // Dense buds = compact calyxes, airy buds = elongated calyxes
    const fusedCalyxShape = fusedFeatures.budStructure === "high" ? "compact" : fusedFeatures.budStructure === "low" ? "elongated" : "medium";
    const profileCalyxShape = visualProfile.budStructure === "high" ? "compact" : visualProfile.budStructure === "low" ? "elongated" : "medium";
    if (fusedCalyxShape === profileCalyxShape) {
      visualMatches++;
      disambiguationScore += 1;
      visualComparison.push("calyx shape matches");
    } else if (fusedCalyxShape === "medium" || profileCalyxShape === "medium") {
      visualMatches += 0.5;
      disambiguationScore += 0.5;
      visualComparison.push("calyx shape similar");
    } else {
      penalties.push("conflicting calyx shape");
      disambiguationScore -= 1;
    }
    
    // Phase 5.7.2 — Trichome coverage comparison
    if (fusedFeatures.trichomeDensity === visualProfile.trichomeDensity) {
      visualMatches++;
      disambiguationScore += 2;
      visualComparison.push("trichome coverage matches");
    } else if (
      (fusedFeatures.trichomeDensity === "high" && visualProfile.trichomeDensity === "medium") ||
      (fusedFeatures.trichomeDensity === "medium" && visualProfile.trichomeDensity === "high") ||
      (fusedFeatures.trichomeDensity === "medium" && visualProfile.trichomeDensity === "low") ||
      (fusedFeatures.trichomeDensity === "low" && visualProfile.trichomeDensity === "medium")
    ) {
      visualMatches += 0.5;
      disambiguationScore += 1;
      visualComparison.push("trichome coverage similar");
    } else {
      penalties.push("conflicting trichome coverage");
      disambiguationScore -= 2;
    }
    
    // Phase 5.7.2 — Color spectrum comparison
    const pistilMatch = visualProfile.pistilColor?.some(
      c => c.toLowerCase() === fusedFeatures.pistilColor?.toLowerCase()
    );
    if (pistilMatch) {
      visualMatches++;
      disambiguationScore += 1;
      visualComparison.push("color spectrum matches");
    } else if (visualProfile.pistilColor && visualProfile.pistilColor.length > 0) {
      // Check color families
      const colorFamilies: Record<string, string[]> = {
        orange: ["orange", "amber", "brown"],
        red: ["red", "orange", "pink"],
        white: ["white", "yellow", "cream"],
        purple: ["purple", "pink", "red"],
      };
      const fusedFamily = Object.keys(colorFamilies).find(family =>
        colorFamilies[family].includes(fusedFeatures.pistilColor?.toLowerCase() || "")
      );
      const profileFamily = Object.keys(colorFamilies).find(family =>
        visualProfile.pistilColor?.some(c => colorFamilies[family].includes(c.toLowerCase()))
      );
      if (fusedFamily && profileFamily && fusedFamily === profileFamily) {
        visualMatches += 0.5;
        disambiguationScore += 0.5;
        visualComparison.push("color spectrum similar");
      } else {
        penalties.push("conflicting color spectrum");
        disambiguationScore -= 1;
      }
    }
    
    if (visualMatches >= 3) {
      disambiguationReasons.push(`strong visual match (${visualComparison.join(", ")})`);
    } else if (visualMatches >= 2) {
      disambiguationReasons.push(`visual match (${visualComparison.join(", ")})`);
    } else if (visualMatches >= 1) {
      disambiguationReasons.push(`partial visual match (${visualComparison.join(", ")})`);
    } else if (visualMatches < 1 && penalties.length > 0) {
      disambiguationReasons.push("conflicting visual traits");
    }

    // Phase 5.3.2 — Popularity / reference density
    const sourceCount = dbEntry.sources?.length || 0;
    const popularityScore = Math.min(100, sourceCount * 10); // 0-100 based on source count
    (candidate as any).popularityScore = popularityScore;
    
    if (sourceCount >= 5) {
      disambiguationScore += 3;
      disambiguationReasons.push(`high popularity (${sourceCount} references)`);
    } else if (sourceCount >= 3) {
      disambiguationScore += 2;
      disambiguationReasons.push(`moderate popularity (${sourceCount} references)`);
    } else if (sourceCount >= 1) {
      disambiguationScore += 1;
      disambiguationReasons.push(`documented (${sourceCount} reference${sourceCount > 1 ? 's' : ''})`);
    } else {
      // Phase 5.7.2 — Penalize rare strains without strong visual evidence
      if (visualMatches < 2) {
        penalties.push("rare strain without strong visual evidence");
        disambiguationScore -= 3; // Stronger penalty if rare AND no strong visual evidence
      } else {
        penalties.push("rare/unstable cultivar");
        disambiguationScore -= 2;
      }
    }
    
    // Phase 5.7.2 — Penalize conflicting parentage
    if (dbEntry.genetics && fusedFeatures.leafShape) {
      const geneticsLower = dbEntry.genetics.toLowerCase();
      const expectedType = fusedFeatures.leafShape === "broad" ? "indica" : fusedFeatures.leafShape === "narrow" ? "sativa" : "hybrid";
      
      // Check for conflicting parentage
      const hasIndicaParent = geneticsLower.includes("indica") || geneticsLower.includes("kush") || geneticsLower.includes("afghan");
      const hasSativaParent = geneticsLower.includes("sativa") || geneticsLower.includes("haze") || geneticsLower.includes("thai");
      
      if (expectedType === "indica" && hasSativaParent && !hasIndicaParent) {
        penalties.push("conflicting parentage (sativa parent but indica morphology)");
        disambiguationScore -= 2;
      } else if (expectedType === "sativa" && hasIndicaParent && !hasSativaParent) {
        penalties.push("conflicting parentage (indica parent but sativa morphology)");
        disambiguationScore -= 2;
      } else if (hasIndicaParent && hasSativaParent) {
        // Hybrid parentage - this is fine
        disambiguationScore += 1;
        disambiguationReasons.push("hybrid parentage aligns with morphology");
      }
    }
    
    // Phase 5.1.2 — Geographic/breeder metadata (if available)
    if (dbEntry.breederNotes || dbEntry.breeder) {
      disambiguationScore += 1;
      disambiguationReasons.push("breeder metadata available");
    }

    // Phase 5.1.2 — Penalties: Single-image-only matches
    if (candidate.appearances === 1 && imageCount > 1) {
      penalties.push("single-image-only match");
      disambiguationScore -= 3; // Strong penalty for single-image matches in multi-image scans
    }

    if (disambiguationScore !== 0 || penalties.length > 0) {
      const action = disambiguationScore > 0 ? "boost" : "penalty";
      const reasons = disambiguationReasons.length > 0 
        ? `+${disambiguationReasons.join(", ")}`
        : "";
      const penaltyText = penalties.length > 0 
        ? ` -${penalties.join(", ")}`
        : "";
      console.log(`Phase 5.1.2 — Disambiguation ${action} for "${candidate.strainName}": ${disambiguationScore > 0 ? '+' : ''}${disambiguationScore} (${reasons}${penaltyText})`);
      return {
        ...candidate,
        finalScore: candidate.finalScore + disambiguationScore,
      };
    }

    return candidate;
  });

  // Phase 5.3.2 — Re-sort after disambiguation
  disambiguated.sort((a, b) => b.finalScore - a.finalScore);

  return disambiguated;
}

/**
 * Phase 5.3.3 — WIKI + AI CROSS-CHECK
 * 
 * For top 3 candidates:
 * - Pull wiki descriptions
 * - Compare described traits vs detected traits
 * - Penalize contradictions
 * - Boost confirmations
 */
function performWikiCrossCheck(
  topCandidates: NameCandidate[],
  fusedFeatures: FusedFeatures,
  dbEntries: Map<string, CultivarReference>
): NameCandidate[] {
  // Phase 5.3.3 — Only check top 3 candidates
  const top3 = topCandidates.slice(0, 3);
  const crossChecked: NameCandidate[] = [];
  
  for (const candidate of top3) {
    const dbEntry = dbEntries.get(candidate.canonicalName.toLowerCase());
    if (!dbEntry) {
      crossChecked.push(candidate);
      continue;
    }
    
    // Phase 5.3.3 — Fetch wiki data
    const wikiData = fetchWiki(candidate.canonicalName, dbEntry);
    
    let crossCheckScore = 0;
    const confirmations: string[] = [];
    const contradictions: string[] = [];
    
    // Phase 5.3.3 — Compare described traits vs detected traits
    if (wikiData) {
      // Visual traits comparison
      // Use database morphology as wiki data (since fetchWiki returns basic data)
      const wikiLeafShape = dbEntry.morphology?.leafShape;
      const wikiBudDensity = dbEntry.morphology?.budDensity;
      
      // Phase 5.3.3 — Leaf shape comparison
      if (wikiLeafShape && fusedFeatures.leafShape) {
        if (wikiLeafShape.toLowerCase() === fusedFeatures.leafShape.toLowerCase()) {
          crossCheckScore += 15;
          confirmations.push("leaf shape matches wiki description");
        } else {
          crossCheckScore -= 10;
          contradictions.push("leaf shape contradicts wiki description");
        }
      }
      
      // Phase 5.3.3 — Bud density comparison
      if (wikiBudDensity && fusedFeatures.budStructure) {
        const wikiBudMap: Record<string, string> = {
          "dense": "high",
          "tight": "high",
          "airy": "low",
          "loose": "low",
          "medium": "medium",
        };
        const mappedWikiBud = wikiBudMap[wikiBudDensity.toLowerCase()] || wikiBudDensity.toLowerCase();
        if (mappedWikiBud === fusedFeatures.budStructure.toLowerCase()) {
          crossCheckScore += 15;
          confirmations.push("bud structure matches wiki description");
        } else {
          crossCheckScore -= 10;
          contradictions.push("bud structure contradicts wiki description");
        }
      }
      
      // Phase 5.3.3 — Color profile comparison (if available)
      const wikiColor = wikiData.morphology?.coloration || "";
      if (wikiColor && fusedFeatures.colorProfile) {
        const colorMatch = wikiColor.toLowerCase().includes(fusedFeatures.colorProfile.toLowerCase()) ||
                          fusedFeatures.colorProfile.toLowerCase().includes(wikiColor.toLowerCase());
        if (colorMatch) {
          crossCheckScore += 5;
          confirmations.push("color profile aligns with wiki");
        }
      }
    }
    
    // Phase 5.3.3 — Store cross-check score
    (candidate as any).wikiCrossCheckScore = Math.max(0, Math.min(100, 50 + crossCheckScore)); // Base 50, ± adjustments
    
    if (confirmations.length > 0 || contradictions.length > 0) {
      console.log(`Phase 5.3.3 — Wiki cross-check for "${candidate.strainName}": ${confirmations.length} confirmations, ${contradictions.length} contradictions (score: ${(candidate as any).wikiCrossCheckScore})`);
    }
    
    // Phase 5.3.3 — Adjust final score based on cross-check
    const adjustedScore = candidate.finalScore + (crossCheckScore * 0.1); // 10% weight for wiki cross-check
    crossChecked.push({
      ...candidate,
      finalScore: Math.max(0, adjustedScore),
    });
  }
  
  // Phase 5.3.3 — Add remaining candidates without cross-check
  crossChecked.push(...topCandidates.slice(3));
  
  // Phase 5.3.3 — Re-sort by adjusted score
  crossChecked.sort((a, b) => b.finalScore - a.finalScore);
  
  return crossChecked;
}

/**
 * Phase 5.0.6.3 — Disambiguation: Check if top 2 names are within 5%
 */
function checkDisambiguation(
  scoredCandidates: NameCandidate[]
): { isCloselyRelated: boolean; closelyRelatedName?: string } {
  if (scoredCandidates.length < 2) {
    return { isCloselyRelated: false };
  }

  const topScore = scoredCandidates[0].finalScore;
  const secondScore = scoredCandidates[1].finalScore;
  const scoreGap = topScore - secondScore;
  const gapPercent = (scoreGap / topScore) * 100;

  if (gapPercent <= 5) {
    return {
      isCloselyRelated: true,
      closelyRelatedName: scoredCandidates[1].strainName,
    };
  }

  return { isCloselyRelated: false };
}

/**
 * Phase 5.1.4 — EXPLANATION GENERATION
 * 
 * Generate whyThisNameWon: string[]
 * Examples:
 * - "Matched leaf morphology and bud density across 3 images"
 * - "Terpene profile aligns strongly with known phenotype"
 * - "Secondary candidates showed conflicting structure"
 */
function generateWhyThisNameWon(
  winner: NameCandidate,
  dbEntry: CultivarReference,
  imageCount: number
): string[] {
  const reasons: string[] = [];

  // Phase 5.1.4 — Visual morphology match
  const visualTraits: string[] = [];
  if (winner.visualScore >= 70) {
    visualTraits.push("leaf morphology");
    visualTraits.push("bud density");
    if (imageCount >= 2) {
      reasons.push(`Matched ${visualTraits.join(" and ")} across ${imageCount} images`);
    } else {
      reasons.push(`Matched ${visualTraits.join(" and ")}`);
    }
  } else if (winner.visualScore >= 50) {
    reasons.push(`Visual traits align with known phenotype (${winner.visualScore}% similarity)`);
  }

  // Phase 5.1.4 — Terpene profile alignment
  if (winner.terpeneScore >= 70) {
    reasons.push("Terpene profile aligns strongly with known phenotype");
  } else if (winner.terpeneScore >= 50) {
    reasons.push(`Terpene profile shows partial alignment (${winner.terpeneScore}% match)`);
  }

  // Phase 5.1.4 — Genetic lineage
  if (winner.geneticsScore >= 70) {
    reasons.push(`Genetic lineage closely matches database records (${winner.geneticsScore}% similarity)`);
  } else if (winner.geneticsScore >= 50) {
    reasons.push(`Genetic lineage aligns with database (${winner.geneticsScore}% similarity)`);
  }

  // Phase 5.1.4 — Multi-image consensus
  if (winner.appearances >= 3) {
    reasons.push(`Consistent identification across ${winner.appearances} images (strong consensus)`);
  } else if (winner.appearances >= 2) {
    reasons.push(`Identified in ${winner.appearances} images (multi-image agreement)`);
  }

  // Phase 5.1.4 — Database documentation
  if (winner.historicalFrequency && winner.historicalFrequency >= 3) {
    reasons.push(`Well-documented strain with ${winner.historicalFrequency} verified sources`);
  }

  // Phase 5.1.4 — Source signals
  if (winner.sourceSignals && winner.sourceSignals.length > 0) {
    const signalText = winner.sourceSignals.includes("alias_match") 
      ? "database and alias matching"
      : winner.sourceSignals.includes("phenotype_similarity")
      ? "phenotype similarity"
      : "database matching";
    reasons.push(`Identified through ${signalText}`);
  }

  return reasons.length > 0 ? reasons : [`Best overall match based on combined signals (${winner.finalScore.toFixed(1)}% score)`];
}

/**
 * Phase 5.1.4 — Generate explanation for why others lost
 * 
 * Examples:
 * - "Secondary candidates showed conflicting structure"
 */
function generateWhyOthersLost(
  winner: NameCandidate,
  losers: NameCandidate[]
): string[] {
  const reasons: string[] = [];

  for (const loser of losers.slice(0, 3)) {
    const scoreGap = winner.finalScore - loser.finalScore;
    const loserReasons: string[] = [];

    // Phase 5.1.4 — Conflicting structure
    if (loser.visualScore < winner.visualScore - 15) {
      loserReasons.push("conflicting structure");
    }
    
    if (loser.visualScore < winner.visualScore - 10) {
      loserReasons.push(`weaker visual match (${loser.visualScore}% vs ${winner.visualScore}%)`);
    }
    if (loser.geneticsScore < winner.geneticsScore - 10) {
      loserReasons.push(`weaker genetic alignment (${loser.geneticsScore}% vs ${winner.geneticsScore}%)`);
    }
    if (loser.terpeneScore < winner.terpeneScore - 10) {
      loserReasons.push(`weaker terpene overlap (${loser.terpeneScore}% vs ${winner.terpeneScore}%)`);
    }
    if (loser.appearances < winner.appearances && winner.appearances >= 2) {
      loserReasons.push(`appeared in fewer images (${loser.appearances} vs ${winner.appearances})`);
    }

    if (loserReasons.length > 0) {
      if (loserReasons.includes("conflicting structure")) {
        reasons.push(`Secondary candidates showed conflicting structure`);
      } else {
        reasons.push(`${loser.strainName}: ${loserReasons.join(", ")} (${scoreGap.toFixed(1)} points lower)`);
      }
    } else {
      reasons.push(`${loser.strainName}: ${scoreGap.toFixed(1)} points lower overall score`);
    }
  }

  return reasons;
}

/**
 * Phase 5.9.2 — CONSENSUS NAME DECISION
 * 
 * Rules:
 * - If same name appears in ≥2 images → BOOST +15%
 * - If name appears in all images → BOOST +25%
 * - If aliases overlap (e.g. "OG Kush" / "Kush OG") → MERGE
 * - If no clear winner → label as "Closest Match: ⟨Name⟩ (Approximate)"
 */
function applyMultiImageConsensus(
  scoredCandidates: NameCandidate[],
  imageCount: number
): NameCandidate[] {
  if (imageCount === 1) {
    return scoredCandidates; // No consensus for single image
  }
  
  // Phase 5.9.2 — CONSENSUS NAME DECISION: Apply boosts based on appearance frequency
  const consensusAdjusted = scoredCandidates.map(candidate => {
    let consensusBonus = 0;
    
    // Phase 5.9.2 — If name appears in all images → BOOST +25%
    if (candidate.appearances === imageCount) {
      consensusBonus += 25;
      console.log(`Phase 5.9.2 — CONSENSUS: "${candidate.strainName}" appears in all ${imageCount} images (+25% boost)`);
    }
    // Phase 5.9.2 — If same name appears in ≥2 images → BOOST +15%
    else if (candidate.appearances >= 2) {
      consensusBonus += 15;
      console.log(`Phase 5.9.2 — CONSENSUS: "${candidate.strainName}" appears in ${candidate.appearances} images (+15% boost)`);
    } else if (candidate.appearances === 1 && imageCount > 1) {
      // Phase 5.9.2 — Penalty for one-off names
      consensusBonus -= 5; // Penalty for single appearance in multi-image scan
    }
    
    return {
      ...candidate,
      finalScore: candidate.finalScore + consensusBonus,
      consensusBoost: candidate.consensusBoost + consensusBonus, // Update consensus boost
    };
  });
  
  // Phase 5.9.2 — MERGE aliases (e.g. "OG Kush" / "Kush OG")
  const aliasMerged = mergeAliasMatches(consensusAdjusted);
  
  // Phase 5.9.2 — Re-sort by adjusted score
  aliasMerged.sort((a, b) => b.finalScore - a.finalScore);
  
  console.log("Phase 5.9.2 — CONSENSUS NAME DECISION: Applied agreement bonuses and merged aliases");
  
  return aliasMerged;
}

/**
 * Phase 5.9.2 — MERGE aliases (e.g. "OG Kush" / "Kush OG")
 */
function mergeAliasMatches(candidates: NameCandidate[]): NameCandidate[] {
  const merged = new Map<string, NameCandidate>();
  
  for (const candidate of candidates) {
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name.toLowerCase() === candidate.canonicalName.toLowerCase() ||
      s.aliases?.some(a => a.toLowerCase() === candidate.canonicalName.toLowerCase())
    );
    
    if (!dbEntry) {
      merged.set(candidate.canonicalName.toLowerCase(), candidate);
      continue;
    }
    
    // Phase 5.9.2 — Check if this is an alias of an existing candidate
    const canonicalKey = dbEntry.name.toLowerCase();
    const existing = merged.get(canonicalKey);
    
    if (existing) {
      // Phase 5.9.2 — Merge: combine appearances, scores, etc.
      existing.appearances += candidate.appearances;
      existing.finalScore = Math.max(existing.finalScore, candidate.finalScore) + 5; // Boost for alias match
      existing.consensusBoost = Math.max(existing.consensusBoost, candidate.consensusBoost);
      // Merge source signals
      if (candidate.sourceSignals) {
        existing.sourceSignals = Array.from(new Set([...(existing.sourceSignals || []), ...(candidate.sourceSignals || [])]));
      }
      console.log(`Phase 5.9.2 — MERGED ALIAS: "${candidate.strainName}" → "${existing.canonicalName}"`);
    } else {
      // Phase 5.9.2 — Use canonical name
      merged.set(canonicalKey, {
        ...candidate,
        canonicalName: dbEntry.name, // Use canonical name
        strainName: dbEntry.name, // Use canonical name
      });
    }
  }
  
  return Array.from(merged.values());
}

/**
 * Phase 8.3.2 — CROSS-IMAGE NAME VOTING
 * 
 * Across all images:
 * - Count frequency of each name
 * - Average confidence
 * - Boost names appearing in ≥2 images
 * - Penalize one-off names
 * 
 * Produce ranked list:
 * [
 *   { name, score, appearances }
 * ]
 */
function performCrossImageNameVoting(
  perImageNames: Array<{
    imageLabel: string;
    candidates: Array<{ name: string; confidence: number }>;
  }>
): Array<{
  name: string;
  score: number;
  appearances: number;
  avgConfidence: number;
}> {
  const nameVotes = new Map<string, {
    appearances: number;
    confidences: number[];
    imageIndices: number[];
  }>();
  
  // Phase 8.3.2 — Count frequency and collect confidences
  perImageNames.forEach((imageData, imageIndex) => {
    imageData.candidates.forEach(candidate => {
      const normalizedName = candidate.name.toLowerCase();
      const existing = nameVotes.get(normalizedName);
      
      if (existing) {
        existing.appearances++;
        existing.confidences.push(candidate.confidence);
        existing.imageIndices.push(imageIndex);
      } else {
        nameVotes.set(normalizedName, {
          appearances: 1,
          confidences: [candidate.confidence],
          imageIndices: [imageIndex],
        });
      }
    });
  });
  
  // Phase 8.3.2 — Calculate scores with boosts/penalties
  const rankedNames: Array<{
    name: string;
    score: number;
    appearances: number;
    avgConfidence: number;
  }> = [];
  
  nameVotes.forEach((vote, normalizedName) => {
    // Phase 8.3.2 — Average confidence
    const avgConfidence = vote.confidences.reduce((sum, c) => sum + c, 0) / vote.confidences.length;
    
    // Phase 8.3.2 — Base score from average confidence
    let score = avgConfidence;
    
    // Phase 8.3.2 — Boost names appearing in ≥2 images
    if (vote.appearances >= 2) {
      score += 10; // Boost for multi-image agreement
      console.log(`Phase 8.3.2 — BOOST: "${normalizedName}" appears in ${vote.appearances} images (+10%)`);
    }
    
    // Phase 8.3.2 — Penalize one-off names (if multiple images)
    if (vote.appearances === 1 && perImageNames.length > 1) {
      score -= 5; // Penalty for single-image outlier
      console.log(`Phase 8.3.2 — PENALTY: "${normalizedName}" appears in only 1 image (-5%)`);
    }
    
    // Phase 8.3.2 — Find original name (preserve casing)
    const originalName = perImageNames
      .flatMap(img => img.candidates)
      .find(c => c.name.toLowerCase() === normalizedName)?.name || normalizedName;
    
    rankedNames.push({
      name: originalName,
      score: Math.round(score),
      appearances: vote.appearances,
      avgConfidence: Math.round(avgConfidence),
    });
  });
  
  // Phase 8.3.2 — Sort by score (descending)
  rankedNames.sort((a, b) => b.score - a.score);
  
  console.log("Phase 8.3.2 — CROSS-IMAGE NAME VOTING:", rankedNames.slice(0, 5).map(n => 
    `${n.name} (score: ${n.score}, appearances: ${n.appearances})`
  ).join(", "));
  
  return rankedNames;
}

/**
 * Phase 8.3.3 — DATABASE RECONCILIATION
 * 
 * For top 3 names:
 * - Match against strain DB (35k)
 * - Merge aliases → canonical name
 * - Pull lineage, dominance, terpene hints
 * 
 * Discard:
 * - Names not found in DB (unless confidence > 90%)
 */
function performDatabaseReconciliation(
  rankedNames: Array<{
    name: string;
    score: number;
    appearances: number;
    avgConfidence: number;
  }>
): Array<{
  name: string;
  canonicalName: string;
  score: number;
  appearances: number;
  avgConfidence: number;
  dbEntry?: CultivarReference;
  lineage?: string;
  dominance?: string;
  terpeneHints?: string[];
}> {
  const reconciled: Array<{
    name: string;
    canonicalName: string;
    score: number;
    appearances: number;
    avgConfidence: number;
    dbEntry?: CultivarReference;
    lineage?: string;
    dominance?: string;
    terpeneHints?: string[];
  }> = [];
  
  rankedNames.forEach(ranked => {
    // Phase 8.3.3 — Match against strain DB
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name.toLowerCase() === ranked.name.toLowerCase() ||
      s.aliases?.some(a => a.toLowerCase() === ranked.name.toLowerCase())
    );
    
    // Phase 8.3.3 — Discard names not found in DB (unless confidence > 90%)
    if (!dbEntry) {
      if (ranked.avgConfidence > 90) {
        console.log(`Phase 8.3.3 — KEEPING: "${ranked.name}" not in DB but confidence > 90% (${ranked.avgConfidence}%)`);
        reconciled.push({
          name: ranked.name,
          canonicalName: ranked.name,
          score: ranked.score,
          appearances: ranked.appearances,
          avgConfidence: ranked.avgConfidence,
        });
      } else {
        console.log(`Phase 8.3.3 — DISCARDING: "${ranked.name}" not in DB and confidence ≤ 90% (${ranked.avgConfidence}%)`);
      }
      return;
    }
    
    // Phase 8.3.3 — Merge aliases → canonical name
    const canonicalName = dbEntry.name;
    
    // Phase 8.3.3 — Pull lineage, dominance, terpene hints
    const lineage = dbEntry.genetics || dbEntry.lineage || undefined;
    const dominance = dbEntry.type || dbEntry.dominantType || undefined;
    const terpeneHints = dbEntry.terpenes?.map(t => typeof t === 'string' ? t : t.name) || undefined;
    
    reconciled.push({
      name: ranked.name,
      canonicalName,
      score: ranked.score,
      appearances: ranked.appearances,
      avgConfidence: ranked.avgConfidence,
      dbEntry,
      lineage,
      dominance,
      terpeneHints,
    });
    
    console.log(`Phase 8.3.3 — RECONCILED: "${ranked.name}" → "${canonicalName}" (lineage: ${lineage || 'N/A'}, dominance: ${dominance || 'N/A'})`);
  });
  
  return reconciled;
}

/**
 * Phase 8.3.4 — FINAL NAME DECISION
 * 
 * Rules:
 * - Winner must beat runner-up by ≥8 points
 * - Otherwise mark as "Close Match"
 * - Never fabricate a name
 * 
 * Final output:
 * {
 *   primaryName: string,
 *   confidence: number,
 *   alternateMatches: string[]
 * }
 */
function makeFinalNameDecision(
  reconciledNames: Array<{
    name: string;
    canonicalName: string;
    score: number;
    appearances: number;
    avgConfidence: number;
    dbEntry?: CultivarReference;
    lineage?: string;
    dominance?: string;
    terpeneHints?: string[];
  }>
): {
  primaryName: string;
  confidence: number;
  alternateMatches: string[];
  isCloseMatch: boolean;
} {
  if (reconciledNames.length === 0) {
    // Phase 8.3.4 — Never fabricate a name
    console.log("Phase 8.3.4 — FINAL NAME DECISION: No reconciled names, returning fallback");
    return {
      primaryName: "Hybrid Cultivar",
      confidence: 60,
      alternateMatches: [],
      isCloseMatch: false,
    };
  }
  
  const winner = reconciledNames[0];
  const runnerUp = reconciledNames[1];
  
  // Phase 8.3.4 — Winner must beat runner-up by ≥8 points
  const scoreGap = winner.score - (runnerUp?.score || 0);
  const isCloseMatch = runnerUp && scoreGap < 8;
  
  if (isCloseMatch) {
    console.log(`Phase 8.3.4 — CLOSE MATCH: Winner "${winner.canonicalName}" (${winner.score}) beats runner-up "${runnerUp.canonicalName}" (${runnerUp.score}) by only ${scoreGap} points (<8)`);
  } else {
    console.log(`Phase 8.3.4 — CLEAR WINNER: "${winner.canonicalName}" (${winner.score}) beats runner-up by ${scoreGap} points (≥8)`);
  }
  
  // Phase 8.3.4 — Alternate matches (exclude winner)
  const alternateMatches = reconciledNames.slice(1, 4).map(n => n.canonicalName);
  
  return {
    primaryName: winner.canonicalName,
    confidence: Math.min(99, winner.avgConfidence), // Cap at 99%
    alternateMatches,
    isCloseMatch: isCloseMatch || false,
  };
}

/**
 * Phase 8.5.1 — NAME-FIRST PIPELINE
 * 
 * Before effects or visuals:
 * - Attempt name match using:
 *   • Database aliases
 *   • Slang / common names
 *   • Packaging-style titles
 *   • OCR-extracted text (if present)
 * 
 * Output top 5 candidates:
 * {
 *   name: string,
 *   matchStrength: number
 * }
 */
function performNameFirstPipeline(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures
): Array<{
  name: string;
  matchStrength: number;
  matchType: "alias" | "slang" | "packaging" | "ocr" | "database";
}> {
  const candidates: Array<{
    name: string;
    matchStrength: number;
    matchType: "alias" | "slang" | "common" | "packaging" | "ocr" | "database";
  }> = [];
  const candidateMap = new Map<string, { matchStrength: number; matchType: string }>();
  
  // Phase 8.5.1 — Extract candidate names from image results (database matches)
  imageResults.forEach(result => {
    result.candidateStrains.slice(0, 5).forEach(candidate => {
      const normalizedName = candidate.name.toLowerCase();
      const existing = candidateMap.get(normalizedName);
      
      if (existing) {
        existing.matchStrength = Math.max(existing.matchStrength, candidate.confidence);
      } else {
        candidateMap.set(normalizedName, {
          matchStrength: candidate.confidence,
          matchType: "database",
        });
      }
    });
  });
  
  // Phase 8.5.1 — Check for aliases in database
  candidateMap.forEach((value, normalizedName) => {
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name.toLowerCase() === normalizedName ||
      s.aliases?.some(a => a.toLowerCase() === normalizedName)
    );
    
    if (dbEntry) {
      // Phase 8.5.1 — Add canonical name
      const canonicalName = dbEntry.name.toLowerCase();
      if (canonicalName !== normalizedName) {
        const existing = candidateMap.get(canonicalName);
        if (existing) {
          existing.matchStrength = Math.max(existing.matchStrength, value.matchStrength);
        } else {
          candidateMap.set(canonicalName, {
            matchStrength: value.matchStrength * 0.95, // Slightly lower for alias
            matchType: "alias",
          });
        }
      }
      
      // Phase 8.5.1 — Add aliases
      if (dbEntry.aliases && dbEntry.aliases.length > 0) {
        dbEntry.aliases.forEach(alias => {
          const aliasNormalized = alias.toLowerCase();
          if (aliasNormalized !== normalizedName && aliasNormalized !== canonicalName) {
            const existing = candidateMap.get(aliasNormalized);
            if (!existing) {
              candidateMap.set(aliasNormalized, {
                matchStrength: value.matchStrength * 0.90, // Lower for alias
                matchType: "alias",
              });
            }
          }
        });
      }
    }
  });
  
  // Phase 8.5.1 — Check for slang/common names (common cannabis slang patterns)
  const slangPatterns = [
    { pattern: /kush/i, boost: 5 },
    { pattern: /og/i, boost: 5 },
    { pattern: /haze/i, boost: 5 },
    { pattern: /diesel/i, boost: 5 },
    { pattern: /berry/i, boost: 3 },
    { pattern: /cookies/i, boost: 3 },
  ];
  
  candidateMap.forEach((value, normalizedName) => {
    slangPatterns.forEach(slang => {
      if (slang.pattern.test(normalizedName)) {
        value.matchStrength += slang.boost;
        if (value.matchType === "database") {
          value.matchType = "slang";
        }
      }
    });
  });
  
  // Phase 8.5.1 — Convert to array and sort
  candidateMap.forEach((value, name) => {
    candidates.push({
      name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
      matchStrength: Math.min(100, value.matchStrength),
      matchType: value.matchType as "alias" | "slang" | "common" | "packaging" | "ocr" | "database",
    });
  });
  
  // Phase 8.5.1 — Sort by match strength and take top 5
  candidates.sort((a, b) => b.matchStrength - a.matchStrength);
  return candidates.slice(0, 5);
}

/**
 * Phase 8.5.2 — VISUAL CONFIRMATION
 * 
 * For each candidate:
 * - Compare expected morphology vs image signals
 * - Boost if ≥2 images align
 * - Penalize contradictions
 * 
 * Adjust score:
 * +15% strong visual agreement
 * −10% per contradiction
 */
function performVisualConfirmation(
  candidates: Array<{
    name: string;
    matchStrength: number;
    matchType: "alias" | "slang" | "common" | "packaging" | "ocr" | "database";
  }>,
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number
): Array<{
  name: string;
  matchStrength: number;
  adjustedScore: number;
  visualAgreement: number;
  contradictions: number;
  dbCompleteness: number;
}> {
  const adjusted: Array<{
    name: string;
    matchStrength: number;
    adjustedScore: number;
    visualAgreement: number;
    contradictions: number;
    dbCompleteness: number;
  }> = [];
  
  candidates.forEach(candidate => {
    // Phase 8.5.2 — Find database entry
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name.toLowerCase() === candidate.name.toLowerCase() ||
      s.aliases?.some(a => a.toLowerCase() === candidate.name.toLowerCase())
    );
    
    if (!dbEntry) {
      // Phase 8.5.2 — No DB entry, skip visual confirmation
      adjusted.push({
        name: candidate.name,
        matchStrength: candidate.matchStrength,
        adjustedScore: candidate.matchStrength,
        visualAgreement: 0,
        contradictions: 0,
        dbCompleteness: 0,
      });
      return;
    }
    
    // Phase 8.5.2 — Compare expected morphology vs image signals
    let visualAgreement = 0;
    let contradictions = 0;
    let agreementCount = 0;
    
    imageResults.forEach(result => {
      const traits = result.detectedTraits;
      const dbType = dbEntry.type || dbEntry.dominantType || "";
      
      // Phase 8.5.2 — Check leaf shape alignment
      if (traits.leafShape === "broad" && (dbType.includes("Indica") || dbType === "Indica")) {
        visualAgreement += 20;
        agreementCount++;
      } else if (traits.leafShape === "narrow" && (dbType.includes("Sativa") || dbType === "Sativa")) {
        visualAgreement += 20;
        agreementCount++;
      } else if (traits.leafShape === "broad" && dbType.includes("Sativa") && !dbType.includes("Hybrid")) {
        contradictions++;
      } else if (traits.leafShape === "narrow" && dbType === "Indica" && !dbType.includes("Hybrid")) {
        contradictions++;
      }
      
      // Phase 8.5.2 — Check bud structure alignment
      if (traits.budStructure === "high" && (dbType.includes("Indica") || dbType === "Indica")) {
        visualAgreement += 15;
        agreementCount++;
      } else if (traits.budStructure === "low" && (dbType.includes("Sativa") || dbType === "Sativa")) {
        visualAgreement += 15;
        agreementCount++;
      }
    });
    
    // Phase 8.5.2 — Calculate average visual agreement
    const avgVisualAgreement = imageResults.length > 0 ? visualAgreement / imageResults.length : 0;
    
    // Phase 8.5.2 — Boost if ≥2 images align
    let visualBoost = 0;
    if (agreementCount >= 2) {
      visualBoost = 15; // +15% strong visual agreement
    }
    
    // Phase 8.5.2 — Penalize contradictions
    const contradictionPenalty = contradictions * 10; // −10% per contradiction
    
    // Phase 8.5.2 — Calculate database completeness (0-100)
    let dbCompleteness = 0;
    if (dbEntry.genetics || dbEntry.lineage) dbCompleteness += 25;
    if (dbEntry.type || dbEntry.dominantType) dbCompleteness += 25;
    if (dbEntry.terpenes && dbEntry.terpenes.length > 0) dbCompleteness += 25;
    if (dbEntry.effects && dbEntry.effects.length > 0) dbCompleteness += 25;
    
    // Phase 8.5.2 — Adjust score
    const adjustedScore = Math.max(0, Math.min(100, candidate.matchStrength + visualBoost - contradictionPenalty));
    
    adjusted.push({
      name: candidate.name,
      matchStrength: candidate.matchStrength,
      adjustedScore,
      visualAgreement: Math.round(avgVisualAgreement),
      contradictions,
      dbCompleteness,
    });
  });
  
  return adjusted;
}

/**
 * Phase 8.5.3 — CONSENSUS CONFIDENCE
 * 
 * Combine:
 * - Name match strength (50%)
 * - Visual agreement (30%)
 * - Database completeness (20%)
 * 
 * Rules:
 * - Never exceed 99%
 * - Single image cap: 82%
 * - 2 images cap: 90%
 * - 3–5 images cap: 97–99%
 */
function calculateConsensusConfidence(
  visualAdjustedCandidates: Array<{
    name: string;
    matchStrength: number;
    adjustedScore: number;
    visualAgreement: number;
    contradictions: number;
    dbCompleteness: number;
  }>,
  imageCount: number
): Array<{
  name: string;
  confidence: number;
  visualAgreement: number;
  dbCompleteness: number;
}> {
  const confidenceResults: Array<{
    name: string;
    confidence: number;
    visualAgreement: number;
    dbCompleteness: number;
  }> = [];
  
  visualAdjustedCandidates.forEach(candidate => {
    // Phase 8.5.3 — Combine: Name match strength (50%), Visual agreement (30%), Database completeness (20%)
    const nameMatchWeight = candidate.matchStrength * 0.5;
    const visualWeight = candidate.visualAgreement * 0.3;
    const dbWeight = candidate.dbCompleteness * 0.2;
    
    let confidence = nameMatchWeight + visualWeight + dbWeight;
    
    // Phase 8.5.3 — Apply caps based on image count
    if (imageCount === 1) {
      confidence = Math.min(82, confidence); // Single image cap: 82%
    } else if (imageCount === 2) {
      confidence = Math.min(90, confidence); // 2 images cap: 90%
    } else if (imageCount >= 3 && imageCount <= 5) {
      confidence = Math.min(99, confidence); // 3–5 images cap: 97–99%
    }
    
    // Phase 8.5.3 — Never exceed 99%
    confidence = Math.min(99, confidence);
    
    confidenceResults.push({
      name: candidate.name,
      confidence: Math.round(confidence),
      visualAgreement: candidate.visualAgreement,
      dbCompleteness: candidate.dbCompleteness,
    });
  });
  
  // Phase 8.5.3 — Sort by confidence
  confidenceResults.sort((a, b) => b.confidence - a.confidence);
  
  return confidenceResults;
}

/**
 * Phase 8.5.4 — FALLBACK LOGIC
 * 
 * If no name >70%:
 * - Output "Closest Known Matches"
 * - Show top 3 with explanations
 * - Never show "Unknown" if DB >10k
 */
function applyFallbackLogic(
  confidenceResults: Array<{
    name: string;
    confidence: number;
    visualAgreement: number;
    dbCompleteness: number;
  }>,
  imageCount: number
): {
  primaryMatch: { name: string; confidence: number };
  alternateMatches: Array<{ name: string; confidence: number }>;
  isFallback: boolean;
} {
  const dbSize = CULTIVAR_LIBRARY.length;
  const topCandidate = confidenceResults[0];
  
  // Phase 8.5.4 — If no name >70%, use fallback logic
  if (!topCandidate || topCandidate.confidence <= 70) {
    // Phase 8.5.4 — Never show "Unknown" if DB >10k
    if (dbSize >= 10000 && confidenceResults.length > 0) {
      // Phase 8.5.4 — Output "Closest Known Matches" with top 3
      const top3 = confidenceResults.slice(0, 3);
      return {
        primaryMatch: {
          name: top3[0]?.name || "Hybrid Cultivar",
          confidence: top3[0]?.confidence || 60,
        },
        alternateMatches: top3.slice(1).map(c => ({
          name: c.name,
          confidence: c.confidence,
        })),
        isFallback: true,
      };
    } else {
      // Phase 8.5.4 — DB too small, use generic fallback
      return {
        primaryMatch: {
          name: "Hybrid Cultivar",
          confidence: 60,
        },
        alternateMatches: [],
        isFallback: true,
      };
    }
  }
  
  // Phase 8.5.4 — Normal case: top candidate >70%
  return {
    primaryMatch: {
      name: topCandidate.name,
      confidence: topCandidate.confidence,
    },
    alternateMatches: confidenceResults.slice(1, 4).map(c => ({
      name: c.name,
      confidence: c.confidence,
    })),
    isFallback: false,
  };
}

/**
 * Phase 8.1.2 — CONSENSUS NAME ENGINE
 * 
 * Across all images:
 * 1. Count frequency of each name
 * 2. Boost names appearing in ≥2 images
 * 3. Penalize single-image outliers
 * 4. Select PRIMARY_NAME (highest weighted score)
 */
function buildConsensusNameEngine(
  scoredCandidates: NameCandidate[],
  imageCount: number
): {
  primaryName: string;
  confidence: number;
  alternates: string[];
} {
  // Phase 8.1.2 — 1. Count frequency of each name
  const nameFrequency = new Map<string, number>();
  scoredCandidates.forEach(candidate => {
    nameFrequency.set(candidate.canonicalName, (nameFrequency.get(candidate.canonicalName) || 0) + candidate.appearances);
  });
  
  // Phase 8.1.2 — 2. Boost names appearing in ≥2 images
  // Phase 8.1.2 — 3. Penalize single-image outliers
  const adjustedCandidates = scoredCandidates.map(candidate => {
    const frequency = nameFrequency.get(candidate.canonicalName) || 0;
    let adjustedScore = candidate.finalScore;
    
    if (frequency >= 2) {
      // Phase 8.1.2 — Boost names appearing in ≥2 images
      adjustedScore += 10; // Boost for multi-image agreement
      console.log(`Phase 8.1.2 — BOOST: "${candidate.canonicalName}" appears in ${frequency} images (+10%)`);
    } else if (frequency === 1 && imageCount > 1) {
      // Phase 8.1.2 — Penalize single-image outliers
      adjustedScore -= 5; // Penalty for single-image outlier
      console.log(`Phase 8.1.2 — PENALTY: "${candidate.canonicalName}" appears in only 1 image (-5%)`);
    }
    
    return {
      ...candidate,
      finalScore: adjustedScore,
    };
  });
  
  // Phase 8.1.2 — 4. Select PRIMARY_NAME (highest weighted score)
  adjustedCandidates.sort((a, b) => b.finalScore - a.finalScore);
  const winner = adjustedCandidates[0];
  const alternates = adjustedCandidates.slice(1, 4).map(c => c.canonicalName);
  
  return {
    primaryName: winner.canonicalName,
    confidence: Math.round(winner.finalScore),
    alternates,
  };
}

/**
 * Phase 8.1.3 — DATABASE CROSS-CHECK
 * 
 * Validate PRIMARY_NAME against strain DB:
 * - Exact match → confidence +5%
 * - Alias match → confidence +3%
 * - No match → confidence cap at 85%
 */
function validatePrimaryNameAgainstDatabase(
  primaryName: string,
  baseConfidence: number
): {
  validatedName: string;
  validatedConfidence: number;
  matchType: "exact" | "alias" | "no_match";
} {
  const dbEntry = CULTIVAR_LIBRARY.find(s => 
    s.name.toLowerCase() === primaryName.toLowerCase() ||
    s.aliases?.some(a => a.toLowerCase() === primaryName.toLowerCase())
  );
  
  if (!dbEntry) {
    // Phase 8.1.3 — No match → confidence cap at 85%
    console.log("Phase 8.1.3 — DATABASE CROSS-CHECK: No match found, capping confidence at 85%");
    return {
      validatedName: primaryName,
      validatedConfidence: Math.min(85, baseConfidence),
      matchType: "no_match",
    };
  }
  
  // Phase 8.1.3 — Exact match → confidence +5%
  if (dbEntry.name.toLowerCase() === primaryName.toLowerCase()) {
    console.log("Phase 8.1.3 — DATABASE CROSS-CHECK: Exact match found, confidence +5%");
    return {
      validatedName: dbEntry.name, // Use canonical name
      validatedConfidence: Math.min(99, baseConfidence + 5),
      matchType: "exact",
    };
  }
  
  // Phase 8.1.3 — Alias match → confidence +3%
  if (dbEntry.aliases?.some(a => a.toLowerCase() === primaryName.toLowerCase())) {
    console.log("Phase 8.1.3 — DATABASE CROSS-CHECK: Alias match found, confidence +3%");
    return {
      validatedName: dbEntry.name, // Use canonical name
      validatedConfidence: Math.min(99, baseConfidence + 3),
      matchType: "alias",
    };
  }
  
  // Fallback
  return {
    validatedName: primaryName,
    validatedConfidence: Math.min(85, baseConfidence),
    matchType: "no_match",
  };
}

/**
 * Phase 5.0.6 — Main function: Name-First Matching & Strain Disambiguation Engine
 * Phase 5.3 — Enhanced with Wiki cross-check and multi-image consensus
 * Phase 8.1 — Enhanced with per-image candidates and database cross-check
 */
export function runNameMatchEngine(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number,
  terpeneProfile?: NormalizedTerpeneProfile
): NameMatchResult {
  // Phase 8.5.1 — NAME-FIRST PIPELINE: Before effects or visuals
  // Attempt name match using:
  // • Database aliases
  // • Slang / common names
  // • Packaging-style titles
  // • OCR-extracted text (if present)
  const nameFirstCandidates = performNameFirstPipeline(imageResults, fusedFeatures);
  
  console.log("NAME CANDIDATES:", nameFirstCandidates.map(c => `${c.name} (${c.matchStrength}%)`).join(", "));
  
  // Phase 8.5.2 — VISUAL CONFIRMATION: Compare expected morphology vs image signals
  const visualAdjustedCandidates = performVisualConfirmation(nameFirstCandidates, imageResults, fusedFeatures, imageCount);
  
  console.log("NAME VISUAL ADJUSTED:", visualAdjustedCandidates.map(c => `${c.name} (${c.adjustedScore}%)`).join(", "));
  
  // Phase 8.5.3 — CONSENSUS CONFIDENCE: Combine name match strength (50%), visual agreement (30%), database completeness (20%)
  const consensusConfidenceResult = calculateConsensusConfidence(visualAdjustedCandidates, imageCount);
  
  // Phase 8.5.4 — FALLBACK LOGIC: If no name >70%, output "Closest Known Matches"
  const finalNameResult = applyFallbackLogic(consensusConfidenceResult, imageCount);
  
  console.log("NAME FINAL:", JSON.stringify(finalNameResult));
  
  // Phase 8.3.1 — CANDIDATE NAME POOL: Generate per-image candidates with aliases & spelling variants (legacy)
  const perImageNames = generatePerImageNameCandidates(imageResults);
  
  // Phase 8.3.2 — CROSS-IMAGE NAME VOTING: Count frequency, average confidence, boost/penalize (legacy)
  const rankedNames = performCrossImageNameVoting(perImageNames);
  
  // Phase 8.3.3 — DATABASE RECONCILIATION: Match top 3 against strain DB, merge aliases (legacy)
  const reconciledNames = performDatabaseReconciliation(rankedNames.slice(0, 3));
  
  // Phase 8.3.4 — FINAL NAME DECISION: Winner must beat runner-up by ≥8 points (legacy)
  const finalNameDecision = makeFinalNameDecision(reconciledNames);
  
  console.log("NAME CONSENSUS:", JSON.stringify(finalNameDecision));
  
  // Phase 8.5.4 — Use Step 8.5 result if available and confidence > 70%, otherwise use Step 8.3 result
  if (finalNameResult.primaryMatch.confidence > 70) {
    // Phase 8.5.5 — VIEWMODEL UPDATE: Return result compatible with existing structure
    return {
      primaryName: finalNameResult.primaryMatch.name,
      confidence: finalNameResult.primaryMatch.confidence,
      confidencePercent: finalNameResult.primaryMatch.confidence,
      matchType: finalNameResult.primaryMatch.confidence >= 90 ? "Exact" : finalNameResult.primaryMatch.confidence >= 75 ? "Likely" : "Approximate",
      strainTitle: finalNameResult.primaryMatch.confidence >= 90 ? "Closest Known Match" : "Likely Match",
      alternates: finalNameResult.alternateMatches.map(alt => ({
        name: alt.name,
        confidence: alt.confidence,
        score: alt.confidence,
        reason: `Visual agreement: ${alt.confidence}%`,
        whyNotPrimary: `Score gap: ${finalNameResult.primaryMatch.confidence - alt.confidence} points`,
      })),
      alternateMatches: finalNameResult.alternateMatches.map(alt => ({
        name: alt.name,
        score: alt.confidence,
        whyNotPrimary: `Score gap: ${finalNameResult.primaryMatch.confidence - alt.confidence} points`,
      })),
      explanation: {
        whyThisNameWon: [
          `Name match strength: ${finalNameResult.primaryMatch.confidence}%`,
          `Visual agreement: ${visualAdjustedCandidates.find(c => c.name === finalNameResult.primaryMatch.name)?.visualAgreement || 0}%`,
          `Database completeness: ${visualAdjustedCandidates.find(c => c.name === finalNameResult.primaryMatch.name)?.dbCompleteness || 0}%`,
        ],
        whyOthersLost: finalNameResult.alternateMatches.map(alt => 
          `"${alt.name}" scored ${alt.confidence}% (gap: ${finalNameResult.primaryMatch.confidence - alt.confidence} points)`
        ),
      },
    };
  }
  
  // Phase 8.3.4 — Use final name decision if available, otherwise fall back to legacy path
  if (reconciledNames.length > 0 && finalNameDecision.primaryName !== "Hybrid Cultivar") {
    // Phase 8.3.5 — VIEWMODEL LOCK: Return result compatible with existing structure
    return {
      primaryName: finalNameDecision.primaryName,
      confidence: finalNameDecision.confidence,
      confidencePercent: finalNameDecision.confidence,
      matchType: finalNameDecision.isCloseMatch ? "Approximate" : "Likely",
      strainTitle: finalNameDecision.isCloseMatch ? "Likely Match (Close)" : "Closest Known Match",
      alternates: finalNameDecision.alternateMatches.map(name => ({
        name,
        confidence: reconciledNames.find(n => n.canonicalName === name)?.avgConfidence || 70,
        score: reconciledNames.find(n => n.canonicalName === name)?.score || 70,
        reason: `Appeared in ${reconciledNames.find(n => n.canonicalName === name)?.appearances || 1} image(s)`,
        whyNotPrimary: `Score gap: ${finalNameDecision.confidence - (reconciledNames.find(n => n.canonicalName === name)?.avgConfidence || 0)} points`,
      })),
      alternateMatches: finalNameDecision.alternateMatches.map(name => ({
        name,
        score: reconciledNames.find(n => n.canonicalName === name)?.score || 70,
        whyNotPrimary: `Score gap: ${finalNameDecision.confidence - (reconciledNames.find(n => n.canonicalName === name)?.avgConfidence || 0)} points`,
      })),
      explanation: {
        whyThisNameWon: [
          `Appeared in ${reconciledNames.find(n => n.canonicalName === finalNameDecision.primaryName)?.appearances || 1} image(s)`,
          `Average confidence: ${finalNameDecision.confidence}%`,
          finalNameDecision.isCloseMatch ? "Close match with runner-up" : "Clear winner with significant score gap",
        ],
        whyOthersLost: finalNameDecision.alternateMatches.map(name => 
          `"${name}" scored ${reconciledNames.find(n => n.canonicalName === name)?.score || 0} points (gap: ${finalNameDecision.confidence - (reconciledNames.find(n => n.canonicalName === name)?.avgConfidence || 0)} points)`
        ),
      },
    };
  }
  
  // Phase 5.0.6.1 — Generate name candidates (legacy path for compatibility)
  const candidates = generateNameCandidates(imageResults, fusedFeatures, terpeneProfile);

  if (candidates.length === 0) {
    // Fallback
    return {
      primaryName: "Hybrid Cultivar",
      confidencePercent: 60,
      alternateMatches: [],
      explanation: {
        whyThisNameWon: ["No candidates found in database"],
        whyOthersLost: [],
      },
    };
  }

  // Phase 5.0.6.2 — Score all candidates
  let scoredCandidates = scoreNameCandidates(candidates, fusedFeatures, terpeneProfile, imageCount);

  if (scoredCandidates.length === 0) {
    // Fallback
    return {
      primaryName: candidates[0]?.strainName || "Hybrid Cultivar",
      confidencePercent: 60,
      confidence: 60, // Phase 5.0.8.4
      alternateMatches: [],
      alternates: [], // Phase 5.0.8.4
      explanation: {
        whyThisNameWon: ["Top candidate from initial pool"],
        whyOthersLost: [],
      },
    };
  }

  // Phase 5.3.2 — Apply disambiguation engine
  scoredCandidates = applyDisambiguationEngine(scoredCandidates, fusedFeatures, terpeneProfile, imageCount);
  
  // Phase 5.3.3 — WIKI + AI CROSS-CHECK (for top 3 candidates)
  // Build dbEntries map for wiki lookup
  const dbEntries = new Map<string, CultivarReference>();
  scoredCandidates.forEach(candidate => {
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name.toLowerCase() === candidate.canonicalName.toLowerCase() ||
      s.aliases?.some(a => a.toLowerCase() === candidate.canonicalName.toLowerCase())
    );
    if (dbEntry) {
      dbEntries.set(candidate.canonicalName.toLowerCase(), dbEntry);
    }
  });
  
  scoredCandidates = performWikiCrossCheck(scoredCandidates, fusedFeatures, dbEntries);
  
  // Phase 5.3.4 — CONSENSUS WITH MULTI-IMAGE
  scoredCandidates = applyMultiImageConsensus(scoredCandidates, imageCount);

  // Phase 5.0.6.3 — Check disambiguation
  const disambiguation = checkDisambiguation(scoredCandidates);

  // Phase 8.1.2 — CONSENSUS NAME ENGINE: Build consensus from scored candidates
  const nameConsensus = buildConsensusNameEngine(scoredCandidates, imageCount);
  
  console.log("NAME CONSENSUS:", JSON.stringify(nameConsensus));
  
  // Phase 8.1.3 — DATABASE CROSS-CHECK: Validate PRIMARY_NAME against strain DB
  const validatedName = validatePrimaryNameAgainstDatabase(nameConsensus.primaryName, nameConsensus.confidence);
  
  // Phase 5.0.6.4 — Select winner (use validated name)
  const winner = scoredCandidates.find(c => c.canonicalName.toLowerCase() === validatedName.validatedName.toLowerCase()) || scoredCandidates[0];
  const dbEntry = CULTIVAR_LIBRARY.find(s => 
    s.name.toLowerCase() === validatedName.validatedName.toLowerCase() ||
    s.aliases?.some(a => a.toLowerCase() === validatedName.validatedName.toLowerCase())
  );

  if (!dbEntry) {
    throw new Error(`Phase 8.1.3 — Database entry not found for validated name: ${validatedName.validatedName}`);
  }

  // Phase 8.1.3 — Start with validated confidence from database cross-check
  let confidencePercent = validatedName.validatedConfidence;
  
  // Phase 5.5.3 — Additional adjustments based on score gap and multi-image agreement
  const topScore = winner.finalScore;
  const secondScore = scoredCandidates[1]?.finalScore || 0;
  const scoreGap = topScore - secondScore;
  const gapPercent = (scoreGap / topScore) * 100;
  
  // Phase 5.5.3 — Multi-image agreement boost
  const hasMultiImageAgreement = winner.appearances >= 2;
  const hasStrongAgreement = winner.appearances >= 3;
  
  if (hasStrongAgreement) {
    confidencePercent += 2; // Additional boost for 3+ images
  } else if (hasMultiImageAgreement) {
    confidencePercent += 1; // Additional boost for 2 images
  }
  
  // Phase 5.9.3 — CONFIDENCE CAPS
  // - Single image → max 82%
  // - Two images → max 90%
  // - Three+ images → max 97–99%
  // - Never show 100%
  
  if (imageCount === 1) {
    confidencePercent = Math.min(82, confidencePercent);
  } else if (imageCount === 2) {
    confidencePercent = Math.min(90, confidencePercent);
  } else if (imageCount >= 3) {
    confidencePercent = Math.min(99, confidencePercent); // 97-99% for 3+ images
  }
  
  // Phase 5.9.3 — Never show 100%
  confidencePercent = Math.min(99, confidencePercent);
  
  // Phase 5.9.4 — STRAIN TITLE FORMAT: Determine match type
  let matchType: "Exact" | "Likely" | "Approximate";
  let strainTitle: string;
  
  // Phase 5.9.2 — If no clear winner (top 2 are close), label as "Approximate"
  if (confidencePercent >= 90 && gapPercent > 10) {
    matchType = "Exact";
    strainTitle = "Closest Known Match";
  } else if (confidencePercent >= 75 && gapPercent > 5) {
    matchType = "Likely";
    strainTitle = "Closest Known Match";
  } else {
    matchType = "Approximate";
    strainTitle = "Likely Match (Approximate)";
  }
  
  // Phase 5.7.3 — Determine confidence tier label (legacy compatibility)
  let confidenceTierLabel: string;
  if (confidencePercent >= 95) {
    confidenceTierLabel = `Very likely: ${winner.canonicalName}`;
  } else if (confidencePercent >= 85) {
    confidenceTierLabel = `Closest match: ${winner.canonicalName}`;
  } else if (confidencePercent >= 70) {
    confidenceTierLabel = `Possible match: ${winner.canonicalName}`;
  } else {
    confidenceTierLabel = `Uncertain hybrid — closest family shown: ${winner.canonicalName}`;
  }
  
  console.log("Phase 5.9.3 — CONFIDENCE CAP:", confidencePercent, "% (imageCount:", imageCount, ")");
  console.log("Phase 5.9.4 — STRAIN TITLE:", strainTitle);
  console.log("MATCH TYPE:", matchType);

  // Phase 5.5.2 — CONFUSION SET: Generate primary match + 2-4 close alternates
  // Each alternate must include:
  // - Why it was close
  // - Why it lost
  const alternateMatches = scoredCandidates.slice(1, 5).map(loser => {
    const scoreGap = winner.finalScore - loser.finalScore;
    const whyClose: string[] = [];
    const whyLost: string[] = [];
    
    // Phase 5.5.2 — Why it was close
    if (scoreGap <= 8) {
      whyClose.push("score within 8 points");
    }
    if (loser.visualScore >= winner.visualScore - 5) {
      whyClose.push("similar visual traits");
    }
    if (loser.geneticsScore >= winner.geneticsScore - 5) {
      whyClose.push("similar lineage");
    }
    if (loser.appearances >= 2 && winner.appearances >= 2) {
      whyClose.push("appeared in multiple images");
    }
    
    // Phase 5.5.2 — Why it lost
    if (loser.visualScore < winner.visualScore - 10) {
      whyLost.push(`weaker visual match (${loser.visualScore}% vs ${winner.visualScore}%)`);
    }
    if (loser.geneticsScore < winner.geneticsScore - 10) {
      whyLost.push(`weaker genetic alignment (${loser.geneticsScore}% vs ${winner.geneticsScore}%)`);
    }
    if (loser.terpeneScore < winner.terpeneScore - 10) {
      whyLost.push(`weaker terpene overlap (${loser.terpeneScore}% vs ${winner.terpeneScore}%)`);
    }
    if (loser.appearances < winner.appearances && winner.appearances >= 2) {
      whyLost.push(`appeared in fewer images (${loser.appearances} vs ${winner.appearances})`);
    }
    if (scoreGap > 8) {
      whyLost.push(`${scoreGap.toFixed(1)} points lower overall score`);
    }
    
    const whyCloseText = whyClose.length > 0 ? `Close because: ${whyClose.join(", ")}. ` : "";
    const whyLostText = whyLost.length > 0 ? `Lost because: ${whyLost.join(", ")}.` : `Lost because: ${scoreGap.toFixed(1)} points lower overall score.`;
    
    return {
      name: loser.strainName,
      score: loser.finalScore,
      whyNotPrimary: `${whyCloseText}${whyLostText}`,
      whyClose: whyClose.length > 0 ? whyClose.join(", ") : undefined, // Phase 5.5.2
      whyLost: whyLost.join(", "), // Phase 5.5.2
    };
  });

  // Phase 5.5.2 — Build alternates with reason field
  const alternates = alternateMatches.map(alt => ({
    name: alt.name,
    confidence: alt.score,
    score: alt.score, // Keep for compatibility
    reason: alt.whyNotPrimary,
    whyNotPrimary: alt.whyNotPrimary, // Keep for compatibility
    whyClose: alt.whyClose, // Phase 5.5.2
    whyLost: alt.whyLost, // Phase 5.5.2
  }));

  // Phase 5.1.4 — Generate explanations
  const whyThisNameWon = generateWhyThisNameWon(winner, dbEntry, imageCount);
  const whyOthersLost = generateWhyOthersLost(winner, scoredCandidates.slice(1));
  
  // Phase 5.5.5 — USER LANGUAGE: Plain English explanation
  // "This most closely matches **Blue Dream** due to leaf structure,
  // bud density, and terpene alignment. It was briefly compared against
  // X and Y but differed in Z."
  const primaryReasons = whyThisNameWon.slice(0, 3).map(r => r.toLowerCase());
  const primaryReasonText = primaryReasons.length > 0 
    ? primaryReasons.join(", ")
    : "visual and genetic similarity";
  
  const alternateNames = alternateMatches.slice(0, 2).map(a => a.name);
  const alternateText = alternateNames.length > 0
    ? alternateNames.join(" and ")
    : "other candidates";
  
  const alternateDifferences = alternateMatches.slice(0, 2).map(a => {
    if (a.whyLost) {
      // Extract key difference from whyLost
      if (a.whyLost.includes("weaker visual match")) {
        return "visual structure";
      } else if (a.whyLost.includes("weaker genetic alignment")) {
        return "genetic lineage";
      } else if (a.whyLost.includes("weaker terpene overlap")) {
        return "terpene profile";
      } else if (a.whyLost.includes("fewer images")) {
        return "image agreement";
      }
      return "overall score";
    }
    return "overall score";
  });
  
  const differenceText = alternateDifferences.length > 0
    ? alternateDifferences.join(" and ")
    : "overall characteristics";
  
  const userLanguage = `This most closely matches **${winner.canonicalName}** due to ${primaryReasonText}. It was briefly compared against ${alternateText} but differed in ${differenceText}.`;
  
  console.log("Phase 5.5.5 — USER LANGUAGE:", userLanguage);

  // Phase 5.0.6.3 — Add disambiguation note if closely related
  if (disambiguation.isCloselyRelated) {
    whyThisNameWon.push(`Closely related to ${disambiguation.closelyRelatedName} (within 5% score difference)`);
  }

  // Phase 5.9 — MANDATORY LOGS
  console.log("NAME CANDIDATES:", scoredCandidates.slice(0, 5).map(c => `${c.strainName} (${c.finalScore.toFixed(1)})`).join(", "));
  console.log("FINAL STRAIN NAME:", winner.canonicalName);
  console.log("MATCH TYPE:", matchType);
  
  console.log("Phase 5.1.4 — FINAL NAME SELECTION:", winner.strainName, `(${confidencePercent}% confidence)`);
  console.log("FINAL STRAIN NAME:", winner.strainName);

  return {
    primaryName: validatedName.validatedName, // Phase 8.1.3 — Use validated name
    confidencePercent,
    confidence: confidencePercent, // Phase 5.0.8.4
    confidenceTierLabel, // Phase 5.7.3 — Confidence tier label
    matchType, // Phase 5.9.4 — Match type (Exact | Likely | Approximate)
    strainTitle, // Phase 5.9.4 — Strain title format
    databaseMatchType: validatedName.matchType, // Phase 8.1.3 — Database cross-check match type
    alternateMatches,
    alternates: nameConsensus.alternates.map(name => ({ // Phase 8.1.2 — Use consensus alternates
      name,
      confidence: scoredCandidates.find(c => c.canonicalName === name)?.finalScore || 0,
      score: scoredCandidates.find(c => c.canonicalName === name)?.finalScore || 0,
      reason: `Appeared in ${scoredCandidates.find(c => c.canonicalName === name)?.appearances || 0} image(s)`,
      whyNotPrimary: `Appeared in ${scoredCandidates.find(c => c.canonicalName === name)?.appearances || 0} image(s), lower weighted score`,
    })),
    explanation: {
      whyThisNameWon,
      whyOthersLost,
    },
    isCloselyRelated: disambiguation.isCloselyRelated,
    closelyRelatedName: disambiguation.closelyRelatedName,
    userLanguage, // Phase 5.5.5 — Plain English explanation
  };
}
