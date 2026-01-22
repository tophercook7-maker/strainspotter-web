// lib/scanner/imageAngleHeuristics.ts
// Phase 4.0.3 — Angle & zoom inference (no ML, heuristic-based)

export type ImageAngle =
  | "macro-bud"
  | "side-profile"
  | "top-canopy"
  | "unknown"

export function inferImageAngle(meta: {
  width: number
  height: number
  focusScore: number
  edgeDensity: number
}): ImageAngle {
  if (meta.focusScore > 0.75 && meta.edgeDensity > 0.6) {
    return "macro-bud"
  }

  if (meta.height > meta.width && meta.edgeDensity < 0.45) {
    return "side-profile"
  }

  if (meta.width > meta.height && meta.edgeDensity < 0.4) {
    return "top-canopy"
  }

  return "unknown"
}
