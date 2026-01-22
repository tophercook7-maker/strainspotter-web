// Phase 4.3.5 — INDICA / SATIVA / HYBRID RATIO NORMALIZATION
// lib/scanner/ratioNormalizer.ts

export interface RawRatio {
  indica: number
  sativa: number
  hybrid: number
}

export interface NormalizedRatio extends RawRatio {
  classification: "Indica-dominant" | "Sativa-dominant" | "Hybrid"
}

export function normalizeRatio(raw: RawRatio): NormalizedRatio {
  const total = raw.indica + raw.sativa + raw.hybrid || 1

  const indica = Math.round((raw.indica / total) * 100)
  const sativa = Math.round((raw.sativa / total) * 100)
  const hybrid = Math.max(0, 100 - indica - sativa)

  let classification: NormalizedRatio["classification"] = "Hybrid"
  if (indica >= 60) classification = "Indica-dominant"
  else if (sativa >= 60) classification = "Sativa-dominant"

  return { indica, sativa, hybrid, classification }
}
