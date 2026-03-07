// Phase 4.3.4 — NAME CONFIDENCE FUSION
// lib/scanner/nameConfidenceFusion.ts

export interface NameSignal {
  name: string
  confidence: number
  source: "visual" | "database" | "consensus"
}

export interface FusedNameResult {
  primaryName: string
  confidence: number
  breakdown: NameSignal[]
}

export function fuseNameConfidence(signals: NameSignal[]): FusedNameResult {
  if (!signals || signals.length === 0) {
    return {
      primaryName: "Closest Known Cultivar",
      confidence: 0,
      breakdown: [],
    }
  }

  const map = new Map<string, number>()
  const breakdown: NameSignal[] = []

  for (const s of signals) {
    map.set(s.name, (map.get(s.name) ?? 0) + s.confidence)
    breakdown.push(s)
  }

  const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  const [primaryName, total] = sorted[0] ?? ["Closest Known Cultivar", 0]

  return {
    primaryName,
    confidence: Math.min(99, Math.round(total / signals.length)),
    breakdown,
  }
}
