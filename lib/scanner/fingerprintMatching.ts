// Phase 5.0.3 — DB-Scale Matching (35,000 Strains)
// lib/scanner/fingerprintMatching.ts

import type { StrainFingerprint } from "./strainFingerprintModel";
import type { ObservedFingerprint } from "./observedFingerprint";
import type { CultivarReference } from "./cultivarLibrary";
import { generateStrainFingerprint } from "./strainFingerprintModel";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 5.0.3 — Fingerprint Match Score
 * 
 * Similarity score (0-1) for a single strain against observed fingerprint.
 * Computed per channel with weighted combination.
 */
export type FingerprintMatchScore = {
  strainName: string;
  overallScore: number; // 0-1, weighted combination of all channels
  channelScores: {
    visual: number; // 0-1, visual similarity
    genetics: number; // 0-1, genetic similarity
    terpenes: number; // 0-1, terpene similarity
    effects: number; // 0-1, effect similarity
  };
  channelWeights: {
    visual: number; // Applied weight (0-1)
    genetics: number;
    terpenes: number;
    effects: number;
  };
  confidence: number; // 0-100, overall match confidence
  explanation: string[]; // Human-readable explanation
};

/**
 * Phase 5.0.3.1 — Compare Visual Channels
 * Compares observed visual vector to strain visual baseline vector
 */
function compareVisualChannels(
  observed: ObservedFingerprint["visualVector"],
  strain: StrainFingerprint["visualBaselineVector"]
): number {
  // Density similarity (25% of visual score)
  const densitySim = 1 - Math.abs(observed.density - strain.density);
  
  // Trichome similarity (25% of visual score)
  const trichomeSim = 1 - Math.abs(observed.trichome - strain.trichome);
  
  // Color similarity (25% of visual score)
  let colorSim = 0;
  if (observed.color.primary === strain.color.primary) {
    colorSim = 1.0;
  } else if (observed.color.primary === "mixed" || strain.color.primary === "mixed") {
    colorSim = 0.5;
  } else if (
    (observed.color.primary === "lime" && strain.color.primary === "forest") ||
    (observed.color.primary === "forest" && strain.color.primary === "lime")
  ) {
    colorSim = 0.7; // Similar greens
  } else {
    colorSim = 0; // Different colors (e.g., purple vs green)
  }
  
  // Secondary color overlap (10% of visual score)
  const secondaryOverlap = observed.color.secondary.filter(obs =>
    strain.color.secondary.some(strain => 
      obs.toLowerCase().includes(strain.toLowerCase()) ||
      strain.toLowerCase().includes(obs.toLowerCase())
    )
  ).length;
  const secondarySim = secondaryOverlap / Math.max(1, Math.max(observed.color.secondary.length, strain.color.secondary.length));
  
  // Structure similarity (15% of visual score)
  const leafSim = observed.structure.leafShape === strain.structure.leafShape ? 1.0 :
                  observed.structure.leafShape === "mixed" || strain.structure.leafShape === "mixed" ? 0.5 : 0;
  const calyxSim = observed.structure.calyxShape === strain.structure.calyxShape ? 1.0 :
                   observed.structure.calyxShape === "mixed" || strain.structure.calyxShape === "mixed" ? 0.5 : 0;
  const structureSim = (leafSim + calyxSim) / 2;
  
  // Pistil similarity (10% of visual score)
  const pistilOverlap = observed.pistil.filter(obs =>
    strain.pistil.some(strain => 
      obs.toLowerCase().includes(strain.toLowerCase()) ||
      strain.toLowerCase().includes(obs.toLowerCase())
    )
  ).length;
  const pistilSim = pistilOverlap / Math.max(1, Math.max(observed.pistil.length, strain.pistil.length));
  
  // Weighted combination
  return (
    densitySim * 0.25 +
    trichomeSim * 0.25 +
    colorSim * 0.25 +
    secondarySim * 0.10 +
    structureSim * 0.15 +
    pistilSim * 0.10
  );
}

/**
 * Phase 5.0.3.2 — Compare Genetics Channels
 * Compares observed genetic hints to strain genetic lineage vector
 */
