// Phase 5.0.2 — Image → Observation Fingerprint
// lib/scanner/observedFingerprint.ts

import type { VisualSignature } from "./visualFeatureExtraction";
import type { FusedFeatures } from "./multiImageFusion";
import type { CultivarReference } from "./cultivarLibrary";

/**
 * Phase 5.0.2 — Observed Fingerprint
 * 
 * This is NOT a strain guess — just "what we see" from the images.
 * Generated from scan data (1-5 images) without database matching.
 */
export type ObservedFingerprint = {
  visualVector: ObservedVisualVector;
  inferredTerpeneVector: ObservedTerpeneVector;
  inferredEffectVector: ObservedEffectVector;
  inferredGeneticHints: ObservedGeneticHints;
  confidenceWeights: ConfidenceWeights;
};

/**
 * Phase 5.0.2.1 — Observed Visual Vector
 * What we see in the images (not what we match)
 */
export type ObservedVisualVector = {
  density: number; // 0-1, observed bud density
  trichome: number; // 0-1, observed trichome density
  color: {
    primary: "lime" | "forest" | "purple" | "frost" | "mixed" | "unknown";
    secondary: string[]; // Additional colors observed
    spectrum: string[]; // Full color spectrum
  };
  structure: {
    leafShape: "narrow" | "broad" | "mixed" | "unknown";
    calyxShape: "round" | "elongated" | "mixed" | "unknown";
    leafToBudRatio: number; // 0-1, observed ratio
  };
  pistil: string[]; // Observed pistil colors (normalized, sorted)
  hash: string; // Quick comparison: "density:trichome:color:leaf:pistils"
  confidence: number; // 0-100, how confident we are in visual observations
};

/**
 * Phase 5.0.2.2 — Observed Terpene Vector
 * Inferred terpenes from visual/aroma cues (not confirmed)
 */
export type ObservedTerpeneVector = {
  likely: string[]; // Likely terpenes based on visual/aroma (normalized, sorted)
  possible: string[]; // Possible terpenes (lower confidence)
  confidence: number; // 0-100, confidence in terpene inference
  inferenceMethod: "visual" | "aroma" | "structure" | "combined" | "none";
  hash: string; // Quick comparison: "terpene1,terpene2,terpene3"
};

/**
 * Phase 5.0.2.3 — Observed Effect Vector
 * Inferred effects from visual/structure cues (not confirmed)
 */
export type ObservedEffectVector = {
  likely: string[]; // Likely effects based on structure/morphology (normalized, sorted)
  possible: string[]; // Possible effects (lower confidence)
  categories: {
    physical: number; // 0-1, inferred physical effect strength
    mental: number; // 0-1, inferred mental effect strength
    medical: number; // 0-1, inferred medical application strength
  };
  confidence: number; // 0-100, confidence in effect inference
  inferenceMethod: "structure" | "trichome" | "color" | "combined" | "none";
  hash: string; // Quick comparison: "effect1,effect2,effect3"
};

/**
 * Phase 5.0.2.4 — Observed Genetic Hints
 * Hints about genetics from visual morphology (not confirmed)
 */
export type ObservedGeneticHints = {
  typeHint: "indica" | "sativa" | "hybrid" | "unknown"; // Inferred from structure
  lineageHints: string[]; // Possible parent families (e.g., "kush", "haze", "cookies")
  confidence: number; // 0-100, confidence in genetic hints
  reasoning: string[]; // Why we think this (e.g., "broad leaves suggest indica")
  hash: string; // Quick comparison: "type|lineage1,lineage2"
};

/**
 * Phase 5.0.2.5 — Confidence Weights
 * How much to trust each component of the observed fingerprint
 */
export type ConfidenceWeights = {
  visual: number; // 0-1, confidence in visual observations
  terpene: number; // 0-1, confidence in terpene inference
  effect: number; // 0-1, confidence in effect inference
  genetic: number; // 0-1, confidence in genetic hints
  overall: number; // 0-1, overall confidence in observed fingerprint
};

/**
 * Phase 5.0.2.1 — Generate Observed Visual Vector
 * Extract visual characteristics from image signatures
 */
