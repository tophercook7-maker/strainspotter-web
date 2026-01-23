// lib/scanner/nameConfidenceV82.ts
// Phase 8.2 — Strain Name Confidence & Disambiguation Engine

import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { NameFirstResultV80 } from "./nameFirstV80";
import type { StrainRatioV81 } from "./ratioEngineV81";
import type { CultivarReference } from "./cultivarLibrary";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 8.2 — Name Candidate Entry
 */
export type NameCandidateV82 = {
  strainName: string;
  canonicalName: string;
  aliases: string[];
  imageAgreementCount: number; // How many images this appeared in
  averageConfidence: number; // Average confidence across appearances
  maxConfidence: number; // Highest single-image confidence
  databasePresence: boolean; // Exists in 35k DB
  morphologyConsistency: number; // 0-100 alignment with visual features
  terpeneConsistency: number; // 0-100 alignment with terpene profile
  totalWeightedScore: number; // Final weighted score
  appearances: Array<{
    imageIndex: number;
    confidence: number;
    rank: number; // 1-5 (top 5 per image)
  }>;
};

/**
 * Phase 8.2 — Result
 */
export type NameConfidenceResultV82 = {
  primaryName: {
    name: string;
    confidence: number; // 55-99 (never 100)
    confidenceTier: "very_high" | "high" | "medium" | "low";
    matchType: "exact" | "very_close" | "close_family" | "closest_known";
    alsoKnownAs?: string[];
  };
  alternateMatches: Array<{
    name: string;
    confidence: number;
    whyNotPrimary: string; // Specific reason (e.g., "Appeared in fewer images", "Lower morphology alignment")
    difference: string; // What differs (e.g., "Different leaf shape", "Terpene profile skew")
  }>; // 2-4 names
  explanation: string; // One-sentence explanation for UI
  isAmbiguous: boolean; // True if close contenders exist
  confidenceBreakdown: {
    imageAgreement: number; // Contribution from multi-image agreement
    databasePresence: number; // Contribution from DB match
    morphologyAlignment: number; // Contribution from visual features
    terpeneAlignment: number; // Contribution from terpene profile
  };
};

/**
 * Phase 8.2 Step 8.2.1 — NAME CANDIDATE POOL
 * 
 * From previous phases, collect:
 * - Top 5 strain names per image
 * - Confidence score per image
 * - Database match strength
 * - Visual + terpene alignment
 */
