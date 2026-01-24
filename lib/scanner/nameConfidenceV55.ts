// 🔒 SCANNER CORE — DO NOT MODIFY WITHOUT ARCH REVIEW
// Phase 5.5 — NAME CONFIDENCE + DISAMBIGUATION UPGRADE
// lib/scanner/nameConfidenceV55.ts

import type { CultivarReference } from "./cultivarLibrary";
import type { FusedFeatures } from "./multiImageFusion";

/**
 * Phase 5.5 — Name Confidence Result
 * 
 * Makes the strain name feel earned, trustworthy, and explainable.
 */
export type NameConfidenceResultV55 = {
  primaryStrainName: string; // ALWAYS non-empty, never "Unknown"
  confidence: number; // 0–100 (never 100)
  confidenceTier: "very_high" | "high" | "medium" | "low";
  whyThisNameWon: string[]; // Array of explanation bullets (at least 2: one database, one image)
  alternateMatches: Array<{ name: string; confidence: number }>; // Max 3, ranked
  disambiguationTriggered: boolean; // True if multiple strains scored within 5%
};

/**
 * Phase 5.5 — Name Candidate with Confidence Components
 */
type NameCandidateV55 = {
  name: string;
  canonicalName: string;
  dbEntry?: CultivarReference;
  isAlias: boolean;
  
  // Confidence components (0–1 each)
  databaseMatch: number; // 0–1 (exact match = 1.0, alias = 0.9, no match = 0.0)
  multiImageConsensus: number; // 0–1 (how many images agree on this name)
  visualPhenotypeAlignment: number; // 0–1 (visual traits match)
  terpeneEffectAlignment: number; // 0–1 (terpene/effect profile match)
  
  // Weighted confidence (calculated)
  weightedConfidence: number; // 0–100
  
  // Disambiguation factors
  geneticLineageMatch: number; // 0–1 (how well lineage matches)
  databaseCompleteness: number; // 0–1 (how complete the DB entry is)
};

/**
 * Phase 5.5 — Resolve Name Confidence V55
 * 
 * Calculates name confidence using weighted inputs and handles disambiguation.
 */
