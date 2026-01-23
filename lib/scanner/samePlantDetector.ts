// Phase 4.0.2 — SAME-PLANT AWARENESS (ENHANCED)
// lib/scanner/samePlantDetector.ts

import type { ImageResult } from "./consensusEngine";

/**
 * Phase 4.0.2 — Enhanced same-plant detection
 * 
 * Detects when multiple images appear to be the same plant by checking:
 * - High visual similarity (distinctness score)
 * - Overlapping trait vectors (detectedTraits overlap)
 * - Similar dominant terpenes (from wiki results)
 * - Similar structure & color (from detectedTraits)
 */
export function detectSamePlantEnhanced(
  imageResults: ImageResult[],
  distinctnessScore: number,
  visualSimilarity?: number
): {
  isSamePlant: boolean;
  confidence: number; // 0-1, how confident we are this is the same plant
  reasons: string[];
} {
  if (imageResults.length < 2) {
    return { isSamePlant: true, confidence: 1.0, reasons: ["single-image"] };
  }

  const signals: Array<{ weight: number; reason: string }> = [];

  // Signal 1: Visual similarity (distinctness score)
  // Low distinctness = high similarity = likely same plant
  if (distinctnessScore < 0.25) {
    signals.push({ weight: 0.35, reason: "high visual similarity" });
  } else if (distinctnessScore < 0.40) {
    signals.push({ weight: 0.20, reason: "moderate visual similarity" });
  }

  // Signal 2: Overlapping trait vectors
  const traitOverlap = calculateTraitOverlap(imageResults);
  if (traitOverlap.overlapRatio > 0.75) {
    signals.push({ weight: 0.30, reason: "high trait overlap" });
  } else if (traitOverlap.overlapRatio > 0.50) {
    signals.push({ weight: 0.15, reason: "moderate trait overlap" });
  }

  // Signal 3: Similar structure & color
  const structureColorSimilarity = calculateStructureColorSimilarity(imageResults);
  if (structureColorSimilarity > 0.80) {
    signals.push({ weight: 0.20, reason: "similar structure and color" });
  } else if (structureColorSimilarity > 0.60) {
    signals.push({ weight: 0.10, reason: "moderate structure/color similarity" });
  }

  // Signal 4: Similar dominant terpenes (if available)
  const terpeneSimilarity = calculateTerpeneSimilarity(imageResults);
  if (terpeneSimilarity > 0.70) {
    signals.push({ weight: 0.15, reason: "similar terpene profiles" });
  } else if (terpeneSimilarity > 0.50) {
    signals.push({ weight: 0.08, reason: "partial terpene similarity" });
  }

  // Calculate total confidence
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const isSamePlant = totalWeight >= 0.50; // Threshold: 50% of signals agree

  return {
    isSamePlant,
    confidence: Math.min(1.0, totalWeight),
    reasons: signals.map(s => s.reason),
  };
}

/**
 * Calculate trait overlap across images
 */
function calculateTraitOverlap(imageResults: ImageResult[]): {
  overlapRatio: number;
  sharedTraits: string[];
} {
  if (imageResults.length < 2) {
    return { overlapRatio: 1.0, sharedTraits: [] };
  }

  // Extract trait vectors from each image
  const traitVectors = imageResults.map(result => {
    const traits: string[] = [];
    const dt = result.detectedTraits;
    
    if (dt.budStructure) traits.push(`bud-${dt.budStructure}`);
    if (dt.trichomeDensity) traits.push(`trichome-${dt.trichomeDensity}`);
    if (dt.pistilColor) traits.push(`pistil-${dt.pistilColor}`);
    if (dt.leafShape) traits.push(`leaf-${dt.leafShape}`);
    
    return new Set(traits);
  });

  // Find shared traits across all images
  const allTraits = new Set<string>();
  traitVectors.forEach(tv => tv.forEach(t => allTraits.add(t)));
  
  const sharedTraits: string[] = [];
  allTraits.forEach(trait => {
    const appearsInAll = traitVectors.every(tv => tv.has(trait));
    if (appearsInAll) {
      sharedTraits.push(trait);
    }
  });

  // Calculate overlap ratio: shared traits / average traits per image
  const avgTraitsPerImage = traitVectors.reduce((sum, tv) => sum + tv.size, 0) / traitVectors.length;
  const overlapRatio = avgTraitsPerImage > 0 ? sharedTraits.length / avgTraitsPerImage : 0;

  return { overlapRatio: Math.min(1.0, overlapRatio), sharedTraits };
}

/**
 * Calculate structure and color similarity
 */
function calculateStructureColorSimilarity(imageResults: ImageResult[]): number {
  if (imageResults.length < 2) return 1.0;

  let matches = 0;
  let comparisons = 0;

  for (let i = 0; i < imageResults.length; i++) {
    for (let j = i + 1; j < imageResults.length; j++) {
      comparisons++;
      const a = imageResults[i].detectedTraits;
      const b = imageResults[j].detectedTraits;

      // Check structure match
      if (a.budStructure && b.budStructure && a.budStructure === b.budStructure) {
        matches += 0.5;
      }

      // Check color match
      if (a.pistilColor && b.pistilColor && a.pistilColor === b.pistilColor) {
        matches += 0.5;
      }
    }
  }

  return comparisons > 0 ? matches / comparisons : 0;
}

/**
 * Calculate terpene similarity across images
 */
function calculateTerpeneSimilarity(imageResults: ImageResult[]): number {
  if (imageResults.length < 2) return 1.0;

  // Extract terpene profiles from wiki results
  const terpeneProfiles = imageResults.map(result => {
    const wiki = result.wikiResult;
    const terpenes: string[] = [];
    
    // Extract from chemistry.terpenes if available
    if (wiki.chemistry?.terpenes) {
      wiki.chemistry.terpenes.forEach((t: any) => {
        if (typeof t === 'string') {
          terpenes.push(t.toLowerCase());
        } else if (t.name) {
          terpenes.push(t.name.toLowerCase());
        }
      });
    }
    
    // Extract from likelyTerpenes if available
    if (wiki.chemistry?.likelyTerpenes) {
      wiki.chemistry.likelyTerpenes.forEach((t: any) => {
        if (typeof t === 'string') {
          terpenes.push(t.toLowerCase());
        } else if (t.name) {
          terpenes.push(t.name.toLowerCase());
        }
      });
    }
    
    return new Set(terpenes);
  });

  // Calculate Jaccard similarity (intersection / union)
  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < terpeneProfiles.length; i++) {
    for (let j = i + 1; j < terpeneProfiles.length; j++) {
      comparisons++;
      const a = terpeneProfiles[i];
      const b = terpeneProfiles[j];

      if (a.size === 0 && b.size === 0) {
        totalSimilarity += 1.0; // Both empty = similar
      } else if (a.size === 0 || b.size === 0) {
        totalSimilarity += 0.0; // One empty, one not = dissimilar
      } else {
        // Jaccard: intersection / union
        const intersection = new Set([...a].filter(x => b.has(x)));
        const union = new Set([...a, ...b]);
        const similarity = union.size > 0 ? intersection.size / union.size : 0;
        totalSimilarity += similarity;
      }
    }
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

// Phase 4.1.8 — Legacy function (kept for backward compatibility)
export function detectSamePlant(images: Array<{ hash: string }>): boolean {
  if (images.length < 2) return true;

  const unique = new Set(images.map(i => i.hash));
  return unique.size <= Math.ceil(images.length / 2);
}
