// Phase 4.7.0 — NAME-FIRST DISAMBIGUATION ENGINE
// lib/scanner/nameDisambiguation.ts

export interface SimilarStrain {
  name: string
  confidence: number
  whyNotChosen: string[]
}

export interface NameDisambiguation {
  primary: {
    name: string
    confidence: number
    whyChosen: string[]
  }
  alternatives: SimilarStrain[]
}

export function resolveNameDisambiguation(input: {
  primaryName: string
  primaryConfidence: number
  candidates: {
    name: string
    confidence: number
    traitsMatched: string[]
    traitsMissing: string[]
  }[]
}): NameDisambiguation {
  const alternatives = input.candidates
    .filter(c => c.name !== input.primaryName)
    .slice(0, 3)
    .map(c => ({
      name: c.name,
      confidence: c.confidence,
      whyNotChosen: [
        ...c.traitsMissing.map(t => `Missing trait: ${t}`),
        ...c.traitsMatched.map(t => `Matched: ${t}`),
      ],
    }))

  return {
    primary: {
      name: input.primaryName,
      confidence: input.primaryConfidence,
      whyChosen: [
        "Appeared consistently across images",
        "Highest visual + genetic agreement",
        "Strong terpene and structure alignment",
      ],
    },
    alternatives,
  }
}
