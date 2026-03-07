// lib/scanner/terpeneCannabinoidProfileV70.ts
// Phase 7.0 — Terpene & Cannabinoid Profile Engine

import type { ImageResult } from "./consensusEngine";
import type { FusedFeatures } from "./multiImageFusion";
import type { CultivarReference } from "./cultivarLibrary";

/**
 * Phase 7.0.1 — PER-IMAGE CHEMISTRY SIGNALS
 * 
 * For EACH image analyzed:
 * Infer likely terpene signals from:
 * - Color saturation
 * - Trichome density / clarity
 * - Bud structure & resin coverage
 * - Visual cues already extracted in morphology
 * 
 * Map to candidate terpenes with confidence weights:
 * - Myrcene
 * - Limonene
 * - Caryophyllene
 * - Pinene
 * - Linalool
 * - Humulene
 * - Terpinolene
 */
export function extractPerImageTerpeneSignals(
  imageResult: ImageResult,
  imageIndex: number
): Array<{ name: string; weight: number }> {
  const terpeneWeights: Map<string, number> = new Map();
  const traits = imageResult.detectedTraits;
  const wikiResult = imageResult.wikiResult;
  
  // Phase 7.0.1 — Color saturation → Terpene hints
  const colorProfile = (wikiResult.morphology.coloration || "").toLowerCase();
  const pistilColor = traits.pistilColor?.toLowerCase() || "";
  
  // Purple/violet → Linalool
  if (colorProfile.includes("purple") || colorProfile.includes("violet") || pistilColor.includes("purple")) {
    terpeneWeights.set("Linalool", (terpeneWeights.get("Linalool") || 0) + 0.15);
  }
  
  // Orange/amber → Terpinolene
  if (colorProfile.includes("orange") || colorProfile.includes("amber") || pistilColor.includes("orange") || pistilColor.includes("amber")) {
    terpeneWeights.set("Terpinolene", (terpeneWeights.get("Terpinolene") || 0) + 0.12);
  }
  
  // Phase 7.0.1 — Trichome density / clarity → Myrcene, Caryophyllene
  if (traits.trichomeDensity === "high") {
    terpeneWeights.set("Myrcene", (terpeneWeights.get("Myrcene") || 0) + 0.20);
    terpeneWeights.set("Caryophyllene", (terpeneWeights.get("Caryophyllene") || 0) + 0.15);
  } else if (traits.trichomeDensity === "medium") {
    terpeneWeights.set("Myrcene", (terpeneWeights.get("Myrcene") || 0) + 0.10);
    terpeneWeights.set("Caryophyllene", (terpeneWeights.get("Caryophyllene") || 0) + 0.08);
  }
  
  // Phase 7.0.1 — Bud structure & resin coverage → Limonene, Pinene
  if (traits.budStructure === "high") {
    // Dense buds → Limonene, Pinene
    terpeneWeights.set("Limonene", (terpeneWeights.get("Limonene") || 0) + 0.18);
    terpeneWeights.set("Pinene", (terpeneWeights.get("Pinene") || 0) + 0.12);
  } else if (traits.budStructure === "low") {
    // Airy buds → Terpinolene, Humulene
    terpeneWeights.set("Terpinolene", (terpeneWeights.get("Terpinolene") || 0) + 0.10);
    terpeneWeights.set("Humulene", (terpeneWeights.get("Humulene") || 0) + 0.08);
  }
  
  // Phase 7.0.1 — Leaf shape → Myrcene (broad) or Limonene (narrow)
  if (traits.leafShape === "broad") {
    terpeneWeights.set("Myrcene", (terpeneWeights.get("Myrcene") || 0) + 0.10);
  } else if (traits.leafShape === "narrow") {
    terpeneWeights.set("Limonene", (terpeneWeights.get("Limonene") || 0) + 0.10);
  }
  
  // Phase 7.0.1 — Morphology notes (from wikiResult)
  const morphologyText = (wikiResult.morphology.budStructure + " " + wikiResult.morphology.coloration).toLowerCase();
  
  // Resin/trichome mentions → Myrcene, Caryophyllene
  if (morphologyText.includes("resin") || morphologyText.includes("frost") || morphologyText.includes("trichome")) {
    terpeneWeights.set("Myrcene", (terpeneWeights.get("Myrcene") || 0) + 0.08);
    terpeneWeights.set("Caryophyllene", (terpeneWeights.get("Caryophyllene") || 0) + 0.06);
  }
  
  // Citrus/lemon mentions → Limonene
  if (morphologyText.includes("citrus") || morphologyText.includes("lemon") || morphologyText.includes("lime")) {
    terpeneWeights.set("Limonene", (terpeneWeights.get("Limonene") || 0) + 0.12);
  }
  
  // Pine/woody mentions → Pinene, Humulene
  if (morphologyText.includes("pine") || morphologyText.includes("woody") || morphologyText.includes("earthy")) {
    terpeneWeights.set("Pinene", (terpeneWeights.get("Pinene") || 0) + 0.10);
    terpeneWeights.set("Humulene", (terpeneWeights.get("Humulene") || 0) + 0.08);
  }
  
  // Phase 7.0.1 — Convert to array and normalize weights
  const terpenes = Array.from(terpeneWeights.entries())
    .map(([name, weight]) => ({ name, weight }))
    .sort((a, b) => b.weight - a.weight);
  
  // Normalize weights to 0-1 range
  const maxWeight = terpenes.length > 0 ? terpenes[0].weight : 1;
  if (maxWeight > 0) {
    terpenes.forEach(t => t.weight = t.weight / maxWeight);
  }
  
  return terpenes;
}