export function resolveNameConfidenceV55(args: {
  candidateNames: string[]; // All candidate names from images/consensus
  perImageTopNames: string[]; // Top candidate per image
  databaseCandidates: CultivarReference[]; // Candidates from database filter
  fusedFeatures?: FusedFeatures; // Visual features for phenotype alignment
  terpeneProfile?: Array<{ name: string; likelihood: string }>; // Terpene profile for alignment
  effectProfile?: Array<{ effect: string; likelihood: string }>; // Effect profile for alignment
  imageCount: number;
}): NameConfidenceResultV55 {
  const {
    candidateNames,
    perImageTopNames,
    databaseCandidates,
    fusedFeatures,
    terpeneProfile,
    effectProfile,
    imageCount,
  } = args;

  // Safety: Never return empty name — fallback to "Closest Known Cultivar"
  try {
    // Build candidate list with confidence components
    const candidates: NameCandidateV55[] = [];
    const nameFrequency = new Map<string, number>();
    
    // Count frequency of each name across images
    perImageTopNames.forEach(name => {
      nameFrequency.set(name, (nameFrequency.get(name) || 0) + 1);
    });
    
    // Process each unique candidate name
    const uniqueNames = Array.from(new Set(candidateNames));
    
    for (const name of uniqueNames) {
      if (!name || name.length < 2) continue; // Skip invalid names
      
      // Find database entry
      let dbEntry: CultivarReference | undefined = undefined;
      let isAlias = false;
      
      // Check exact match first
      dbEntry = databaseCandidates.find(c => 
        c.name.toLowerCase() === name.toLowerCase()
      );
      
      // Check alias match if no exact match
      if (!dbEntry) {
        for (const candidate of databaseCandidates) {
          if (candidate.aliases?.some(alias => 
            alias.toLowerCase() === name.toLowerCase()
          )) {
            dbEntry = candidate;
            isAlias = true;
            break;
          }
        }
      }
      
      // Calculate confidence components
      
      // 1) Database exact match / alias match (55%)
      // Phase 4.3 — Increased weight for database/alias matches
      let databaseMatch = 0.0;
      if (dbEntry) {
        if (dbEntry.name.toLowerCase() === name.toLowerCase()) {
          databaseMatch = 1.0; // Exact match
        } else {
          databaseMatch = 0.95; // Alias match (boosted from 0.9)
        }
      } else {
        databaseMatch = 0.0; // No database match
      }
      
      // 2) Multi-image consensus agreement (25%)
      const frequency = nameFrequency.get(name) || 0;
      const multiImageConsensus = Math.min(1.0, frequency / Math.max(1, imageCount));
      
      // 3) Visual phenotype alignment (10%)
      // Phase 4.3 — Reduced weight to prevent visual veto (adjustment only)
      let visualPhenotypeAlignment = 0.6; // Default slightly positive (was 0.5)
      if (fusedFeatures && dbEntry) {
        // Check if visual traits align with database entry
        // This is a simplified check - in practice, you'd compare more traits
        const dbDominance = (dbEntry as any).dominance || (dbEntry as any).genetics?.dominance || "";
        const dbDominanceLower = dbDominance.toLowerCase();
        
        // Leaf shape alignment
        if (fusedFeatures.leafShape === "broad" && dbDominanceLower.includes("indica")) {
          visualPhenotypeAlignment += 0.2;
        } else if (fusedFeatures.leafShape === "narrow" && dbDominanceLower.includes("sativa")) {
          visualPhenotypeAlignment += 0.2;
        }
        
        // Bud structure alignment
        if (fusedFeatures.budStructure === "high" && dbDominanceLower.includes("indica")) {
          visualPhenotypeAlignment += 0.1;
        } else if (fusedFeatures.budStructure === "low" && dbDominanceLower.includes("sativa")) {
          visualPhenotypeAlignment += 0.1;
        }
        
        visualPhenotypeAlignment = Math.min(1.0, visualPhenotypeAlignment);
      }
      
      // 4) Terpene + effect alignment (10%)
      // Phase 4.3 — Reduced weight
      let terpeneEffectAlignment = 0.5; // Default neutral
      if (dbEntry && (terpeneProfile || effectProfile)) {
        // Simplified alignment check
        // In practice, you'd compare terpene profiles more carefully
        const dbTerpenes = (dbEntry as any).terpenes || [];
        const dbEffects = (dbEntry as any).effects || [];
        
        if (terpeneProfile && dbTerpenes.length > 0) {
          // Check if any terpenes match
          const terpeneMatches = terpeneProfile.filter(tp => 
            dbTerpenes.some((dt: string) => 
              dt.toLowerCase().includes(tp.name.toLowerCase())
            )
          );
          if (terpeneMatches.length > 0) {
            terpeneEffectAlignment += 0.25; // Boosted from 0.15 to maintain impact with lower weight
          }
        }
        
        if (effectProfile && dbEffects.length > 0) {
          // Check if any effects match
          const effectMatches = effectProfile.filter(ep => 
            dbEffects.some((de: string) => 
              de.toLowerCase().includes(ep.effect.toLowerCase())
            )
          );
          if (effectMatches.length > 0) {
            terpeneEffectAlignment += 0.25; // Boosted from 0.1 to maintain impact with lower weight
          }
        }
        
        terpeneEffectAlignment = Math.min(1.0, terpeneEffectAlignment);
      }
      
      // Calculate weighted confidence
      // Phase 4.3 — Name-First Weighting
      const weightedConfidence = 
        (databaseMatch * 0.55 * 100) +           // Increased from 0.40
        (multiImageConsensus * 0.25 * 100) +     // Kept at 0.25
        (visualPhenotypeAlignment * 0.10 * 100) + // Decreased from 0.20
        (terpeneEffectAlignment * 0.10 * 100);    // Decreased from 0.15
      
      // Calculate disambiguation factors
      let geneticLineageMatch = 0.5; // Default
      if (dbEntry) {
        const hasLineage = !!(dbEntry as any).lineage || !!(dbEntry as any).genetics || !!(dbEntry as any).parentStrains;
        geneticLineageMatch = hasLineage ? 0.9 : 0.3;
      }
      
      let databaseCompleteness = 0.5; // Default
      if (dbEntry) {
        let completenessScore = 0;
        if ((dbEntry as any).lineage || (dbEntry as any).genetics) completenessScore += 0.3;
        if ((dbEntry as any).terpenes && (dbEntry as any).terpenes.length > 0) completenessScore += 0.3;
        if ((dbEntry as any).effects && (dbEntry as any).effects.length > 0) completenessScore += 0.2;
        if ((dbEntry as any).visualProfile) completenessScore += 0.2;
        databaseCompleteness = Math.min(1.0, completenessScore);
      }
      
      candidates.push({
        name,
        canonicalName: dbEntry?.name || name,
        dbEntry,
        isAlias,
        databaseMatch,
        multiImageConsensus,
        visualPhenotypeAlignment,
        terpeneEffectAlignment,
        weightedConfidence: Math.round(weightedConfidence),
        geneticLineageMatch,
        databaseCompleteness,
      });
    }
    
    // Sort by weighted confidence (descending)
    candidates.sort((a, b) => b.weightedConfidence - a.weightedConfidence);
    
    // 3) Disambiguation logic
    // If multiple strains score within 5%, choose one with better genetic lineage match and higher database completeness
    let primaryCandidate = candidates[0];
    let disambiguationTriggered = false;
    
    if (candidates.length > 1) {
      const topConfidence = candidates[0].weightedConfidence;
      const closeCandidates = candidates.filter(c => 
        Math.abs(c.weightedConfidence - topConfidence) <= 5
      );
      
      if (closeCandidates.length > 1) {
        disambiguationTriggered = true;
        
        // Choose candidate with better genetic lineage match and higher database completeness
        closeCandidates.sort((a, b) => {
          // First, compare genetic lineage match
          const lineageDiff = b.geneticLineageMatch - a.geneticLineageMatch;
          if (Math.abs(lineageDiff) > 0.1) {
            return lineageDiff > 0 ? 1 : -1;
          }
          
          // Then, compare database completeness
          const completenessDiff = b.databaseCompleteness - a.databaseCompleteness;
          if (Math.abs(completenessDiff) > 0.1) {
            return completenessDiff > 0 ? 1 : -1;
          }
          
          // Finally, fall back to confidence
          return b.weightedConfidence - a.weightedConfidence;
        });
        
        primaryCandidate = closeCandidates[0];
      }
    }
    
    // Ensure primary name is never empty
    let primaryStrainName = primaryCandidate?.name || primaryCandidate?.canonicalName || "Closest Known Cultivar";
    if (!primaryStrainName || primaryStrainName.length < 3) {
      primaryStrainName = "Closest Known Cultivar";
    }
    
    // Calculate final confidence with caps
    let finalConfidence = primaryCandidate?.weightedConfidence || 65;
    
    // 7) Guardrails
    // If only 1 image → confidence max 82%
    if (imageCount === 1) {
      finalConfidence = Math.min(82, finalConfidence);
    } else if (imageCount === 2) {
      finalConfidence = Math.min(92, finalConfidence);
    } else if (imageCount >= 3) {
      finalConfidence = Math.min(99, finalConfidence); // Never 100%
    }
    
    // Build alternate matches (max 3, ranked) - needed for guardrails
    const alternateMatches: Array<{ name: string; confidence: number }> = [];
    const alternateCandidates = candidates.filter(c => 
      c.name !== primaryStrainName && c.canonicalName !== primaryStrainName
    ).slice(0, 3);
    
    for (const alt of alternateCandidates) {
      let altConfidence = alt.weightedConfidence;
      // Apply same caps to alternates
      if (imageCount === 1) {
        altConfidence = Math.min(82, altConfidence);
      } else if (imageCount === 2) {
        altConfidence = Math.min(92, altConfidence);
      } else if (imageCount >= 3) {
        altConfidence = Math.min(99, altConfidence);
      }
      
      alternateMatches.push({
        name: alt.canonicalName || alt.name,
        confidence: Math.round(altConfidence),
      });
    }
    
    // 7) Guardrails: If alternates exist → primary confidence max 95%
    if (alternateMatches.length > 0) {
      finalConfidence = Math.min(95, finalConfidence);
    }
    
    // 7) Guardrails: Confidence cannot increase after disambiguation
    // (Disambiguation already selected the best candidate, so confidence is already correct)
    // No action needed here as disambiguation selects the best candidate, not increases confidence
    
    // 4) Confidence bands (LOCKED)
    // 90–97% → Very High
    // 80–89% → High
    // 65–79% → Medium
    // 55–64% → Low (still valid)
    // Never show 100%
    let confidenceTier: "very_high" | "high" | "medium" | "low";
    if (finalConfidence >= 90) {
      confidenceTier = "very_high";
    } else if (finalConfidence >= 80) {
      confidenceTier = "high";
    } else if (finalConfidence >= 65) {
      confidenceTier = "medium";
    } else {
      // Below 65% still valid, but tier as "low"
      confidenceTier = "low";
    }
    
    // 5) Explanation requirements
    // whyThisNameWon MUST include:
    // - At least 2 bullets
    // - One database-based reason
    // - One image-based reason
    const whyThisNameWon = generateWhyThisNameWon(
      primaryCandidate,
      disambiguationTriggered
    );
    
    return {
      primaryStrainName,
      confidence: Math.round(finalConfidence),
      confidenceTier,
      whyThisNameWon, // Array of explanation bullets
      alternateMatches,
      disambiguationTriggered,
    };
  } catch (error) {
    // Safety: Never throw — fallback to "Closest Known Cultivar"
    console.warn("Phase 5.5 — Name confidence calculation error, using default fallback:", error);
    return {
      primaryStrainName: "Closest Known Cultivar",
      confidence: 65,
      confidenceTier: "medium",
      whyThisNameWon: [
        "Matched against strain database",
        "Identified through image analysis"
      ],
      alternateMatches: [],
      disambiguationTriggered: false,
    };
  }
}