function buildNameCandidatePoolV82(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  terpeneProfile?: Array<{ name: string; likelihood: string }>,
  nameFirstV80Result?: NameFirstResultV80
): NameCandidateV82[] {
  const candidateMap = new Map<string, NameCandidateV82>();

  // Phase 8.2.1 — Collect top 5 candidates from each image
  imageResults.forEach((imageResult, imageIndex) => {
    const top5Candidates = imageResult.candidateStrains.slice(0, 5);
    
    top5Candidates.forEach((candidate, rank) => {
      const normalizedName = candidate.name.trim();
      
      // Phase 8.2.1 — Find canonical name and aliases from database
      const dbEntry = CULTIVAR_LIBRARY.find(s =>
        s.name.toLowerCase() === normalizedName.toLowerCase() ||
        (s.aliases && s.aliases.some(a => a.toLowerCase() === normalizedName.toLowerCase()))
      );
      
      const canonicalName = dbEntry?.name || normalizedName;
      const aliases = dbEntry?.aliases || [];
      
      // Phase 8.2.1 — Get or create candidate entry
      const existing = candidateMap.get(canonicalName.toLowerCase());
      
      if (existing) {
        // Add appearance
        existing.appearances.push({
          imageIndex,
          confidence: candidate.confidence,
          rank: rank + 1, // 1-5
        });
        existing.imageAgreementCount++;
        // Recalculate average confidence
        const totalConfidence = existing.appearances.reduce((sum, a) => sum + a.confidence, 0);
        existing.averageConfidence = totalConfidence / existing.appearances.length;
        existing.maxConfidence = Math.max(existing.maxConfidence, candidate.confidence);
      } else {
        // Create new candidate
        candidateMap.set(canonicalName.toLowerCase(), {
          strainName: normalizedName,
          canonicalName,
          aliases: [...aliases, normalizedName],
          imageAgreementCount: 1,
          averageConfidence: candidate.confidence,
          maxConfidence: candidate.confidence,
          databasePresence: !!dbEntry,
          morphologyConsistency: 0, // Will be calculated later
          terpeneConsistency: 0, // Will be calculated later
          totalWeightedScore: 0, // Will be calculated later
          appearances: [{
            imageIndex,
            confidence: candidate.confidence,
            rank: rank + 1,
          }],
        });
      }
    });
  });

  // Phase 8.2.1 — Also include candidates from Phase 8.0 if available
  if (nameFirstV80Result) {
    const allNames = [
      nameFirstV80Result.primaryMatch.name,
      ...nameFirstV80Result.alternateMatches.map(a => a.name),
    ];
    
    allNames.forEach(name => {
      const normalizedName = name.trim();
      const dbEntry = CULTIVAR_LIBRARY.find(s =>
        s.name.toLowerCase() === normalizedName.toLowerCase() ||
        (s.aliases && s.aliases.some(a => a.toLowerCase() === normalizedName.toLowerCase()))
      );
      
      const canonicalName = dbEntry?.name || normalizedName;
      const existing = candidateMap.get(canonicalName.toLowerCase());
      
      if (!existing) {
        // Add Phase 8.0 candidate even if not in top 5 per image
        candidateMap.set(canonicalName.toLowerCase(), {
          strainName: normalizedName,
          canonicalName,
          aliases: dbEntry?.aliases || [],
          imageAgreementCount: 0, // Not from image results
          averageConfidence: nameFirstV80Result.primaryMatch.name === name
            ? nameFirstV80Result.primaryMatch.confidence
            : nameFirstV80Result.alternateMatches.find(a => a.name === name)?.confidence || 70,
          maxConfidence: nameFirstV80Result.primaryMatch.name === name
            ? nameFirstV80Result.primaryMatch.confidence
            : nameFirstV80Result.alternateMatches.find(a => a.name === name)?.confidence || 70,
          databasePresence: !!dbEntry,
          morphologyConsistency: 0,
          terpeneConsistency: 0,
          totalWeightedScore: 0,
          appearances: [],
        });
      }
    });
  }

  // Phase 8.2.1 — Calculate morphology and terpene consistency for each candidate
  candidateMap.forEach((candidate) => {
    const dbEntry = CULTIVAR_LIBRARY.find(s =>
      s.name.toLowerCase() === candidate.canonicalName.toLowerCase()
    );
    
    if (dbEntry) {
      // Phase 8.2.1 — Morphology consistency
      let morphologyScore = 0;
      const visualProfile = dbEntry.visualProfile || {
        budStructure: dbEntry.morphology.budDensity,
        trichomeDensity: dbEntry.morphology.trichomeDensity,
        pistilColor: dbEntry.morphology.pistilColor,
        leafShape: dbEntry.morphology.leafShape,
        colorProfile: "",
      };
      
      if (fusedFeatures.budStructure === visualProfile.budStructure) {
        morphologyScore += 30;
      } else if (
        (fusedFeatures.budStructure === "high" && visualProfile.budStructure === "medium") ||
        (fusedFeatures.budStructure === "medium" && visualProfile.budStructure === "high")
      ) {
        morphologyScore += 15;
      }
      
      if (fusedFeatures.leafShape === visualProfile.leafShape) {
        morphologyScore += 25;
      }
      
      if (fusedFeatures.trichomeDensity === visualProfile.trichomeDensity) {
        morphologyScore += 20;
      }
      
      // Additional visual alignment
      if (fusedFeatures.budStructure && visualProfile.budStructure) {
        morphologyScore += 10;
      }
      
      candidate.morphologyConsistency = Math.min(100, morphologyScore);
      
      // Phase 8.2.1 — Terpene consistency
      if (terpeneProfile && terpeneProfile.length > 0 && dbEntry.terpeneProfile) {
        const terpeneNames = terpeneProfile.map(t => t.name.toLowerCase());
        const dbTerpenes = dbEntry.terpeneProfile.map(t => t.toLowerCase());
        
        let terpeneScore = 0;
        let matches = 0;
        
        terpeneNames.forEach(terpene => {
          if (dbTerpenes.some(dbT => dbT.includes(terpene) || terpene.includes(dbT))) {
            matches++;
          }
        });
        
        if (matches > 0) {
          terpeneScore = (matches / Math.max(terpeneNames.length, dbTerpenes.length)) * 100;
        }
        
        candidate.terpeneConsistency = Math.min(100, terpeneScore);
      } else {
        candidate.terpeneConsistency = 50; // Neutral if no terpene data
      }
    } else {
      // No database entry, use neutral scores
      candidate.morphologyConsistency = 50;
      candidate.terpeneConsistency = 50;
    }
  });

  return Array.from(candidateMap.values());
}