function generateObservedVisualVector(
  visualSignatures: VisualSignature[],
  fusedFeatures?: FusedFeatures
): ObservedVisualVector {
  if (visualSignatures.length === 0 && !fusedFeatures) {
    // Fallback if no data
    return {
      density: 0.5,
      trichome: 0.5,
      color: { primary: "unknown", secondary: [], spectrum: [] },
      structure: { leafShape: "unknown", calyxShape: "unknown", leafToBudRatio: 0.5 },
      pistil: [],
      hash: "unknown",
      confidence: 0,
    };
  }
  
  // Use visual signatures if available (more detailed)
  if (visualSignatures.length > 0) {
    // Average across multiple images
    const avgDensity = visualSignatures.reduce((sum, sig) => sum + sig.densityScore, 0) / visualSignatures.length / 100;
    const avgTrichome = visualSignatures.reduce((sum, sig) => sum + sig.trichomeScore, 0) / visualSignatures.length / 100;
    const avgLeafToBud = visualSignatures.reduce((sum, sig) => sum + sig.leafToBudRatio, 0) / visualSignatures.length;
    
    // Determine primary color (most common across images)
    const colorCounts = new Map<string, number>();
    visualSignatures.forEach(sig => {
      const primary = sig.colorProfile.primary;
      colorCounts.set(primary, (colorCounts.get(primary) || 0) + 1);
    });
    const primaryColor = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
    
    // Collect all secondary colors and spectrum
    const allSecondary = new Set<string>();
    const allSpectrum = new Set<string>();
    visualSignatures.forEach(sig => {
      sig.colorProfile.secondary?.forEach(c => allSecondary.add(c));
      sig.colorProfile.spectrum?.forEach(c => allSpectrum.add(c));
    });
    
    // Determine leaf shape (most common)
    const leafShapes = visualSignatures.map(sig => {
      // Infer from calyx profile or structure
      if (sig.calyxProfile.shape === "round") return "broad";
      if (sig.calyxProfile.shape === "elongated") return "narrow";
      return "unknown";
    });
    const leafShape = leafShapes.filter(s => s !== "unknown")[0] || "unknown";
    
    // Determine calyx shape (most common)
    const calyxShapes = visualSignatures.map(sig => sig.calyxProfile.shape);
    const calyxShape = calyxShapes.filter(s => s !== "unknown")[0] || "unknown";
    
    // Collect all pistil colors
    const allPistils = new Set<string>();
    visualSignatures.forEach(sig => {
      sig.pistilProfile.colors.forEach(c => allPistils.add(c.toLowerCase()));
    });
    
    // Calculate confidence based on agreement across images
    const extractionConfidences = visualSignatures.map(sig => sig.extractionConfidence);
    const avgConfidence = extractionConfidences.reduce((sum, c) => sum + c, 0) / extractionConfidences.length;
    const agreementBonus = visualSignatures.length > 1 
      ? Math.min(20, (visualSignatures.length - 1) * 5) // +5% per additional image, max +20%
      : 0;
    const confidence = Math.min(100, avgConfidence + agreementBonus);
    
    // Create hash
    const hash = `${avgDensity.toFixed(1)}:${avgTrichome.toFixed(1)}:${primaryColor}:${leafShape}:${Array.from(allPistils).sort().join(",")}`;
    
    return {
      density: Math.max(0, Math.min(1, avgDensity)),
      trichome: Math.max(0, Math.min(1, avgTrichome)),
      color: {
        primary: primaryColor as "lime" | "forest" | "purple" | "frost" | "mixed" | "unknown",
        secondary: Array.from(allSecondary).sort(),
        spectrum: Array.from(allSpectrum).sort(),
      },
      structure: {
        leafShape: leafShape as "narrow" | "broad" | "mixed" | "unknown",
        calyxShape: calyxShape as "round" | "elongated" | "mixed" | "unknown",
        leafToBudRatio: Math.max(0, Math.min(1, avgLeafToBud)),
      },
      pistil: Array.from(allPistils).sort(),
      hash,
      confidence: Math.round(confidence),
    };
  }
  
  // Fallback to fused features
  if (fusedFeatures) {
    const densityMap: Record<string, number> = {
      low: 0.33,
      medium: 0.67,
      high: 1.0,
    };
    const density = densityMap[fusedFeatures.budStructure?.toLowerCase() || "medium"] || 0.5;
    const trichome = densityMap[fusedFeatures.trichomeDensity?.toLowerCase() || "medium"] || 0.5;
    
    // Infer color from fused features (if available)
    const colorPrimary: "lime" | "forest" | "purple" | "frost" | "mixed" | "unknown" = "unknown";
    
    // Infer leaf shape
    const leafShape = fusedFeatures.leafShape === "narrow" ? "narrow" :
                     fusedFeatures.leafShape === "broad" ? "broad" : "unknown";
    
    const hash = `${density.toFixed(1)}:${trichome.toFixed(1)}:${colorPrimary}:${leafShape}:${fusedFeatures.pistilColor?.toLowerCase() || ""}`;
    
    return {
      density,
      trichome,
      color: { primary: colorPrimary, secondary: [], spectrum: [] },
      structure: { leafShape: leafShape as "narrow" | "broad" | "mixed" | "unknown", calyxShape: "unknown", leafToBudRatio: 0.5 },
      pistil: fusedFeatures.pistilColor ? [fusedFeatures.pistilColor.toLowerCase()] : [],
      hash,
      confidence: 60, // Lower confidence for fused features only
    };
  }
  
  // Ultimate fallback
  return {
    density: 0.5,
    trichome: 0.5,
    color: { primary: "unknown", secondary: [], spectrum: [] },
    structure: { leafShape: "unknown", calyxShape: "unknown", leafToBudRatio: 0.5 },
    pistil: [],
    hash: "unknown",
    confidence: 0,
  };
}

