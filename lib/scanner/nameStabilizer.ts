// Phase 4.3.1 — NAME CONFIDENCE STABILIZATION
// lib/scanner/nameStabilizer.ts

export interface NameStabilityResult {
  stabilizedName: string
  stabilityScore: number
  explanation: string[]
}

export function stabilizeStrainName(
  candidateNames: { name: string; confidence: number }[]
): NameStabilityResult {
  if (!candidateNames || candidateNames.length === 0) {
    return {
      stabilizedName: "Unknown Cultivar",
      stabilityScore: 0,
      explanation: ["No candidate names provided"],
    }
  }

  const frequencyMap: Record<string, number> = {}

  for (const c of candidateNames) {
    frequencyMap[c.name] = (frequencyMap[c.name] || 0) + c.confidence
  }

  const sorted = Object.entries(frequencyMap)
    .sort((a, b) => b[1] - a[1])

  if (sorted.length === 0) {
    return {
      stabilizedName: "Unknown Cultivar",
      stabilityScore: 0,
      explanation: ["No valid candidate names found"],
    }
  }

  const [topName, topScore] = sorted[0]

  return {
    stabilizedName: topName,
    stabilityScore: Math.min(99, Math.round(topScore / candidateNames.length)),
    explanation: [
      `Name appeared consistently across images`,
      `Aggregated confidence score: ${Math.round(topScore)}`,
      `Stabilization reduced single-image variance`,
    ],
  }
}
