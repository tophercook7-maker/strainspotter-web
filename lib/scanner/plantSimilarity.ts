// lib/scanner/plantSimilarity.ts
export function assessPlantSimilarity(imageResults: any[]) {
  if (imageResults.length < 2) {
    return { samePlantLikelihood: 1, reason: "single-image" }
  }

  let sharedCandidates = 0
  let totalComparisons = 0

  for (let i = 0; i < imageResults.length; i++) {
    for (let j = i + 1; j < imageResults.length; j++) {
      totalComparisons++
      const a = imageResults[i].topCandidates?.map((c: any) => c.name) || []
      const b = imageResults[j].topCandidates?.map((c: any) => c.name) || []
      if (a.some((n: string) => b.includes(n))) {
        sharedCandidates++
      }
    }
  }

  const likelihood = totalComparisons === 0 ? 0 : sharedCandidates / totalComparisons

  return {
    samePlantLikelihood: likelihood,
    reason:
      likelihood > 0.6
        ? "high overlap in strain candidates"
        : likelihood > 0.3
        ? "partial overlap"
        : "low overlap — possibly different plants",
  }
}
