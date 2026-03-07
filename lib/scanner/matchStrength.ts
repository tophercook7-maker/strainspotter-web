// Phase 4.6.0 — MATCH STRENGTH RESOLVER
// lib/scanner/matchStrength.ts

export interface MatchStrength {
  score: number
  tier: string
  explanation: string[]
}

export function resolveMatchStrength(input: {
  nameConfidence: number
  imageCount: number
  agreementScore: number
}): MatchStrength {
  // Weighted calculation: 50% name confidence, 30% agreement, 20% image count boost
  const nameWeight = input.nameConfidence * 0.5
  const agreementWeight = input.agreementScore * 0.3
  const imageBoost = Math.min(20, input.imageCount * 5) // Max 20 points for 4+ images
  
  const score = Math.min(99, Math.round(nameWeight + agreementWeight + imageBoost))
  
  let tier = "Moderate"
  if (score >= 90) tier = "Very Strong"
  else if (score >= 75) tier = "Strong"
  else if (score < 60) tier = "Weak"
  
  const explanation: string[] = [
    `Name confidence: ${input.nameConfidence}%`,
    `${input.imageCount} image${input.imageCount > 1 ? "s" : ""} analyzed`,
    `Agreement score: ${input.agreementScore}%`,
  ]
  
  return {
    score,
    tier,
    explanation,
  }
}
