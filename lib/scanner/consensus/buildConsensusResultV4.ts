// lib/scanner/consensus/buildConsensusResultV4.ts
// Phase 4.0.2 — weighted consensus merge

export function buildConsensusResultV4(results: any[]) {
  const scoreMap: Record<string, number> = {}

  results.forEach(r => {
    r.candidateStrains.forEach((c: any) => {
      scoreMap[c.name] =
        (scoreMap[c.name] ?? 0) + c.confidence * (r.weight ?? 1)
    })
  })

  const sorted = Object.entries(scoreMap).sort((a, b) => b[1] - a[1])

  return {
    primaryMatch: sorted[0]?.[0] ?? "Unknown",
    rankedMatches: sorted.slice(0, 5),
  }
}