/**
 * Phase 5.0.2.2 — Generate Observed Terpene Vector
 * Infer terpenes from visual/aroma cues
 */
function generateObservedTerpeneVector(
  visualVector: ObservedVisualVector,
  terpeneProfile?: string[] | Array<{ name: string }> | any
): ObservedTerpeneVector {
  const likely: string[] = [];
  const possible: string[] = [];
  let confidence = 0;
  let inferenceMethod: "visual" | "aroma" | "structure" | "combined" | "none" = "none";
  
  // If terpene profile provided (from analysis), use it
  if (terpeneProfile) {
    let terpenes: string[] = [];
    if (Array.isArray(terpeneProfile)) {
      terpenes = terpeneProfile.map((t: any) => typeof t === "string" ? t : (t.name || "")).filter((t: string) => t.length > 0);
    } else if (terpeneProfile.terpenes) {
      terpenes = terpeneProfile.terpenes.map((t: any) => typeof t === "string" ? t : (t.name || "")).filter((t: string) => t.length > 0);
    }
    
    if (terpenes.length > 0) {
      likely.push(...terpenes.slice(0, 3).map(t => t.toLowerCase().trim()));
      possible.push(...terpenes.slice(3).map(t => t.toLowerCase().trim()));
      confidence = Math.min(100, terpenes.length * 20); // 20% per terpene, max 100%
      inferenceMethod = "combined";
    }
  }
  
  // Infer from visual cues if no terpene profile
  if (likely.length === 0) {
    // High trichome density → likely myrcene, limonene
    if (visualVector.trichome >= 0.7) {
      likely.push("myrcene", "limonene");
      confidence = 40;
      inferenceMethod = "visual";
    }
    
    // Purple color → possible linalool, caryophyllene
    if (visualVector.color.primary === "purple") {
      possible.push("linalool", "caryophyllene");
      if (confidence < 40) confidence = 30;
      inferenceMethod = inferenceMethod === "none" ? "visual" : "combined";
    }
    
    // Frosty appearance → possible pinene
    if (visualVector.color.primary === "frost" || visualVector.trichome >= 0.8) {
      possible.push("pinene");
      if (confidence < 30) confidence = 25;
      inferenceMethod = inferenceMethod === "none" ? "visual" : "combined";
    }
  }
  
  // Normalize and sort
  const normalizedLikely = likely.map(t => t.toLowerCase().trim()).filter(t => t.length > 0).sort();
  const normalizedPossible = possible.map(t => t.toLowerCase().trim()).filter(t => t.length > 0 && !normalizedLikely.includes(t)).sort();
  
  const hash = normalizedLikely.length > 0 ? normalizedLikely.join(",") : "unknown";
  
  return {
    likely: normalizedLikely,
    possible: normalizedPossible,
    confidence: Math.round(confidence),
    inferenceMethod,
    hash,
  };
}

/**
 * Phase 5.0.2.3 — Generate Observed Effect Vector
 * Infer effects from visual/structure cues
 */
