// lib/scanner/imageTypeClassifier.ts
// Phase 3.1 Part A — Image Type Classifier

import type { WikiResult } from "./types";

/**
 * Phase 3.1 Part A — Image Type Classifier
 * Classifies images as "plant", "bud", "macro", or "unknown"
 */
export type ImageType = "plant" | "bud" | "macro" | "unknown";

/**
 * Phase 3.1 Part A — Image Observation
 * Stores image type and confidence per image
 */
export type ImageObservation = {
  imageType: ImageType;
  confidence: number; // 0-100
};

/**
 * Phase 3.1 Part A — Classify image type based on detected traits
 * 
 * Detection rules (soft):
 * - Large structure, stems, fan leaves → plant
 * - Dense trichomes, pistils dominant → bud
 * - Extreme close-up, resin focus → macro
 */
export function classifyImageType(wikiResult: WikiResult): ImageObservation {
  const morphology = wikiResult.morphology;
  const budStructure = morphology.budStructure.toLowerCase();
  const trichomes = morphology.trichomes.toLowerCase();
  const coloration = morphology.coloration.toLowerCase();
  
  // Collect signals
  let plantSignals = 0;
  let budSignals = 0;
  let macroSignals = 0;

  // Phase 3.1 Part A — Plant signals (large structure, stems, fan leaves)
  if (
    budStructure.includes("elongated") ||
    budStructure.includes("tall") ||
    budStructure.includes("stretchy") ||
    budStructure.includes("columnar") ||
    budStructure.includes("nodes") ||
    budStructure.includes("internodal")
  ) {
    plantSignals += 3;
  }
  if (morphology.growthIndicators?.some(g => 
    g.toLowerCase().includes("stem") ||
    g.toLowerCase().includes("branch") ||
    g.toLowerCase().includes("leaf") ||
    g.toLowerCase().includes("node")
  )) {
    plantSignals += 2;
  }
  if (morphology.visualTraits?.some(t =>
    t.toLowerCase().includes("fan leaf") ||
    t.toLowerCase().includes("stem") ||
    t.toLowerCase().includes("branching")
  )) {
    plantSignals += 2;
  }

  // Phase 3.1 Part A — Bud signals (dense trichomes, pistils dominant)
  if (
    trichomes.includes("dense") ||
    trichomes.includes("heavy") ||
    trichomes.includes("abundant") ||
    trichomes.includes("covered")
  ) {
    budSignals += 3;
  }
  if (
    budStructure.includes("dense") ||
    budStructure.includes("compact") ||
    budStructure.includes("chunky") ||
    budStructure.includes("tight")
  ) {
    budSignals += 2;
  }
  if (
    coloration.includes("pistil") ||
    coloration.includes("orange") ||
    coloration.includes("amber") ||
    coloration.includes("hairs")
  ) {
    budSignals += 1;
  }
  if (morphology.visualTraits?.some(t =>
    t.toLowerCase().includes("pistil") ||
    t.toLowerCase().includes("crystal") ||
    t.toLowerCase().includes("resin")
  )) {
    budSignals += 2;
  }

  // Phase 3.1 Part A — Macro signals (extreme close-up, resin focus)
  if (
    trichomes.includes("visible") ||
    trichomes.includes("clear") ||
    trichomes.includes("milky") ||
    trichomes.includes("amber") ||
    trichomes.includes("glassy")
  ) {
    macroSignals += 2;
  }
  if (
    morphology.visualTraits?.some(t =>
      t.toLowerCase().includes("trichome head") ||
      t.toLowerCase().includes("resin gland") ||
      t.toLowerCase().includes("crystal") ||
      t.toLowerCase().includes("microscopic")
    )
  ) {
    macroSignals += 3;
  }
  if (
    coloration.includes("resin") ||
    coloration.includes("crystal") ||
    coloration.includes("frost")
  ) {
    macroSignals += 2;
  }

  // Determine type based on signal strength
  const maxSignals = Math.max(plantSignals, budSignals, macroSignals);
  
  if (maxSignals === 0) {
    return {
      imageType: "unknown",
      confidence: 50,
    };
  }

  let imageType: ImageType;
  let confidence: number;

  if (plantSignals > budSignals && plantSignals > macroSignals) {
    imageType = "plant";
    confidence = Math.min(100, 60 + (plantSignals * 10));
  } else if (budSignals > plantSignals && budSignals > macroSignals) {
    imageType = "bud";
    confidence = Math.min(100, 60 + (budSignals * 10));
  } else if (macroSignals > plantSignals && macroSignals > budSignals) {
    imageType = "macro";
    confidence = Math.min(100, 60 + (macroSignals * 10));
  } else {
    // Tie - default to bud for ambiguous cases
    imageType = "bud";
    confidence = Math.min(100, 60 + (Math.max(budSignals, plantSignals, macroSignals) * 8));
  }

  return {
    imageType,
    confidence: Math.round(confidence),
  };
}