function compareGeneticsChannels(
  observed: ObservedFingerprint["inferredGeneticHints"],
  strain: StrainFingerprint["geneticLineageVector"]
): number {
  // Type match (50% of genetics score)
  let typeSim = 0;
  if (observed.typeHint === strain.type) {
    typeSim = 1.0;
  } else if (observed.typeHint === "hybrid" || strain.type === "hybrid") {
    typeSim = 0.5; // Hybrid can match either indica or sativa partially
  } else if (observed.typeHint === "unknown" || strain.type === "unknown") {
    typeSim = 0.3; // Unknown gets partial credit
  } else {
    typeSim = 0; // Mismatch (indica vs sativa)
  }
  
  // Lineage hint overlap (50% of genetics score)
  let lineageSim = 0;
  if (observed.lineageHints.length > 0 && strain.parentNames.length > 0) {
    // Check if lineage hints match parent names
    const matches = observed.lineageHints.filter(hint =>
      strain.parentNames.some(parent =>
        parent.toLowerCase().includes(hint.toLowerCase()) ||
        hint.toLowerCase().includes(parent.toLowerCase())
      )
    ).length;
    lineageSim = matches / Math.max(1, Math.max(observed.lineageHints.length, strain.parentNames.length));
  } else if (observed.lineageHints.length === 0 && strain.parentNames.length === 0) {
    lineageSim = 0.5; // Both unknown = partial match
  }
  
  return typeSim * 0.5 + lineageSim * 0.5;
}

/**
 * Phase 5.0.3.3 — Compare Terpene Channels
 * Compares observed terpene vector to strain terpene vector
 */
function compareTerpeneChannels(
  observed: ObservedFingerprint["inferredTerpeneVector"],
  strain: StrainFingerprint["terpeneVector"]
): number {
  // If no observed terpenes, return neutral score
  if (observed.likely.length === 0 && observed.possible.length === 0) {
    return 0.5; // Neutral if no data
  }
  
  // Combine likely and possible terpenes
  const observedTerpenes = [...observed.likely, ...observed.possible];
  
  // Dominant terpene overlap (60% of terpene score)
  const dominantOverlap = observed.likely.filter(obs =>
    strain.dominant.some(strain => obs === strain)
  ).length;
  const dominantSim = dominantOverlap / Math.max(1, Math.max(observed.likely.length, strain.dominant.length));
  
  // Full terpene profile overlap (40% of terpene score)
  const allStrainTerpenes = [...strain.dominant, ...strain.secondary];
  const profileOverlap = observedTerpenes.filter(obs =>
    allStrainTerpenes.some(strain => obs === strain)
  ).length;
  const profileSim = profileOverlap / Math.max(1, Math.max(observedTerpenes.length, allStrainTerpenes.length));
  
  return dominantSim * 0.6 + profileSim * 0.4;
}

/**
 * Phase 5.0.3.4 — Compare Effect Channels
 * Compares observed effect vector to strain effect vector
 */
function compareEffectChannels(
  observed: ObservedFingerprint["inferredEffectVector"],
  strain: StrainFingerprint["effectVector"]
): number {
  // If no observed effects, return neutral score
  if (observed.likely.length === 0 && observed.possible.length === 0) {
    return 0.5; // Neutral if no data
  }
  
  // Combine likely and possible effects
  const observedEffects = [...observed.likely, ...observed.possible];
  
  // Primary effect overlap (50% of effect score)
  const primaryOverlap = observed.likely.filter(obs =>
    strain.primary.some(strain => obs === strain)
  ).length;
  const primarySim = primaryOverlap / Math.max(1, Math.max(observed.likely.length, strain.primary.length));
  
  // Category similarity (50% of effect score)
  const categorySim = (
    (1 - Math.abs(observed.categories.physical - strain.categories.physical)) +
    (1 - Math.abs(observed.categories.mental - strain.categories.mental)) +
    (1 - Math.abs(observed.categories.medical - strain.categories.medical))
  ) / 3;
  
  return primarySim * 0.5 + categorySim * 0.5;
}

/**
 * Phase 5.0.3 — Match Observed Fingerprint Against Strain Fingerprint
 * 
 * Computes similarity per channel and applies weights.
 * Returns FingerprintMatchScore (0-1).
 */