function generateObservedEffectVector(
  visualVector: ObservedVisualVector,
  effects?: string[]
): ObservedEffectVector {
  const likely: string[] = [];
  const possible: string[] = [];
  let confidence = 0;
  let inferenceMethod: "structure" | "trichome" | "color" | "combined" | "none" = "none";
  
  // If effects provided (from analysis), use them
  if (effects && effects.length > 0) {
    likely.push(...effects.slice(0, 5).map(e => e.toLowerCase().trim()));
    possible.push(...effects.slice(5).map(e => e.toLowerCase().trim()));
    confidence = Math.min(100, effects.length * 15); // 15% per effect, max 100%
    inferenceMethod = "combined";
  }
  
  // Infer from structure if no effects provided
  if (likely.length === 0) {
    // Dense buds + broad leaves → likely indica effects (relaxation, body calm)
    if (visualVector.density >= 0.7 && visualVector.structure.leafShape === "broad") {
      likely.push("relaxation", "body calm");
      possible.push("sedation", "sleep");
      confidence = 50;
      inferenceMethod = "structure";
    }
    
    // Airy buds + narrow leaves → likely sativa effects (energy, creativity)
    if (visualVector.density <= 0.4 && visualVector.structure.leafShape === "narrow") {
      likely.push("energy", "creativity");
      possible.push("focus", "uplifted");
      confidence = 50;
      inferenceMethod = inferenceMethod === "none" ? "structure" : "combined";
    }
    
    // High trichome → possible strong effects
    if (visualVector.trichome >= 0.8) {
      possible.push("potent", "intense");
      if (confidence < 50) confidence = 40;
      inferenceMethod = inferenceMethod === "none" ? "trichome" : "combined";
    }
  }
  
  // Categorize effects
  const physicalKeywords = ["relax", "body", "sedat", "calm", "sleep", "pain", "muscle", "couch"];
  const mentalKeywords = ["euphor", "creativ", "focus", "energ", "uplift", "cerebral", "head"];
  const medicalKeywords = ["anxiet", "depress", "nausea", "appetite", "inflamm", "seizure", "ptsd"];
  
  let physical = 0;
  let mental = 0;
  let medical = 0;
  
  [...likely, ...possible].forEach(effect => {
    const effectLower = effect.toLowerCase();
    if (physicalKeywords.some(kw => effectLower.includes(kw))) physical += 0.2;
    if (mentalKeywords.some(kw => effectLower.includes(kw))) mental += 0.2;
    if (medicalKeywords.some(kw => effectLower.includes(kw))) medical += 0.2;
  });
  
  // Normalize to 0-1
  physical = Math.min(1.0, physical);
  mental = Math.min(1.0, mental);
  medical = Math.min(1.0, medical);
  
  // Normalize and sort
  const normalizedLikely = likely.map(e => e.toLowerCase().trim()).filter(e => e.length > 0).sort();
  const normalizedPossible = possible.map(e => e.toLowerCase().trim()).filter(e => e.length > 0 && !normalizedLikely.includes(e)).sort();
  
  const hash = normalizedLikely.length > 0 ? normalizedLikely.slice(0, 3).join(",") : "unknown";
  
  return {
    likely: normalizedLikely,
    possible: normalizedPossible,
    categories: { physical, mental, medical },
    confidence: Math.round(confidence),
    inferenceMethod,
    hash,
  };
}

/**
 * Phase 5.0.2.4 — Generate Observed Genetic Hints
 * Infer genetics from visual morphology
 */