/**
 * Phase 7.0.2 — CONSENSUS TERPENE MERGE
 * 
 * Across all images:
 * 1. Combine terpene weights
 * 2. Boost terpenes appearing in ≥2 images
 * 3. Normalize to top 5
 * 4. Flag uncertainty when variance is high
 */
export function mergeConsensusTerpenes(
  perImageTerpenes: Array<Array<{ name: string; weight: number }>>,
  imageCount: number
): {
  primaryTerpenes: string[];
  secondaryTerpenes: string[];
  confidenceNotes: string[];
} {
  const terpeneScores = new Map<string, { totalWeight: number; appearances: number; imageIndices: number[] }>();
  
  // Phase 7.0.2 — 1. Combine terpene weights
  perImageTerpenes.forEach((terpenes, imageIndex) => {
    terpenes.forEach(terpene => {
      const existing = terpeneScores.get(terpene.name);
      if (existing) {
        existing.totalWeight += terpene.weight;
        existing.appearances++;
        existing.imageIndices.push(imageIndex);
      } else {
        terpeneScores.set(terpene.name, {
          totalWeight: terpene.weight,
          appearances: 1,
          imageIndices: [imageIndex],
        });
      }
    });
  });
  
  // Phase 7.0.2 — 2. Boost terpenes appearing in ≥2 images
  const boostedTerpenes = Array.from(terpeneScores.entries()).map(([name, data]) => {
    let boostedWeight = data.totalWeight;
    
    // Phase 7.0.2 — Boost for multi-image agreement
    if (data.appearances >= 2) {
      boostedWeight *= 1.5; // 50% boost for appearing in ≥2 images
    }
    if (data.appearances >= imageCount * 0.8) {
      boostedWeight *= 1.3; // Additional 30% boost for appearing in 80%+ of images
    }
    
    return {
      name,
      weight: boostedWeight,
      appearances: data.appearances,
    };
  });
  
  // Phase 7.0.2 — 3. Normalize to top 5
  boostedTerpenes.sort((a, b) => b.weight - a.weight);
  const top5 = boostedTerpenes.slice(0, 5);
  
  // Phase 7.0.2 — 4. Flag uncertainty when variance is high
  const confidenceNotes: string[] = [];
  if (imageCount === 1) {
    confidenceNotes.push("Single image analysis — terpene profile estimated from visual cues");
  } else {
    const variance = calculateTerpeneVariance(perImageTerpenes);
    if (variance > 0.4) {
      confidenceNotes.push("High variance detected across images — terpene profile may vary");
    } else if (variance > 0.2) {
      confidenceNotes.push("Moderate variance detected — terpene profile shows some consistency");
    } else {
      confidenceNotes.push("Low variance — terpene profile consistent across images");
    }
  }
  
  // Phase 7.0.2 — Split into primary (top 3) and secondary (next 2)
  const primaryTerpenes = top5.slice(0, 3).map(t => t.name);
  const secondaryTerpenes = top5.slice(3, 5).map(t => t.name);
  
  return {
    primaryTerpenes,
    secondaryTerpenes,
    confidenceNotes,
  };
}