export function matchFingerprints(
  observed: ObservedFingerprint,
  strain: StrainFingerprint
): FingerprintMatchScore {
  // Calculate per-channel similarities
  const visualScore = compareVisualChannels(observed.visualVector, strain.visualBaselineVector);
  const geneticsScore = compareGeneticsChannels(observed.inferredGeneticHints, strain.geneticLineageVector);
  const terpeneScore = compareTerpeneChannels(observed.inferredTerpeneVector, strain.terpeneVector);
  const effectScore = compareEffectChannels(observed.inferredEffectVector, strain.effectVector);
  
  // Apply confidence weights (how much to trust each channel)
  const visualWeight = observed.confidenceWeights.visual;
  const geneticsWeight = observed.confidenceWeights.genetic;
  const terpeneWeight = observed.confidenceWeights.terpene;
  const effectWeight = observed.confidenceWeights.effect;
  
  // Normalize weights (ensure they sum to 1.0)
  const totalWeight = visualWeight + geneticsWeight + terpeneWeight + effectWeight;
  const normalizedVisualWeight = totalWeight > 0 ? visualWeight / totalWeight : 0.4;
  const normalizedGeneticsWeight = totalWeight > 0 ? geneticsWeight / totalWeight : 0.2;
  const normalizedTerpeneWeight = totalWeight > 0 ? terpeneWeight / totalWeight : 0.2;
  const normalizedEffectWeight = totalWeight > 0 ? effectWeight / totalWeight : 0.2;
  
  // Calculate weighted overall score
  const overallScore = Math.max(0, Math.min(1,
    visualScore * normalizedVisualWeight +
    geneticsScore * normalizedGeneticsWeight +
    terpeneScore * normalizedTerpeneWeight +
    effectScore * normalizedEffectWeight
  ));
  
  // Calculate overall confidence (weighted average of channel confidences)
  const confidence = Math.round(
    visualScore * 100 * normalizedVisualWeight +
    geneticsScore * 100 * normalizedGeneticsWeight +
    terpeneScore * 100 * normalizedTerpeneWeight +
    effectScore * 100 * normalizedEffectWeight
  );
  
  // Build explanation
  const explanation: string[] = [];
  explanation.push(`Visual match: ${Math.round(visualScore * 100)}% (weight: ${Math.round(normalizedVisualWeight * 100)}%)`);
  explanation.push(`Genetics match: ${Math.round(geneticsScore * 100)}% (weight: ${Math.round(normalizedGeneticsWeight * 100)}%)`);
  explanation.push(`Terpene match: ${Math.round(terpeneScore * 100)}% (weight: ${Math.round(normalizedTerpeneWeight * 100)}%)`);
  explanation.push(`Effect match: ${Math.round(effectScore * 100)}% (weight: ${Math.round(normalizedEffectWeight * 100)}%)`);
  explanation.push(`Overall score: ${Math.round(overallScore * 100)}%`);
  
  return {
    strainName: strain.canonicalName,
    overallScore,
    channelScores: {
      visual: visualScore,
      genetics: geneticsScore,
      terpenes: terpeneScore,
      effects: effectScore,
    },
    channelWeights: {
      visual: normalizedVisualWeight,
      genetics: normalizedGeneticsWeight,
      terpenes: normalizedTerpeneWeight,
      effects: normalizedEffectWeight,
    },
    confidence,
    explanation,
  };
}

/**
 * Phase 5.0.3 — Match Against All Strains (DB-Scale)
 * 
 * Compares observed fingerprint against all 35,000+ strains.
 * Returns top N matches sorted by overall score.
 * 
 * OPTIMIZATION: Can be optimized with:
 * - Pre-computed fingerprint cache
 * - Hash-based quick filtering
 * - Parallel processing
 * - Early termination for low scores
 */
export function matchAgainstAllStrains(
  observed: ObservedFingerprint,
  strains: CultivarReference[],
  topN: number = 50 // Return top 50 matches
): FingerprintMatchScore[] {
  const matches: FingerprintMatchScore[] = [];
  
  // Phase 5.0.3 — Compare against all strains
  for (const strain of strains) {
    try {
      // Generate strain fingerprint (can be cached for performance)
      const strainFingerprint = generateStrainFingerprint(strain);
      
      // Match fingerprints
      const match = matchFingerprints(observed, strainFingerprint);
      
      // Only keep matches above threshold (0.3) to reduce noise
      if (match.overallScore >= 0.3) {
        matches.push(match);
      }
    } catch (error) {
      // Skip strains that fail fingerprint generation
      console.warn(`Phase 5.0.3 — Failed to generate fingerprint for ${strain.name}:`, error);
      continue;
    }
  }
  
  // Sort by overall score (descending)
  matches.sort((a, b) => b.overallScore - a.overallScore);
  
  // Return top N
  return matches.slice(0, topN);
}

/**
 * Phase 5.0.3 — Match Against Pre-computed Fingerprints (Optimized)
 * 
 * Uses pre-computed fingerprint map for faster matching.
 * This is the recommended approach for production.
 */
export function matchAgainstFingerprintMap(
  observed: ObservedFingerprint,
  fingerprintMap: Map<string, StrainFingerprint>,
  topN: number = 50
): FingerprintMatchScore[] {
  const matches: FingerprintMatchScore[] = [];
  
  // Phase 5.0.3 — Compare against all fingerprints in map
  for (const [strainName, strainFingerprint] of fingerprintMap.entries()) {
    try {
      // Match fingerprints
      const match = matchFingerprints(observed, strainFingerprint);
      
      // Only keep matches above threshold (0.3) to reduce noise
      if (match.overallScore >= 0.3) {
        matches.push(match);
      }
    } catch (error) {
      // Skip fingerprints that fail matching
      console.warn(`Phase 5.0.3 — Failed to match fingerprint for ${strainName}:`, error);
      continue;
    }
  }
  
  // Sort by overall score (descending)
  matches.sort((a, b) => b.overallScore - a.overallScore);
  
  // Return top N
  return matches.slice(0, topN);
}

