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

// 🔒 B.1.2 — ScanContext (foundation layer for image-dependent intelligence)
export interface ScanContext {
  imageQuality: {
    focus: "sharp" | "moderate" | "blurry"
    noise: "low" | "moderate" | "high"
    lighting: "good" | "dim" | "harsh"
  }
  detectedFeatures: {
    leafShape?: string
    trichomeDensity?: string
    pistilColor?: string
  }
  uncertaintySignals?: {
    conflictingTraits?: string[]
  }
}

// 🔒 B.1.3 — WIKI RESULT CONTRACT (expanded structure)
export interface WikiResult {
  identity: {
    strainName: string
    confidence: number
    alternateMatches?: Array<{ strainName: string; confidence: number }>
  }

  genetics: {
    dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown"
    lineage: string[]
    breederNotes: string
    confidenceNotes?: string
  }

  morphology: {
    budStructure: string
    coloration: string
    trichomes: string
    visualTraits?: string[]
    growthIndicators?: string[]
  }

  chemistry: {
    terpenes: Array<{ name: string; confidence: number }>
    cannabinoids: {
      THC: string
      CBD: string
    }
    likelyTerpenes?: Array<{ name: string; confidence: number }>
    cannabinoidRange?: string
  }

  experience: {
    effects: string[]
    onset: string
    duration: string
    bestUse: string[]
    primaryEffects?: string[]
    secondaryEffects?: string[]
    varianceNotes?: string
  }

  cultivation: {
    difficulty: string
    floweringTime: string
    yield: string
    notes: string
  }

  reasoning?: {
    whyThisMatch: string
    conflictingSignals?: string[]
  }

  disclaimer: string
}

// 🔒 Phase 2.1 RESET — IdentificationReport (strict structured identification)
export interface IdentificationReport {
  // PRIMARY OUTPUT: The cultivar name
  primaryCultivar: {
    name: string;
    matchStrength: "Very Strong" | "Strong" | "Moderate";
    confidenceRationale: string[]; // Why this name was chosen
  };
  
  // Ranked alternates (from cultivarMatcher)
  rankedAlternates: Array<{
    name: string;
    score: number; // Internal only, 0-70
    reasons: string[];
  }>;
  
  // Visual evidence supporting the identification
  visualEvidence: {
    budStructure: string;
    trichomeDensity: string;
    pistilColor: string;
    coloration: string;
    matchingTraits: string[]; // Which traits matched the primary cultivar
  };
  
  // Clear limitations
  limitations: {
    uncertaintyFactors: string[];
    whyExactIDIsHard: string;
    disclaimer: string;
  };
  
  // Additional structured data (optional, for future use)
  genetics?: {
    dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown";
    lineage: string[];
  };
  effects?: {
    primary: string[];
    secondary: string[];
  };
  terpenes?: {
    likely: string[];
    inferred: string[];
  };
}

// 🔒 B.2.2 — WikiSynthesis (kept for backward compatibility, deprecated)
export interface WikiSynthesis {
  summary: string[] // 2-3 paragraphs
  whyThisMatters: string[] // 2-3 paragraphs
  uncertaintyExplanation: string[] // 2-3 paragraphs
  signalsConsidered?: string[] // Bullet points of signals
  patternsObserved?: string[] // Bullet points of patterns
  notablePatterns: string[] // Existing patterns (kept for backward compat)
  bestMatch: {
    name: string
    matchStrength: "Very Strong" | "Strong" | "Moderate"
    whyThisMatch: string[] // 3-5 bullets explaining why
  }
  // Phase 2.1: Extensive free-tier results
  identity: {
    closestCultivarName: string
    matchStrengthLabel: "Very Strong" | "Strong" | "Moderate"
    matchRationale: string[]
    alternateMatches?: string[] // Phase 2.2: Alternate cultivar names (no scores)
  }
  morphologyAnalysis: {
    flowerStructure: string
    trichomeCoverage: string
    pistilCharacteristics: string
    colorationNotes: string
  }
  terpeneInference: {
    likelyPrimary: string[]
    supportingTerpenes: string[]
    aromaDescriptors: string[]
    inferenceReasoning: string
  }
  effectProfile: {
    onsetDescription: string
    primaryEffects: string[]
    secondaryEffects: string[]
    durationEstimate: string
    functionalNotes: string
  }
  cultivationContext: {
    typicalGrowthType: string
    indoorOutdoorNotes: string
    harvestTimingClues: string
  }
  limitations: {
    uncertaintyFactors: string[]
    whyExactIDIsHard: string
  }
}
