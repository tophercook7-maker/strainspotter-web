// Phase 4.9.0 — NAME-FIRST MATCH CONFIDENCE ENGINE
// lib/scanner/nameConfidenceV49.ts

export interface NameConfidenceResult {
  primaryName: string
  confidence: number
  alternateNames: string[]
  explanation: string[]
}

export function resolveNameConfidenceV49(input: {
  consensusNames: { name: string; score: number }[]
  imageAgreementCount: number
  databaseMatchStrength: number
}): NameConfidenceResult {
  const sorted = [...input.consensusNames].sort((a, b) => b.score - a.score)
  const top = sorted[0]

  let confidence = top.score
  if (input.imageAgreementCount >= 2) confidence += 8
  if (input.databaseMatchStrength > 80) confidence += 7

  confidence = Math.min(99, Math.round(confidence))

  return {
    primaryName: top.name,
    confidence,
    alternateNames: sorted.slice(1, 4).map(s => s.name),
    explanation: [
      "Name frequency across images",
      "Database lineage correlation",
      "Multi-image agreement boost",
    ],
  }
}
