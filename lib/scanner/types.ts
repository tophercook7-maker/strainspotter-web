// FINAL S1 SCANNER RESULT CONTRACT (LOCKED)
// lib/scanner/types.ts

export interface ScannerResult {
  strainName: string
  confidence: number

  genetics: {
    dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown"
    lineage: string[]
  }

  experience: {
    effects: string[]
    bestFor: string[]
    bestTime?: string
  }

  disclaimer: string
}

// WIKI RESULT CONTRACT (Layer 2+)
export interface WikiResult {
  identity: {
    strainName: string
    confidence: number
  }

  genetics: {
    dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown"
    lineage: string[]
    breederNotes: string
  }

  morphology: {
    budStructure: string
    coloration: string
    trichomes: string
  }

  chemistry: {
    terpenes: Array<{ name: string; confidence: number }>
    cannabinoids: {
      THC: string
      CBD: string
    }
  }

  experience: {
    effects: string[]
    onset: string
    duration: string
    bestUse: string[]
  }

  cultivation: {
    difficulty: string
    floweringTime: string
    yield: string
    notes: string
  }

  disclaimer: string
}
