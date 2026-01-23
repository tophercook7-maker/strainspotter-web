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
export type ScanContext = {
  imageCount: number
  anglesInferred: boolean
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
    ratio?: {
      indica?: number
      sativa?: number
      hybrid?: number
      classification?: string
    }
  }

  disclaimer: string
}

// 🔒 Phase 2.2 — IdentificationReport (authoritative naming)
export interface IdentificationReport {
  // PRIMARY OUTPUT: The cultivar name with confidence range
  primaryMatch: {
    name: string;
    confidenceRange: string; // e.g. "72-84%"
    whyItWon: string[]; // Bullet-point reasons why this name was chosen
  };
  
  // Ranked alternates (from cultivarMatcher)
  alternateMatches: Array<{
    name: string;
    confidenceRange: string; // e.g. "60-72%"
    reasons: string[];
  }>;
  
  // Visual evidence (bullet-point factual traits)
  visualEvidence: {
    budStructure: string;
    trichomeDensity: string;
    pistilColor: string;
    coloration: string;
    leafShape?: string;
    matchingTraits: string[]; // Which traits matched the primary cultivar
  };
  
  // Known profile (genetics, effects, terpenes)
  knownProfile: {
    genetics: {
      dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown";
      lineage: string[];
    };
    effects: {
      primary: string[];
      secondary: string[];
    };
    terpenes: {
      likely: string[];
      inferred: string[];
    };
  };
  
  // Clear limitations (professional, factual)
  limitations: {
    uncertaintyFactors: string[];
    whyExactIDIsHard: string;
    disclaimer: string;
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

// Full scan result with analysis layer (includes dominance/ratio data)
export interface FullScanResult {
  result: import("./viewModel").ScannerViewModel;
  analysis?: {
    dominance?: {
      indica: number;
      sativa: number;
      hybrid: number;
      classification: "Indica-dominant" | "Sativa-dominant" | "Hybrid";
    };
  };
  diversityNote?: string; // Phase 4.0.4 — Diversity-related note for transparent explanation
  scanWarning?: string | null; // Phase 4.0.6 — Warning when similarity limits confidence
  scanNote?: string | null; // Phase 4.1.7 — Non-blocking UI message for low distinctness
  samePlantNote?: string | null; // Phase 4.2.0 — User-facing note when same-plant detected
  meta?: ScanMeta; // Phase 4.2.6 — Scan metadata (confidence cap, distinctiveness, guidance hints)
  warnings?: string[]; // Phase 4.0.5 — Warning channel (non-fatal)
}

// Phase 4.3.1 — Name Confidence Stabilization
export interface NameFirstDisplay {
  primaryStrainName: string;
  nameStabilityScore?: number;
  stabilityExplanation?: string[];
}

// Phase 4.0.5 — Final Strain Ratio (Single Source of Truth)
export type FinalStrainRatio = {
  indica: number; // 0–100
  sativa: number; // 0–100
  hybrid: number; // 0–100 (computed, not independent)
  classification: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
  confidence: number; // 0–100
  explanation: string[];
};

// Re-export ScannerViewModel from the canonical source
export type { ScannerViewModel } from "./viewModel";

// Phase 4.0.8 — extend ScanResult
// Phase 4.0.1 — Add error case for blocking scans
export type ScanResult =
  | {
      status: "success"
      consensus: import("./consensusEngine").ConsensusResult
      confidence: number
      result: import("./viewModel").ScannerViewModel // Backward compatibility
      synthesis: WikiSynthesis // Backward compatibility
      diversityNote?: string // Phase 4.0.5 — Backward compatibility
      scanWarning?: string | null // Phase 4.0.6 — Backward compatibility
      scanNote?: string | null // Phase 4.1.7 — Non-blocking UI message for low distinctness
      samePlantNote?: string | null // Phase 4.2.0 — User-facing note when same-plant detected
      meta?: ScanMeta // Phase 4.2.6 — Scan metadata
    }
  | {
      status: "partial"
      guard: {
        status: "low-diversity" | "low-confidence"
        reason: string
      }
      consensus: import("./consensusEngine").ConsensusResult
      confidence: number
      result: import("./viewModel").ScannerViewModel // Backward compatibility
      synthesis: WikiSynthesis // Backward compatibility
      diversityNote?: string // Phase 4.0.5 — Backward compatibility
      scanWarning?: string | null // Phase 4.0.6 — Backward compatibility
      scanNote?: string | null // Phase 4.1.7 — Non-blocking UI message for low distinctness
      samePlantNote?: string | null // Phase 4.2.0 — User-facing note when same-plant detected
      meta?: ScanMeta // Phase 4.2.6 — Scan metadata
    }
  | {
      error: true // Phase 4.0.1 — Block scan if images lack variance
      userMessage: string
    }

// Phase 4.0.2 — extend image result metadata
// Phase 4.0.3 — extend ImageScanResult
export type ImageScanResult = {
  confidence: number
  imageHash: string
  diversityPenalty?: number
  inferredAngle?: "macro-bud" | "side-profile" | "top-canopy" | "unknown"
}

// Phase 4.2.6 — extend ScanMeta
export interface ScanMeta {
  confidenceCap: number
  visualDistinctivenessScore?: number
  guidanceHints?: string[]
}

// Phase 4.0.5 — Warning channel (non-fatal)
// Phase 4.0.6 — Warning enum update
// Phase 4.0.7 — Warning enum
// Phase 4.0.8 — Extend warnings
export type ScanWarning =
  | "LOW_ANGLE_DIVERSITY"
  | "HIGH_IMAGE_SIMILARITY"
