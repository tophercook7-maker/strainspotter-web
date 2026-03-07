// lib/scanner/consensus/buildConsensusResultV4.ts
// Phase 4.0.2 — weighted consensus merge
// Phase 4.0.3 — confidence floor protection

const MIN_CONFIDENCE = 62

export function buildConsensusResultV4(results: any[]) {
  const scoreMap: Record<string, number> = {}

  results.forEach(r => {
    r.candidateStrains.forEach((c: any) => {
      scoreMap[c.name] =
        (scoreMap[c.name] ?? 0) + c.confidence * (r.weight ?? 1)
    })
  })

  const sorted = Object.entries(scoreMap).sort((a, b) => b[1] - a[1])

  // Phase 4.0.3 — Apply confidence floor protection
  const primaryScore = sorted[0]?.[1] ?? 0
  const finalConfidence = Math.max(
    MIN_CONFIDENCE,
    Math.round(primaryScore)
  )

  return {
    primaryMatch: sorted[0]?.[0] ?? "Closest Known Cultivar",
    rankedMatches: sorted.slice(0, 5),
    confidence: finalConfidence,
  }
}
