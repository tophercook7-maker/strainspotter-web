// Phase 4.8.0 — INDICA / SATIVA / HYBRID RATIO ENGINE
// lib/scanner/ratioEngineV48.ts

export interface StrainRatio {
  indica: number
  sativa: number
  hybrid: number
  classification: "Indica-dominant" | "Sativa-dominant" | "Hybrid"
  confidence: number
  explanation: string[]
}

export function resolveStrainRatioV48(input: {
  genetics?: { indica?: number; sativa?: number; hybrid?: number }
  visualSignals?: { leafWidth?: "wide" | "narrow"; structure?: "compact" | "tall" }
  terpeneProfile?: string[]
}): StrainRatio {
  let indica = input.genetics?.indica ?? 33
  let sativa = input.genetics?.sativa ?? 33
  let hybrid = input.genetics?.hybrid ?? 34

  if (input.visualSignals?.leafWidth === "wide") indica += 10
  if (input.visualSignals?.leafWidth === "narrow") sativa += 10
  if (input.visualSignals?.structure === "compact") indica += 5
  if (input.visualSignals?.structure === "tall") sativa += 5

  if (input.terpeneProfile?.includes("myrcene")) indica += 5
  if (input.terpeneProfile?.includes("limonene")) sativa += 5

  const total = indica + sativa + hybrid
  indica = Math.round((indica / total) * 100)
  sativa = Math.round((sativa / total) * 100)
  hybrid = 100 - indica - sativa

  const classification =
    indica > sativa + 10 ? "Indica-dominant" :
    sativa > indica + 10 ? "Sativa-dominant" :
    "Hybrid"

  return {
    indica,
    sativa,
    hybrid,
    classification,
    confidence: 85,
    explanation: [
      "Genetic lineage weighting",
      "Visual morphology adjustment",
      "Terpene influence applied",
    ],
  }
}
