// Phase 4.5.0 — INDICA / SATIVA / HYBRID RATIO ENGINE
// lib/scanner/ratioResolver.ts

export interface StrainRatio {
  indica: number
  sativa: number
  hybrid: number
  label: "Indica-dominant" | "Sativa-dominant" | "Hybrid"
  confidence: number
}

export function resolveStrainRatio(input: {
  databaseRatio?: { indica: number; sativa: number; hybrid: number }
  visualSignals?: { indicaBias?: number; sativaBias?: number }
  terpeneSignals?: string[]
  nameConsensusStrength: number
}): StrainRatio {
  let indica = input.databaseRatio?.indica ?? 34
  let sativa = input.databaseRatio?.sativa ?? 33
  let hybrid = input.databaseRatio?.hybrid ?? 33

  if (input.visualSignals?.indicaBias) indica += input.visualSignals.indicaBias
  if (input.visualSignals?.sativaBias) sativa += input.visualSignals.sativaBias

  if (input.terpeneSignals?.includes("myrcene")) indica += 5
  if (input.terpeneSignals?.includes("limonene")) sativa += 5

  const total = indica + sativa + hybrid
  indica = Math.round((indica / total) * 100)
  sativa = Math.round((sativa / total) * 100)
  hybrid = 100 - indica - sativa

  const label =
    indica >= 55 ? "Indica-dominant" :
    sativa >= 55 ? "Sativa-dominant" :
    "Hybrid"

  return {
    indica,
    sativa,
    hybrid,
    label,
    confidence: Math.min(95, Math.round(70 + input.nameConsensusStrength * 0.3)),
  }
}
