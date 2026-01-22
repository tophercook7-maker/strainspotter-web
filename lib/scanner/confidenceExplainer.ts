// Phase 4.3.6 — CONFIDENCE EXPLANATION ENGINE
// lib/scanner/confidenceExplainer.ts

export interface ConfidenceExplanation {
  score: number
  tier: "Very High" | "High" | "Medium" | "Low"
  explanation: string[]
}

export function buildConfidenceExplanation(input: {
  imageCount: number
  consensusStrength: number
  databaseSupport: number
  conflicts: number
}): ConfidenceExplanation {
  const score = Math.min(
    99,
    Math.round(
      input.consensusStrength * 0.4 +
        input.databaseSupport * 0.4 +
        input.imageCount * 5 -
        input.conflicts * 10
    )
  )

  let tier: ConfidenceExplanation["tier"] = "Medium"
  if (score >= 93) tier = "Very High"
  else if (score >= 85) tier = "High"
  else if (score < 70) tier = "Low"

  const explanation: string[] = [
    `${input.imageCount} image${input.imageCount > 1 ? "s" : ""} analyzed`,
    `Consensus strength: ${input.consensusStrength}%`,
    `Database alignment: ${input.databaseSupport}%`,
  ]

  if (input.conflicts > 0) {
    explanation.push(
      `${input.conflicts} conflicting signal${
        input.conflicts > 1 ? "s" : ""
      } detected`
    )
  }

  return { score, tier, explanation }
}