/**
 * Phase 8.2 Step 8.2.2 — PRIMARY NAME SELECTION
 * 
 * Score each candidate using:
 * - Image agreement count (highest weight)
 * - Average confidence
 * - Database presence (35k DB)
 * - Morphology + terpene consistency
 */
function selectPrimaryNameV82(
  candidates: NameCandidateV82[],
  imageCount: number
): {
  primary: NameCandidateV82;
  alternates: NameCandidateV82[];
  confidenceBreakdown: NameConfidenceResultV82["confidenceBreakdown"];
} {
  // Phase 8.2.2 — Score each candidate
  candidates.forEach(candidate => {
    let totalScore = 0;
    
    // Phase 8.2.2 — Image agreement count (highest weight: 40%)
    const agreementScore = candidate.imageAgreementCount > 0
      ? (candidate.imageAgreementCount / imageCount) * 100
      : 0;
    totalScore += agreementScore * 0.40;
    
    // Phase 8.2.2 — Average confidence (25%)
    totalScore += candidate.averageConfidence * 0.25;
    
    // Phase 8.2.2 — Database presence (15%)
    if (candidate.databasePresence) {
      totalScore += 100 * 0.15;
    }
    
    // Phase 8.2.2 — Morphology consistency (12%)
    totalScore += candidate.morphologyConsistency * 0.12;
    
    // Phase 8.2.2 — Terpene consistency (8%)
    totalScore += candidate.terpeneConsistency * 0.08;
    
    candidate.totalWeightedScore = totalScore;
  });

  // Phase 8.2.2 — Sort by total weighted score
  candidates.sort((a, b) => b.totalWeightedScore - a.totalWeightedScore);

  // Phase 8.2.2 — Winning rule: Must appear in ≥2 images OR have ≥90% single-image confidence
  const primary = candidates.find(c =>
    c.imageAgreementCount >= 2 || c.maxConfidence >= 90
  ) || candidates[0]; // Fallback to top scorer if no candidate meets requirement

  // Phase 8.2.2 — Get alternates (next 2-4 candidates)
  const alternates = candidates
    .filter(c => c.canonicalName.toLowerCase() !== primary.canonicalName.toLowerCase())
    .slice(0, 4);

  // Phase 8.2.2 — Calculate confidence breakdown for primary
  const confidenceBreakdown: NameConfidenceResultV82["confidenceBreakdown"] = {
    imageAgreement: (primary.imageAgreementCount / imageCount) * 100 * 0.40,
    databasePresence: primary.databasePresence ? 100 * 0.15 : 0,
    morphologyAlignment: primary.morphologyConsistency * 0.12,
    terpeneAlignment: primary.terpeneConsistency * 0.08,
  };

  return { primary, alternates, confidenceBreakdown };
}

/**
 * Phase 8.2 Step 8.2.3 — CONFIDENCE TIER ASSIGNMENT
 * 
 * Assign name confidence tier:
 * - Very High (93–99%)
 * - High (85–92%)
 * - Medium (70–84%)
 * - Low (55–69%)
 * 
 * Never show 100%.
 */
function assignConfidenceTierV82(
  confidence: number
): {
  confidence: number; // Capped at 99
  tier: "very_high" | "high" | "medium" | "low";
} {
  // Phase 8.2.3 — Cap at 99% (never show 100%)
  const cappedConfidence = Math.min(99, Math.max(55, Math.round(confidence)));
  
  let tier: "very_high" | "high" | "medium" | "low";
  if (cappedConfidence >= 93) {
    tier = "very_high";
  } else if (cappedConfidence >= 85) {
    tier = "high";
  } else if (cappedConfidence >= 70) {
    tier = "medium";
  } else {
    tier = "low";
  }
  
  return { confidence: cappedConfidence, tier };
}

/**
 * Phase 8.2 Step 8.2.4 — DISAMBIGUATION LOGIC
 * 
 * If close contenders exist (within 5–7%):
 * - Surface alternates
 * - Explain differences
 */