/**
 * Phase 5.0.3 — Quick Hash-Based Pre-filtering
 * 
 * Uses hash comparison to quickly filter candidates before full matching.
 * This can significantly speed up matching for large databases.
 */
export function quickHashFilter(
  observed: ObservedFingerprint,
  fingerprintMap: Map<string, StrainFingerprint>,
  hashThreshold: number = 0.5 // Minimum hash similarity to consider
): StrainFingerprint[] {
  const candidates: StrainFingerprint[] = [];
  
  // Extract observed hashes
  const observedVisualHash = observed.visualVector.hash;
  const observedTerpeneHash = observed.inferredTerpeneVector.hash;
  const observedEffectHash = observed.inferredEffectVector.hash;
  const observedGeneticHash = observed.inferredGeneticHints.hash;
  
  for (const [strainName, strainFingerprint] of fingerprintMap.entries()) {
    // Quick hash comparison (exact or partial match)
    let hashMatches = 0;
    let totalHashes = 0;
    
    // Visual hash
    if (observedVisualHash !== "unknown" && strainFingerprint.visualBaselineVector.hash !== "unknown") {
      totalHashes++;
      if (observedVisualHash === strainFingerprint.visualBaselineVector.hash) {
        hashMatches++;
      } else if (observedVisualHash.split(":")[0] === strainFingerprint.visualBaselineVector.hash.split(":")[0]) {
        hashMatches += 0.5; // Partial match (density matches)
      }
    }
    
    // Terpene hash
    if (observedTerpeneHash !== "unknown" && strainFingerprint.terpeneVector.hash !== "unknown") {
      totalHashes++;
      const observedTerps = observedTerpeneHash.split(",");
      const strainTerps = strainFingerprint.terpeneVector.hash.split(",");
      const overlap = observedTerps.filter(obs => strainTerps.includes(obs)).length;
      if (overlap > 0) {
        hashMatches += overlap / Math.max(observedTerps.length, strainTerps.length);
      }
    }
    
    // Effect hash
    if (observedEffectHash !== "unknown" && strainFingerprint.effectVector.hash !== "unknown") {
      totalHashes++;
      const observedEffects = observedEffectHash.split(",");
      const strainEffects = strainFingerprint.effectVector.hash.split(",");
      const overlap = observedEffects.filter(obs => strainEffects.includes(obs)).length;
      if (overlap > 0) {
        hashMatches += overlap / Math.max(observedEffects.length, strainEffects.length);
      }
    }
    
    // Genetic hash
    if (observedGeneticHash !== "unknown" && strainFingerprint.geneticLineageVector.hash !== "unknown") {
      totalHashes++;
      if (observedGeneticHash === strainFingerprint.geneticLineageVector.hash) {
        hashMatches++;
      } else if (observedGeneticHash.split("|")[0] === strainFingerprint.geneticLineageVector.hash.split("|")[0]) {
        hashMatches += 0.5; // Partial match (type matches)
      }
    }
    
    // Calculate hash similarity
    const hashSimilarity = totalHashes > 0 ? hashMatches / totalHashes : 0;
    
    // Include if above threshold
    if (hashSimilarity >= hashThreshold) {
      candidates.push(strainFingerprint);
    }
  }
  
  return candidates;
}

/**
 * Phase 5.0.3 — Optimized DB-Scale Matching
 * 
 * Uses hash-based pre-filtering followed by full matching.
 * This is the recommended approach for production with 35,000+ strains.
 */
export function matchAgainstAllStrainsOptimized(
  observed: ObservedFingerprint,
  fingerprintMap: Map<string, StrainFingerprint>,
  topN: number = 50,
  hashThreshold: number = 0.3 // Lower threshold for more candidates
): FingerprintMatchScore[] {
  // Step 1: Quick hash-based pre-filtering
  const candidates = quickHashFilter(observed, fingerprintMap, hashThreshold);
  
  console.log(`Phase 5.0.3 — Hash pre-filtering: ${candidates.length} candidates from ${fingerprintMap.size} strains`);
  
  // Step 2: Full matching on candidates only
  const matches: FingerprintMatchScore[] = [];
  
  for (const strainFingerprint of candidates) {
    try {
      const match = matchFingerprints(observed, strainFingerprint);
      
      // Keep all matches (threshold already applied in pre-filtering)
      matches.push(match);
    } catch (error) {
      console.warn(`Phase 5.0.3 — Failed to match fingerprint for ${strainFingerprint.canonicalName}:`, error);
      continue;
    }
  }
  
  // Sort by overall score (descending)
  matches.sort((a, b) => b.overallScore - a.overallScore);
  
  // Return top N
  return matches.slice(0, topN);
}
