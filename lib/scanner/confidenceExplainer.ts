// Phase 4.3.6 — CONFIDENCE EXPLANATION ENGINE
// Phase 4.1 — Enhanced with perceived intelligence improvements
// lib/scanner/confidenceExplainer.ts

import { generateIntelligentExplanation } from "./perceivedIntelligence";

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
  hasDatabaseMatch?: boolean
  hasMultiImageAgreement?: boolean
  agreementCount?: number
  matchType?: "exact" | "alias" | "token" | "phonetic" | "lineage"
  keyTraits?: string[]
  morphologySignals?: string[]
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
  if (score >= 90) tier = "Very High"
  else if (score >= 80) tier = "High"
  else if (score < 65) tier = "Low"

  // Phase 4.1 — Use intelligent explanation generation
  const explanation = generateIntelligentExplanation({
    confidencePercent: score,
    imageCount: input.imageCount,
    hasDatabaseMatch: input.hasDatabaseMatch ?? (input.databaseSupport > 0.6),
    hasMultiImageAgreement: input.hasMultiImageAgreement ?? (input.consensusStrength > 0.7),
    agreementCount: input.agreementCount,
    matchType: input.matchType,
    keyTraits: input.keyTraits,
    morphologySignals: input.morphologySignals,
  })

  // Add conflict context if present
  if (input.conflicts > 0) {
    explanation.push(
      `${input.conflicts} conflicting signal${
        input.conflicts > 1 ? "s" : ""
      } detected — confidence adjusted accordingly`
    )
  }

  return { score, tier, explanation }
}
