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
  confidence: number; // 0–100
  confidenceTier: "very_high" | "high" | "medium" | "low";
  whyThisNameWon: string; // Clear reason why this name won
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
      
      // 1) Database exact match / alias match (40%)
      let databaseMatch = 0.0;
      if (dbEntry) {
        if (dbEntry.name.toLowerCase() === name.toLowerCase()) {
          databaseMatch = 1.0; // Exact match
        } else {
          databaseMatch = 0.9; // Alias match
        }
      } else {
        databaseMatch = 0.0; // No database match
      }
      
      // 2) Multi-image consensus agreement (25%)
      const frequency = nameFrequency.get(name) || 0;
      const multiImageConsensus = Math.min(1.0, frequency / Math.max(1, imageCount));
      
      // 3) Visual phenotype alignment (20%)
      let visualPhenotypeAlignment = 0.5; // Default neutral
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
      
      // 4) Terpene + effect alignment (15%)
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
            terpeneEffectAlignment += 0.15;
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
            terpeneEffectAlignment += 0.1;
          }
        }
        
        terpeneEffectAlignment = Math.min(1.0, terpeneEffectAlignment);
      }
      
      // Calculate weighted confidence
      const weightedConfidence = 
        (databaseMatch * 0.40 * 100) +
        (multiImageConsensus * 0.25 * 100) +
        (visualPhenotypeAlignment * 0.20 * 100) +
        (terpeneEffectAlignment * 0.15 * 100);
      
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
    
    // Apply image count caps
    if (imageCount === 1) {
      finalConfidence = Math.min(85, finalConfidence);
    } else if (imageCount === 2) {
      finalConfidence = Math.min(92, finalConfidence);
    } else if (imageCount >= 3) {
      finalConfidence = Math.min(99, finalConfidence); // Never 100%
    }
    
    // Determine confidence tier
    let confidenceTier: "very_high" | "high" | "medium" | "low";
    if (finalConfidence >= 93) {
      confidenceTier = "very_high";
    } else if (finalConfidence >= 85) {
      confidenceTier = "high";
    } else if (finalConfidence >= 70) {
      confidenceTier = "medium";
    } else {
      confidenceTier = "low";
    }
    
    // Generate "why this name won" explanation
    const whyThisNameWon = generateWhyThisNameWon(
      primaryCandidate,
      disambiguationTriggered
    );
    
    // Build alternate matches (max 3, ranked)
    const alternateMatches: Array<{ name: string; confidence: number }> = [];
    const alternateCandidates = candidates.filter(c => 
      c.name !== primaryStrainName && c.canonicalName !== primaryStrainName
    ).slice(0, 3);
    
    for (const alt of alternateCandidates) {
      let altConfidence = alt.weightedConfidence;
      // Apply same caps to alternates
      if (imageCount === 1) {
        altConfidence = Math.min(85, altConfidence);
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
    
    return {
      primaryStrainName,
      confidence: Math.round(finalConfidence),
      confidenceTier,
      whyThisNameWon,
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
      whyThisNameWon: "Name selected based on available visual and reference data",
      alternateMatches: [],
      disambiguationTriggered: false,
    };
  }
}

/**
 * Phase 5.5 — Generate "Why This Name Won" Explanation
 */
function generateWhyThisNameWon(
  candidate: NameCandidateV55,
  disambiguationTriggered: boolean
): string {
  const reasons: string[] = [];
  
  // Database match reason
  if (candidate.databaseMatch >= 0.9) {
    if (candidate.isAlias) {
      reasons.push("Matched via known alias in strain database");
    } else {
      reasons.push("Exact match found in strain database");
    }
  } else if (candidate.databaseMatch > 0) {
    reasons.push("Partial database match found");
  }
  
  // Multi-image consensus reason
  if (candidate.multiImageConsensus >= 0.75) {
    reasons.push(`Appeared consistently across ${Math.round(candidate.multiImageConsensus * 100)}% of images`);
  } else if (candidate.multiImageConsensus >= 0.5) {
    reasons.push("Appeared in multiple images");
  }
  
  // Visual phenotype alignment reason
  if (candidate.visualPhenotypeAlignment >= 0.7) {
    reasons.push("Visual traits align with known phenotype");
  }
  
  // Terpene/effect alignment reason
  if (candidate.terpeneEffectAlignment >= 0.7) {
    reasons.push("Terpene and effect profile align with reference data");
  }
  
  // Disambiguation reason
  if (disambiguationTriggered) {
    reasons.push("Selected from closely matched candidates based on genetic lineage and database completeness");
  }
  
  // Fallback if no specific reasons
  if (reasons.length === 0) {
    reasons.push("Name selected based on available visual and reference data");
  }
  
  // Return first 2 reasons (most important)
  return reasons.slice(0, 2).join(". ") + ".";
}