/**
 * Phase 7.0.2 — Calculate terpene variance across images
 */
function calculateTerpeneVariance(
  perImageTerpenes: Array<Array<{ name: string; weight: number }>>
): number {
  if (perImageTerpenes.length < 2) {
    return 0; // No variance for single image
  }
  
  // Collect all unique terpene names
  const allTerpeneNames = new Set<string>();
  perImageTerpenes.forEach(terpenes => {
    terpenes.forEach(t => allTerpeneNames.add(t.name));
  });
  
  // Calculate variance for each terpene across images
  let totalVariance = 0;
  let terpeneCount = 0;
  
  allTerpeneNames.forEach(terpeneName => {
    const weights = perImageTerpenes.map(terpenes => {
      const found = terpenes.find(t => t.name === terpeneName);
      return found ? found.weight : 0;
    });
    
    const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length;
    totalVariance += variance;
    terpeneCount++;
  });
  
  return terpeneCount > 0 ? totalVariance / terpeneCount : 0;
}

/**
 * Phase 7.0.3 — CANNABINOID RANGE ESTIMATION
 * 
 * Estimate ranges (NOT exact values):
 * 
 * THC range buckets:
 * - Low (5–10%)
 * - Medium (10–18%)
 * - High (18–25%)
 * - Very High (25%+)
 * 
 * CBD presence:
 * - Trace
 * - Low
 * - Moderate
 * - Notable
 */
export function estimateCannabinoidRanges(
  imageResults: ImageResult[],
  dbEntry?: CultivarReference,
  fusedFeatures?: FusedFeatures
): {
  thcRange: string;
  cbdPresence: string;
} {
  // Phase 7.0.3 — Estimate THC range from visual cues
  let thcScore = 0;
  const thcSignals: string[] = [];
  
  // Phase 7.0.3 — Trichome density → THC indicator
  if (fusedFeatures?.trichomeDensity === "high") {
    thcScore += 30;
    thcSignals.push("High trichome density");
  } else if (fusedFeatures?.trichomeDensity === "medium") {
    thcScore += 15;
    thcSignals.push("Moderate trichome density");
  }
  
  // Phase 7.0.3 — Resin coverage → THC indicator
  imageResults.forEach(result => {
    const morphologyText = (result.wikiResult.morphology.budStructure + " " + result.wikiResult.morphology.trichomes).toLowerCase();
    if (morphologyText.includes("resin") || morphologyText.includes("frost") || morphologyText.includes("coated")) {
      thcScore += 10;
      thcSignals.push("Heavy resin coverage");
    }
  });
  
  // Phase 7.0.3 — Database hints (if available)
  if (dbEntry) {
    // Check if database has THC info (would be in notes or metadata)
    const notes = (dbEntry.breederNotes || dbEntry.notes || "").toLowerCase();
    if (notes.includes("high thc") || notes.includes("potent") || notes.includes("strong")) {
      thcScore += 20;
      thcSignals.push("Database indicates high potency");
    } else if (notes.includes("moderate") || notes.includes("balanced")) {
      thcScore += 10;
      thcSignals.push("Database indicates moderate potency");
    }
  }
  
  // Phase 7.0.3 — Determine THC range bucket
  let thcRange: string;
  if (thcScore >= 50) {
    thcRange = "Very High (25%+)";
  } else if (thcScore >= 35) {
    thcRange = "High (18–25%)";
  } else if (thcScore >= 20) {
    thcRange = "Medium (10–18%)";
  } else {
    thcRange = "Low (5–10%)";
  }
  
  // Phase 7.0.3 — Estimate CBD presence
  let cbdScore = 0;
  const cbdSignals: string[] = [];
  
  // Phase 7.0.3 — Database hints for CBD
  if (dbEntry) {
    const notes = (dbEntry.breederNotes || dbEntry.notes || "").toLowerCase();
    if (notes.includes("cbd") || notes.includes("hemp") || notes.includes("balanced")) {
      if (notes.includes("high cbd") || notes.includes("notable cbd")) {
        cbdScore += 30;
        cbdSignals.push("Database indicates notable CBD");
      } else if (notes.includes("moderate cbd")) {
        cbdScore += 15;
        cbdSignals.push("Database indicates moderate CBD");
      } else if (notes.includes("low cbd") || notes.includes("trace cbd")) {
        cbdScore += 5;
        cbdSignals.push("Database indicates trace CBD");
      }
    }
  }
  
  // Phase 7.0.3 — Visual cues (less reliable for CBD)
  // CBD-dominant strains often have different morphology, but this is harder to detect visually
  // Most modern strains have trace CBD unless specifically bred for it
  
  // Phase 7.0.3 — Determine CBD presence
  let cbdPresence: string;
  if (cbdScore >= 25) {
    cbdPresence = "Notable";
  } else if (cbdScore >= 15) {
    cbdPresence = "Moderate";
  } else if (cbdScore >= 5) {
    cbdPresence = "Low";
  } else {
    cbdPresence = "Trace"; // Default: most strains have trace CBD
  }
  
  return {
    thcRange,
    cbdPresence,
  };
}