function generateAlternatesV82(
  primary: NameCandidateV82,
  alternates: NameCandidateV82[],
  fusedFeatures: FusedFeatures,
  terpeneProfile?: Array<{ name: string; likelihood: string }>
): Array<{
  name: string;
  confidence: number;
  whyNotPrimary: string;
  difference: string;
}> {
  const result: Array<{
    name: string;
    confidence: number;
    whyNotPrimary: string;
    difference: string;
  }> = [];

  alternates.forEach(alt => {
    // Phase 8.2.4 — Check if within 5-7% of primary
    const scoreDiff = primary.totalWeightedScore - alt.totalWeightedScore;
    const isCloseContender = scoreDiff <= 7;
    
    if (isCloseContender || alternates.indexOf(alt) < 2) {
      // Phase 8.2.4 — Generate why not primary
      const whyNotPrimaryReasons: string[] = [];
      
      if (alt.imageAgreementCount < primary.imageAgreementCount) {
        whyNotPrimaryReasons.push(`Appeared in ${alt.imageAgreementCount} image${alt.imageAgreementCount !== 1 ? "s" : ""} vs ${primary.imageAgreementCount}`);
      }
      
      if (alt.averageConfidence < primary.averageConfidence - 5) {
        whyNotPrimaryReasons.push(`Lower average confidence (${Math.round(alt.averageConfidence)}% vs ${Math.round(primary.averageConfidence)}%)`);
      }
      
      if (!alt.databasePresence && primary.databasePresence) {
        whyNotPrimaryReasons.push("Not found in database");
      }
      
      if (alt.morphologyConsistency < primary.morphologyConsistency - 10) {
        whyNotPrimaryReasons.push("Lower morphology alignment");
      }
      
      if (whyNotPrimaryReasons.length === 0) {
        whyNotPrimaryReasons.push("Slightly lower overall score");
      }
      
      // Phase 8.2.4 — Generate difference explanation
      const dbEntry = CULTIVAR_LIBRARY.find(s =>
        s.name.toLowerCase() === alt.canonicalName.toLowerCase()
      );
      const primaryDbEntry = CULTIVAR_LIBRARY.find(s =>
        s.name.toLowerCase() === primary.canonicalName.toLowerCase()
      );
      
      const differences: string[] = [];
      
      if (dbEntry && primaryDbEntry) {
        const altVisual = dbEntry.visualProfile || {
          budStructure: dbEntry.morphology.budDensity,
          leafShape: dbEntry.morphology.leafShape,
          trichomeDensity: dbEntry.morphology.trichomeDensity,
          pistilColor: [],
          colorProfile: "",
        };
        const primaryVisual = primaryDbEntry.visualProfile || {
          budStructure: primaryDbEntry.morphology.budDensity,
          leafShape: primaryDbEntry.morphology.leafShape,
          trichomeDensity: primaryDbEntry.morphology.trichomeDensity,
          pistilColor: [],
          colorProfile: "",
        };
        
        if (altVisual.leafShape !== primaryVisual.leafShape) {
          differences.push(`${altVisual.leafShape} vs ${primaryVisual.leafShape} leaf shape`);
        }
        
        if (altVisual.budStructure !== primaryVisual.budStructure) {
          differences.push(`${altVisual.budStructure} vs ${primaryVisual.budStructure} bud structure`);
        }
        
        if (dbEntry.terpeneProfile && primaryDbEntry.terpeneProfile) {
          const altTerpenes = dbEntry.terpeneProfile.map(t => t.toLowerCase());
          const primaryTerpenes = primaryDbEntry.terpeneProfile.map(t => t.toLowerCase());
          const hasDifferentTerpenes = altTerpenes.some(t => !primaryTerpenes.some(p => p.includes(t) || t.includes(p)));
          if (hasDifferentTerpenes) {
            differences.push("Different terpene profile");
          }
        }
      }
      
      if (differences.length === 0) {
        differences.push("Similar characteristics with minor variations");
      }
      
      result.push({
        name: alt.canonicalName,
        confidence: Math.round(alt.averageConfidence),
        whyNotPrimary: whyNotPrimaryReasons.join(", "),
        difference: differences.join("; "),
      });
    }
  });

  return result.slice(0, 4); // Max 4 alternates
}

/**
 * Phase 8.2 Step 8.2.5 — USER-FACING OUTPUT
 * 
 * Generate one-sentence explanation:
 * "Matched across 3 images with consistent morphology and terpene alignment."
 */
