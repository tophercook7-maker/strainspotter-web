// lib/scanner/traitWeights.ts
// Phase 3.1 Part B — Trait Weight Table

import type { ImageType } from "./imageTypeClassifier";

/**
 * Phase 3.1 Part B — Trait Weight Level
 */
export type TraitWeight = "very_high" | "high" | "medium" | "low" | "very_low";

/**
 * Phase 3.1 Part B — Trait names that can be weighted
 */
export type WeightableTrait = 
  | "structure"
  | "leafShape"
  | "internodalSpacing"
  | "color"
  | "trichomes"
  | "pistils"
  | "density"
  | "trichomeType"
  | "resinCoverage";

/**
 * Phase 3.1 Part B — Weight value mapping
 */
export const WEIGHT_VALUES: Record<TraitWeight, number> = {
  very_high: 1.5,  // +50% boost
  high: 1.25,      // +25% boost
  medium: 1.0,     // No change
  low: 0.75,       // -25% reduction
  very_low: 0.5,   // -50% reduction
};

/**
 * Phase 3.1 Part B — Trait Weight Table
 * Maps image type → trait → weight
 * 
 * PLANT:
 * - Structure: HIGH
 * - Leaf shape: HIGH
 * - Internodal spacing: MED
 * - Color: LOW
 * - Trichomes: LOW
 * 
 * BUD:
 * - Trichomes: HIGH
 * - Pistils: HIGH
 * - Density: HIGH
 * - Color: MED
 * - Structure: LOW
 * 
 * MACRO:
 * - Trichome type: VERY HIGH
 * - Resin coverage: VERY HIGH
 * - Color: MED
 * - Everything else: LOW
 */
export const TRAIT_WEIGHT_TABLE: Record<ImageType, Partial<Record<WeightableTrait, TraitWeight>>> = {
  plant: {
    structure: "high",
    leafShape: "high",
    internodalSpacing: "medium",
    color: "low",
    trichomes: "low",
    pistils: "low",
    density: "low",
    trichomeType: "very_low",
    resinCoverage: "very_low",
  },
  bud: {
    trichomes: "high",
    pistils: "high",
    density: "high",
    color: "medium",
    structure: "low",
    leafShape: "low",
    internodalSpacing: "low",
    trichomeType: "low",
    resinCoverage: "medium",
  },
  macro: {
    trichomeType: "very_high",
    resinCoverage: "very_high",
    color: "medium",
    trichomes: "medium",
    pistils: "low",
    density: "low",
    structure: "very_low",
    leafShape: "very_low",
    internodalSpacing: "very_low",
  },
  unknown: {
    // Unknown type gets neutral weights (medium for everything)
    structure: "medium",
    leafShape: "medium",
    internodalSpacing: "medium",
    color: "medium",
    trichomes: "medium",
    pistils: "medium",
    density: "medium",
    trichomeType: "medium",
    resinCoverage: "medium",
  },
};

/**
 * Phase 3.1 Part B — Get trait weight for image type
 */
export function getTraitWeight(
  imageType: ImageType,
  trait: WeightableTrait
): number {
  const weight = TRAIT_WEIGHT_TABLE[imageType]?.[trait] || "medium";
  return WEIGHT_VALUES[weight];
}

/**
 * Phase 3.1 Part B — Map detected trait to weightable trait
 */
export function mapTraitToWeightable(
  detectedTrait: "budStructure" | "trichomeDensity" | "pistilColor" | "leafShape"
): WeightableTrait {
  switch (detectedTrait) {
    case "budStructure":
      return "structure";
    case "trichomeDensity":
      return "trichomes";
    case "pistilColor":
      return "pistils";
    case "leafShape":
      return "leafShape";
    default:
      return "structure";
  }
}