/**
 * Phase 7.0 — MAIN FUNCTION: Terpene & Cannabinoid Profile Engine
 */
export function generateTerpeneCannabinoidProfileV70(
  imageResults: ImageResult[],
  fusedFeatures?: FusedFeatures,
  dbEntry?: CultivarReference
): {
  primaryTerpenes: string[];
  secondaryTerpenes: string[];
  thcRange: string;
  cbdPresence: string;
  confidenceNotes: string[];
} {
  // Phase 7.0.1 — PER-IMAGE CHEMISTRY SIGNALS
  const perImageTerpenes: Array<Array<{ name: string; weight: number }>> = [];
  
  imageResults.forEach((result, idx) => {
    const terpenes = extractPerImageTerpeneSignals(result, idx);
    perImageTerpenes.push(terpenes);
  });
  
  console.log("TERPENES PER IMAGE:", perImageTerpenes.map((terpenes, idx) => 
    `Image ${idx}: ${terpenes.slice(0, 3).map(t => `${t.name} (${(t.weight * 100).toFixed(0)}%)`).join(", ")}`
  ).join(" | "));
  
  // Phase 7.0.2 — CONSENSUS TERPENE MERGE
  const consensusTerpenes = mergeConsensusTerpenes(perImageTerpenes, imageResults.length);
  
  console.log("TERPENE CONSENSUS:", `Primary: ${consensusTerpenes.primaryTerpenes.join(", ")}, Secondary: ${consensusTerpenes.secondaryTerpenes.join(", ")}`);
  
  // Phase 7.0.3 — CANNABINOID RANGE ESTIMATION
  const cannabinoidEstimate = estimateCannabinoidRanges(imageResults, dbEntry, fusedFeatures);
  
  console.log("CANNABINOID RANGE:", `THC: ${cannabinoidEstimate.thcRange}, CBD: ${cannabinoidEstimate.cbdPresence}`);
  
  return {
    primaryTerpenes: consensusTerpenes.primaryTerpenes,
    secondaryTerpenes: consensusTerpenes.secondaryTerpenes,
    thcRange: cannabinoidEstimate.thcRange,
    cbdPresence: cannabinoidEstimate.cbdPresence,
    confidenceNotes: consensusTerpenes.confidenceNotes,
  };
}