function generateExplanationV82(
  primary: NameCandidateV82,
  imageCount: number,
  confidenceBreakdown: NameConfidenceResultV82["confidenceBreakdown"],
  strainRatio?: StrainRatioV81
): string {
  const parts: string[] = [];
  
  // Phase 8.2.5 — Image agreement
  if (primary.imageAgreementCount >= 2) {
    parts.push(`matched across ${primary.imageAgreementCount} image${primary.imageAgreementCount !== 1 ? "s" : ""}`);
  } else if (imageCount === 1) {
    parts.push("analyzed from single image");
  } else {
    parts.push("identified from image analysis");
  }
  
  // Phase 8.2.5 — Morphology alignment
  if (primary.morphologyConsistency >= 70) {
    parts.push("consistent morphology");
  } else if (primary.morphologyConsistency >= 50) {
    parts.push("moderate morphology alignment");
  }
  
  // Phase 8.2.5 — Terpene alignment
  if (primary.terpeneConsistency >= 70) {
    parts.push("terpene profile alignment");
  }
  
  // Phase 8.2.5 — Database presence
  if (primary.databasePresence) {
    parts.push("database match");
  }
  
  // Phase 8.2.5 — Ratio alignment (if available)
  if (strainRatio && primary.databasePresence) {
    const dbEntry = CULTIVAR_LIBRARY.find(s =>
      s.name.toLowerCase() === primary.canonicalName.toLowerCase()
    );
    if (dbEntry) {
      const dbType = dbEntry.type?.toLowerCase() || "";
      const ratioType = strainRatio.classification.toLowerCase();
      if (dbType.includes(ratioType) || ratioType.includes(dbType)) {
        parts.push("ratio alignment");
      }
    }
  }
  
  if (parts.length === 0) {
    return `This plant most closely matches ${primary.canonicalName} based on visual analysis.`;
  }
  
  return `This plant most closely matches ${primary.canonicalName} ${parts.join(", ")}.`;
}

/**
 * Phase 8.2 — MAIN FUNCTION
 */
export function runNameConfidenceV82(
  imageResults: ImageResult[],
  fusedFeatures: FusedFeatures,
  imageCount: number,
  terpeneProfile?: Array<{ name: string; likelihood: string }>,
  nameFirstV80Result?: NameFirstResultV80,
  strainRatioV81?: StrainRatioV81
): NameConfidenceResultV82 {
  // Phase 8.2.1 — NAME CANDIDATE POOL
  const candidates = buildNameCandidatePoolV82(
    imageResults,
    fusedFeatures,
    terpeneProfile,
    nameFirstV80Result
  );
  
  if (candidates.length === 0) {
    // Phase 8.2.1 — Fallback if no candidates
    return {
      primaryName: {
        name: "Closest Known Cultivar",
        confidence: 55,
        confidenceTier: "low",
        matchType: "closest_known",
      },
      alternateMatches: [],
      explanation: "Unable to identify a specific strain match from the provided images.",
      isAmbiguous: true,
      confidenceBreakdown: {
        imageAgreement: 0,
        databasePresence: 0,
        morphologyAlignment: 0,
        terpeneAlignment: 0,
      },
    };
  }
  
  // Phase 8.2.2 — PRIMARY NAME SELECTION
  const { primary, alternates, confidenceBreakdown } = selectPrimaryNameV82(candidates, imageCount);
  
  // Phase 8.2.3 — CONFIDENCE TIER ASSIGNMENT
  const confidenceResult = assignConfidenceTierV82(primary.totalWeightedScore);
  
  // Phase 8.2.4 — DISAMBIGUATION LOGIC
  const alternateMatches = generateAlternatesV82(primary, alternates, fusedFeatures, terpeneProfile);
  
  // Phase 8.2.5 — USER-FACING OUTPUT
  const explanation = generateExplanationV82(primary, imageCount, confidenceBreakdown, strainRatioV81);
  
  // Phase 8.2.4 — Determine if ambiguous
  const isAmbiguous = alternates.length > 0 && 
    (primary.totalWeightedScore - (alternates[0]?.totalWeightedScore || 0)) <= 7;
  
  // Phase 8.2.2 — Determine match type
  let matchType: "exact" | "very_close" | "close_family" | "closest_known";
  if (primary.imageAgreementCount >= 3 && primary.averageConfidence >= 90) {
    matchType = "exact";
  } else if (primary.imageAgreementCount >= 2 && primary.averageConfidence >= 80) {
    matchType = "very_close";
  } else if (primary.databasePresence && primary.morphologyConsistency >= 60) {
    matchType = "close_family";
  } else {
    matchType = "closest_known";
  }
  
  // Phase 8.2.2 — Get alsoKnownAs from database
  const dbEntry = CULTIVAR_LIBRARY.find(s =>
    s.name.toLowerCase() === primary.canonicalName.toLowerCase()
  );
  const alsoKnownAs = dbEntry?.aliases && dbEntry.aliases.length > 0
    ? dbEntry.aliases.slice(0, 3)
    : undefined;
  
  return {
    primaryName: {
      name: primary.canonicalName,
      confidence: confidenceResult.confidence,
      confidenceTier: confidenceResult.tier,
      matchType,
      alsoKnownAs,
    },
    alternateMatches,
    explanation,
    isAmbiguous,
    confidenceBreakdown,
  };
}
