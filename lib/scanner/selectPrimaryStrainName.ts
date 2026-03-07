// NAME-FIRST MATCHING (NON-NEGOTIABLE)
// lib/scanner/selectPrimaryStrainName.ts

import { findByName, findByAlias, findClosestByTraits, type CultivarReference } from "./cultivarLibrary";
import type { FusedFeatures } from "./multiImageFusion";

/**
 * NAME-FIRST MATCHING — Primary Strain Name Selection Result
 * 
 * NEVER returns empty name.
 * Always provides confidence and reasons.
 */
export type PrimaryStrainNameResult = {
  name: string; // NEVER empty
  confidence: number; // 0-100
  reasons: string[]; // Explanation bullets
  isLocked: boolean; // True if DB confidence >= 85
  source: "exact-db" | "alias-db" | "multi-image-consensus" | "single-image-guess" | "fallback";
};

/**
 * NAME-FIRST MATCHING — Select Primary Strain Name
 * 
 * PRIORITY ORDER:
 * 1. Exact DB name match
 * 2. Alias match
 * 3. Multi-image consensus
 * 4. Best single-image guess
 * 5. Fallback name
 * 
 * HARD RULES:
 * - If DB confidence >= 85 → LOCK name
 * - If 2+ images agree → +15%
 * - If fallback → cap confidence at 80%
 * - NEVER returns empty
 */
