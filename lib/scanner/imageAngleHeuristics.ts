// lib/scanner/imageAngleHeuristics.ts
// Phase 4.0.2 — Auto Angle Classification (Top / Side / Macro)
// Phase 4.0.3 — Angle & zoom inference (no ML, heuristic-based)

export type ImageAngle =
  | "macro-bud"
  | "side-profile"
  | "top-canopy"
  | "unknown"

// Phase 4.0.2 — Simple angle classification based on base64 length
export type SimpleImageAngle = "top" | "side" | "macro" | "unknown"

export function inferImageAngleFromBase64(base64: string): SimpleImageAngle {
  const len = base64.length

  if (len > 1_200_000) return "macro"
  if (len > 700_000) return "side"
  if (len > 350_000) return "top"

  return "unknown"
}

// Phase 4.0.2 — Angle inference from file size (proxy for base64 length)
// Base64 is ~4/3 the size of original file, so we adjust thresholds accordingly
export function inferImageAngleFromSize(fileSize: number): SimpleImageAngle {
  // Convert file size to approximate base64 length (base64 is ~33% larger)
  const approximateBase64Length = fileSize * 1.33

  if (approximateBase64Length > 1_200_000) return "macro"
  if (approximateBase64Length > 700_000) return "side"
  if (approximateBase64Length > 350_000) return "top"

  return "unknown"
}

// Phase 4.0.2 — Angle inference for ImageSeed type (uses file size)
// Note: This is a separate function to avoid conflict with the metadata-based inferImageAngle
export function inferImageAngleFromSeed(seed: { name: string; size: number }): SimpleImageAngle {
  return inferImageAngleFromSize(seed.size)
}

// Phase 4.0.3 — Metadata-based angle inference (existing implementation)
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
