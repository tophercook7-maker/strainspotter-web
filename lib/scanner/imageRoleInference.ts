// Phase 4.0.2 — IMAGE ROLE WEIGHTING & AUTO-ANGLE INFERENCE
// lib/scanner/imageRoleInference.ts

export type ImageRole =
  | "macro"
  | "structure"
  | "canopy"
  | "unknown"

export function inferImageRole(features: {
  trichomeDensity?: number
  leafVisibility?: number
  budCoverage?: number
  zoomLevel?: number
}): ImageRole {
  if ((features.trichomeDensity ?? 0) > 0.75) return "macro"
  if ((features.leafVisibility ?? 0) > 0.6) return "structure"
  if ((features.budCoverage ?? 0) > 0.6) return "canopy"
  return "unknown"
}