export function selectPrimaryStrainName(args: {
  perImageTopNames: string[]; // Top candidate per image
  imageCount: number;
  databaseCandidates?: CultivarReference[]; // Candidates from database filter
  fusedFeatures?: FusedFeatures; // Visual features for trait matching
  terpeneProfile?: string[]; // Terpene profile for matching
}): PrimaryStrainNameResult {
  const {
    perImageTopNames,
    imageCount,
    databaseCandidates = [],
    fusedFeatures,
    terpeneProfile = [],
  } = args;

  // Count frequency of each name across images
  const nameFrequency = new Map<string, number>();
  for (const name of perImageTopNames) {
    if (name && name.trim()) {
      const normalized = name.trim();
      nameFrequency.set(normalized, (nameFrequency.get(normalized) || 0) + 1);
    }
  }

  // PRIORITY 1: Exact DB name match
  for (const [name, frequency] of Array.from(nameFrequency.entries())) {
    // Check exact match in database (try-catch for safety during build)
    let dbMatch: CultivarReference | undefined = undefined;
    try {
      dbMatch = findByName(name);
    } catch (error) {
      // Database not loaded yet - continue
    }
    if (!dbMatch) {
      dbMatch = databaseCandidates.find(c => 
        c.name.toLowerCase() === name.toLowerCase()
      );
    }
    
    if (dbMatch && dbMatch.name.toLowerCase() === name.toLowerCase()) {
      // Exact DB match found
      let confidence = 90; // Base confidence for exact DB match
      
      // HARD RULE: If 2+ images agree → +15%
      if (frequency >= 2) {
        confidence = Math.min(99, confidence + 15);
      }
      
      // HARD RULE: If DB confidence >= 85 → LOCK name
      const isLocked = confidence >= 85;
      
      const reasons: string[] = [
        `Exact match found in strain database: "${dbMatch.name}"`,
        frequency >= 2 
          ? `Appeared in ${frequency} of ${imageCount} images`
          : `Identified from image analysis`,
      ];
      
      return {
        name: dbMatch.name,
        confidence: Math.round(confidence),
        reasons,
        isLocked,
        source: "exact-db",
      };
    }
  }

  // PRIORITY 2: Alias match
  for (const [name, frequency] of Array.from(nameFrequency.entries())) {
    // Check alias match in database (try-catch for safety during build)
    let aliasMatch: CultivarReference | undefined = undefined;
    try {
      aliasMatch = findByAlias(name);
    } catch (error) {
      // Database not loaded yet - continue
    }
    if (!aliasMatch) {
      aliasMatch = databaseCandidates.find(c => 
        c.aliases?.some(a => a.toLowerCase() === name.toLowerCase())
      );
    }
    
    if (aliasMatch) {
      // Alias match found
      let confidence = 85; // Base confidence for alias match
      
      // HARD RULE: If 2+ images agree → +15%
      if (frequency >= 2) {
        confidence = Math.min(99, confidence + 15);
      }
      
      // HARD RULE: If DB confidence >= 85 → LOCK name
      const isLocked = confidence >= 85;
      
      const reasons: string[] = [
        `Matched via known alias: "${name}" → "${aliasMatch.name}"`,
        frequency >= 2 
          ? `Appeared in ${frequency} of ${imageCount} images`
          : `Identified from image analysis`,
      ];
      
      return {
        name: aliasMatch.name,
        confidence: Math.round(confidence),
        reasons,
        isLocked,
        source: "alias-db",
      };
    }
  }

  // PRIORITY 3: Multi-image consensus (2+ images agree)
  const consensusNames = Array.from(nameFrequency.entries())
    .filter(([_, freq]) => freq >= 2)
    .sort(([_, a], [__, b]) => b - a); // Sort by frequency
  
  if (consensusNames.length > 0) {
    const [consensusName, frequency] = consensusNames[0];
    
    // Try to find in database (even if not exact/alias match) - try-catch for safety
    let dbMatch: CultivarReference | undefined = undefined;
    try {
      dbMatch = findByName(consensusName) || findByAlias(consensusName);
    } catch (error) {
      // Database not loaded yet - continue
    }
    if (!dbMatch) {
      dbMatch = databaseCandidates.find(c => 
        c.name.toLowerCase().includes(consensusName.toLowerCase()) ||
        consensusName.toLowerCase().includes(c.name.toLowerCase())
      );
    }
    
    let confidence = 75; // Base confidence for multi-image consensus
    
    // HARD RULE: If 2+ images agree → +15%
    confidence = Math.min(99, confidence + 15);
    
    // Boost if database match found (even if not exact)
    if (dbMatch) {
      confidence = Math.min(99, confidence + 10);
    }
    
    const reasons: string[] = [
      `Multi-image consensus: "${consensusName}" appeared in ${frequency} of ${imageCount} images`,
      dbMatch 
        ? `Similar strain found in database: "${dbMatch.name}"`
        : `Based on visual analysis across multiple images`,
    ];
    
    return {
      name: dbMatch?.name || consensusName,
      confidence: Math.round(confidence),
      reasons,
      isLocked: confidence >= 85,
      source: "multi-image-consensus",
    };
  }

  // PRIORITY 4: Best single-image guess
  if (perImageTopNames.length > 0) {
    const bestGuess = perImageTopNames[0];
    
    if (bestGuess && bestGuess.trim()) {
      // Try to find in database - try-catch for safety
      let dbMatch: CultivarReference | undefined = undefined;
      try {
        dbMatch = findByName(bestGuess) || findByAlias(bestGuess);
      } catch (error) {
        // Database not loaded yet - continue
      }
      if (!dbMatch) {
        dbMatch = databaseCandidates.find(c => 
          c.name.toLowerCase().includes(bestGuess.toLowerCase()) ||
          bestGuess.toLowerCase().includes(c.name.toLowerCase())
        );
      }
      
      // Try trait-based matching if no DB match - try-catch for safety
      let traitMatch: CultivarReference | undefined = undefined;
      if (!dbMatch && fusedFeatures) {
        try {
          const traitMatches = findClosestByTraits({
            leafShape: fusedFeatures.leafShape,
            budStructure: fusedFeatures.budStructure,
            trichomeDensity: fusedFeatures.trichomeDensity,
            terpenes: terpeneProfile,
          }, 1);
          if (traitMatches.length > 0) {
            traitMatch = traitMatches[0];
          }
        } catch (error) {
          // Database not loaded yet - continue
        }
      }
      
      let confidence = 65; // Base confidence for single-image guess
      
      // Boost if database match found
      if (dbMatch) {
        confidence = Math.min(95, confidence + 20);
      } else if (traitMatch) {
        confidence = Math.min(85, confidence + 15);
      }
      
      const reasons: string[] = [
        `Best match from single image analysis: "${bestGuess}"`,
        dbMatch 
          ? `Matched to database entry: "${dbMatch.name}"`
          : traitMatch
          ? `Similar traits found in database: "${traitMatch.name}"`
          : `Based on visual characteristics`,
      ];
      
      return {
        name: dbMatch?.name || traitMatch?.name || bestGuess,
        confidence: Math.round(confidence),
        reasons,
        isLocked: confidence >= 85,
        source: "single-image-guess",
      };
    }
  }

  // PRIORITY 5: Fallback name
  // HARD RULE: If fallback → cap confidence at 80%
  let fallbackName = "Closest Known Cultivar";
  let fallbackConfidence = 70;
  
  // Try to find closest match by traits - try-catch for safety
  if (fusedFeatures) {
    try {
      const traitMatches = findClosestByTraits({
        leafShape: fusedFeatures.leafShape,
        budStructure: fusedFeatures.budStructure,
        trichomeDensity: fusedFeatures.trichomeDensity,
        terpenes: terpeneProfile,
      }, 1);
      
      if (traitMatches.length > 0) {
        fallbackName = traitMatches[0].name;
        fallbackConfidence = 75; // Slightly higher for trait match
      }
    } catch (error) {
      // Database not loaded yet - use default fallback
    }
  }
  
  // HARD RULE: If fallback → cap confidence at 80%
  fallbackConfidence = Math.min(80, fallbackConfidence);
  
  const reasons: string[] = [
    `Fallback selection: "${fallbackName}"`,
    `Limited certainty due to insufficient image data or database matches`,
  ];
  
  return {
    name: fallbackName,
    confidence: Math.round(fallbackConfidence),
    reasons,
    isLocked: false,
    source: "fallback",
  };
}