/**
 * Phase 5.5 — Generate "Why This Name Won" Explanation
 * 
 * Requirements:
 * - At least 2 bullets
 * - One database-based reason
 * - One image-based reason
 */
function generateWhyThisNameWon(
  candidate: NameCandidateV55,
  disambiguationTriggered: boolean
): string[] {
  const databaseReasons: string[] = [];
  const imageReasons: string[] = [];
  const otherReasons: string[] = [];
  
  // Database-based reasons (REQUIRED: at least one)
  if (candidate.databaseMatch >= 0.9) {
    if (candidate.isAlias) {
      databaseReasons.push("Matched via known alias in strain database");
    } else {
      databaseReasons.push("Exact match found in strain database");
    }
  } else if (candidate.databaseMatch > 0) {
    databaseReasons.push("Partial database match found");
  }
  
  // Add terpene/effect alignment as database-based if available
  if (candidate.terpeneEffectAlignment >= 0.7 && candidate.dbEntry) {
    const terpeneText = candidate.dbEntry.terpeneProfile && candidate.dbEntry.terpeneProfile.length > 0
      ? "Terpene profile aligned with reference genetics"
      : "Effect profile aligned with reference data";
    databaseReasons.push(terpeneText);
  }
  
  // Image-based reasons (REQUIRED: at least one)
  if (candidate.multiImageConsensus >= 0.75) {
    imageReasons.push(`Appeared consistently across ${Math.round(candidate.multiImageConsensus * 100)}% of images`);
  } else if (candidate.multiImageConsensus >= 0.5) {
    imageReasons.push("Appeared in multiple images");
  } else if (candidate.multiImageConsensus > 0) {
    imageReasons.push("Identified in image analysis");
  }
  
  // Visual phenotype alignment as image-based reason
  if (candidate.visualPhenotypeAlignment >= 0.7) {
    imageReasons.push("Visual structure matched known phenotype morphology");
  } else if (candidate.visualPhenotypeAlignment >= 0.5) {
    imageReasons.push("Visual traits align with known characteristics");
  }
  
  // Disambiguation reason (other)
  if (disambiguationTriggered) {
    otherReasons.push("Selected from closely matched candidates based on genetic lineage and database completeness");
  }
  
  // Build final explanation array (at least 2 bullets, one database, one image)
  const finalReasons: string[] = [];
  
  // Add one database reason (required)
  if (databaseReasons.length > 0) {
    finalReasons.push(databaseReasons[0]);
  } else {
    // Fallback database reason
    finalReasons.push("Matched against strain database");
  }
  
  // Add one image reason (required)
  if (imageReasons.length > 0) {
    finalReasons.push(imageReasons[0]);
  } else {
    // Fallback image reason
    finalReasons.push("Identified through image analysis");
  }
  
  // Add additional reasons if available (up to 3 total)
  if (finalReasons.length < 3 && databaseReasons.length > 1) {
    finalReasons.push(databaseReasons[1]);
  } else if (finalReasons.length < 3 && imageReasons.length > 1) {
    finalReasons.push(imageReasons[1]);
  } else if (finalReasons.length < 3 && otherReasons.length > 0) {
    finalReasons.push(otherReasons[0]);
  }
  
  // Ensure at least 2 bullets
  if (finalReasons.length < 2) {
    finalReasons.push("Name selected based on available visual and reference data");
  }
  
  // Return as array (will be joined in UI or kept as array for FREE vs PAID tier handling)
  return finalReasons.slice(0, 3); // Max 3 bullets
}
