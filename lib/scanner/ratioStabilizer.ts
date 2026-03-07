// Phase 4.3.2 — RATIO STABILIZATION ENGINE
// lib/scanner/ratioStabilizer.ts

export interface RatioStabilityResult {
  indica: number
  sativa: number
  hybrid: number
  confidence: number
  explanation: string[]
}

export function stabilizeRatio(
  ratios: { indica: number; sativa: number; hybrid: number }[]
): RatioStabilityResult {
  if (!ratios || ratios.length === 0) {
    return {
      indica: 33,
      sativa: 33,
      hybrid: 34,
      confidence: 0,
      explanation: ["No ratio data provided"],
    }
  }

  const sum = ratios.reduce(
    (acc, r) => {
      acc.indica += r.indica
      acc.sativa += r.sativa
      acc.hybrid += r.hybrid
      return acc
    },
    { indica: 0, sativa: 0, hybrid: 0 }
  )

  const count = ratios.length || 1

  const indica = Math.round(sum.indica / count)
  const sativa = Math.round(sum.sativa / count)
  const hybrid = Math.round(sum.hybrid / count)

  const normalizedTotal = indica + sativa + hybrid || 1

  return {
    indica: Math.round((indica / normalizedTotal) * 100),
    sativa: Math.round((sativa / normalizedTotal) * 100),
    hybrid: Math.round((hybrid / normalizedTotal) * 100),
    confidence: Math.min(99, 60 + count * 10),
    explanation: [
      "Ratio stabilized across multiple images",
      "Visual + genetic indicators combined",
      `Based on ${count} image analyses`,
    ],
  }
}