function generateObservedGeneticHints(
  visualVector: ObservedVisualVector
): ObservedGeneticHints {
  let typeHint: "indica" | "sativa" | "hybrid" | "unknown" = "unknown";
  const lineageHints: string[] = [];
  let confidence = 0;
  const reasoning: string[] = [];
  
  // Infer type from structure
  if (visualVector.structure.leafShape === "broad" && visualVector.density >= 0.6) {
    typeHint = "indica";
    confidence = 60;
    reasoning.push("Broad leaves and dense bud structure suggest indica genetics");
  } else if (visualVector.structure.leafShape === "narrow" && visualVector.density <= 0.5) {
    typeHint = "sativa";
    confidence = 60;
    reasoning.push("Narrow leaves and airy bud structure suggest sativa genetics");
  } else if (visualVector.structure.leafShape !== "unknown" && visualVector.density > 0.4 && visualVector.density < 0.7) {
    typeHint = "hybrid";
    confidence = 50;
    reasoning.push("Mixed leaf shape and moderate density suggest hybrid genetics");
  }
  
  // Infer lineage hints from color and structure
  // Purple color → possible purple/blue lineage
  if (visualVector.color.primary === "purple") {
    lineageHints.push("purple", "blue");
    reasoning.push("Purple coloration suggests purple or blue lineage");
    if (confidence < 50) confidence = 40;
  }
  
  // High trichome + dense → possible kush lineage
  if (visualVector.trichome >= 0.7 && visualVector.density >= 0.7) {
    lineageHints.push("kush");
    reasoning.push("High trichome density and dense structure suggest kush lineage");
    if (confidence < 50) confidence = 45;
  }
  
  // Elongated structure → possible haze lineage
  if (visualVector.structure.calyxShape === "elongated" && visualVector.density <= 0.5) {
    lineageHints.push("haze");
    reasoning.push("Elongated calyx structure suggests haze lineage");
    if (confidence < 50) confidence = 40;
  }
  
  // Frosty appearance → possible cookies/OG lineage
  if (visualVector.color.primary === "frost" || visualVector.trichome >= 0.8) {
    lineageHints.push("cookies", "og");
    reasoning.push("Frosty appearance suggests cookies or OG lineage");
    if (confidence < 50) confidence = 40;
  }
  
  // Remove duplicates and normalize
  const normalizedHints = Array.from(new Set(lineageHints.map(h => h.toLowerCase().trim()))).sort();
  
  const hash = `${typeHint}|${normalizedHints.join(",")}`;
  
  return {
    typeHint,
    lineageHints: normalizedHints,
    confidence: Math.round(confidence),
    reasoning,
    hash,
  };
}

/**
 * Phase 5.0.2.5 — Calculate Confidence Weights
 * How much to trust each component
 */
function calculateConfidenceWeights(
  visualVector: ObservedVisualVector,
  terpeneVector: ObservedTerpeneVector,
  effectVector: ObservedEffectVector,
  geneticHints: ObservedGeneticHints,
  imageCount: number
): ConfidenceWeights {
  // Visual confidence: based on extraction confidence and image count
  const visual = Math.min(1.0, visualVector.confidence / 100);
  
  // Terpene confidence: based on inference confidence
  const terpene = Math.min(1.0, terpeneVector.confidence / 100);
  
  // Effect confidence: based on inference confidence
  const effect = Math.min(1.0, effectVector.confidence / 100);
  
  // Genetic confidence: based on hints confidence
  const genetic = Math.min(1.0, geneticHints.confidence / 100);
  
  // Overall confidence: weighted average
  // Visual is most reliable (40%), others share remaining 60%
  const overall = (
    visual * 0.40 +
    terpene * 0.20 +
    effect * 0.20 +
    genetic * 0.20
  );
  
  // Boost overall confidence with multiple images
  const imageBoost = Math.min(0.15, (imageCount - 1) * 0.05); // +5% per additional image, max +15%
  
  return {
    visual,
    terpene,
    effect,
    genetic,
    overall: Math.min(1.0, overall + imageBoost),
  };
}

/**
 * Phase 5.0.2 — Generate Observed Fingerprint
 * 
 * From the scan (1-5 images), generate what we observe.
 * This is NOT a strain guess — just "what we see".
 */
export function generateObservedFingerprint(
  visualSignatures: VisualSignature[],
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: string[] | Array<{ name: string }> | any,
  effects?: string[],
  imageCount?: number
): ObservedFingerprint {
  const actualImageCount = imageCount || visualSignatures.length || 1;
  
  // Generate visual vector
  const visualVector = generateObservedVisualVector(visualSignatures, fusedFeatures);
  
  // Generate terpene vector (inferred from visual/aroma)
  const inferredTerpeneVector = generateObservedTerpeneVector(visualVector, terpeneProfile);
  
  // Generate effect vector (inferred from structure)
  const inferredEffectVector = generateObservedEffectVector(visualVector, effects);
  
  // Generate genetic hints (inferred from morphology)
  const inferredGeneticHints = generateObservedGeneticHints(visualVector);
  
  // Calculate confidence weights
  const confidenceWeights = calculateConfidenceWeights(
    visualVector,
    inferredTerpeneVector,
    inferredEffectVector,
    inferredGeneticHints,
    actualImageCount
  );
  
  return {
    visualVector,
    inferredTerpeneVector,
    inferredEffectVector,
    inferredGeneticHints,
    confidenceWeights,
  };
}
