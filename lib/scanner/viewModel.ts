// lib/scanner/viewModel.ts
// 🔒 A.2 — LOCK ScannerViewModel
// Single source of truth for UI-facing scan data

// Phase 2.9 Part P Step 1 — Extended Strain Profile type
import type { ExtendedStrainProfile } from "./extendedProfile";

export type { ExtendedStrainProfile };

// Phase 2.5 Part L — Premium-Grade Result Structure
export interface ScannerViewModel {
  // STEP 1 — Hard Require: Strain Name
  name: string;
  title: string; // Keep for backward compat
  confidenceRange: {
    min: number;
    max: number;
    explanation: string; // Why range exists (phenotype variation, lighting, growth stage)
  };
  matchBasis: string; // Basis for match (e.g., "visual morphology across 3 images")
  
  // STEP 3 — Deep Analysis Sections
  visualMatchSummary: string;
  flowerStructureAnalysis: string;
  trichomeDensityMaturity: string;
  leafShapeInternode: string;
  colorPistilIndicators: string;
  growthPatternClues: string;
  
  // STEP 4 — Multi-Cultivar Comparison
  primaryMatch: {
    name: string;
    confidenceRange: { min: number; max: number };
    whyThisMatch: string;
  };
  secondaryMatches: Array<{
    name: string;
    whyNotPrimary: string;
  }>;
  
  // Phase 2.8 Part O — Trust & Explanation Engine
  trustLayer: {
    confidenceBreakdown: {
      visualSimilarity: number;
      traitOverlap: number;
      consensusStrength: number;
    };
    whyThisMatch: string[]; // 3-5 bullet explanation
    sourcesUsed: string[];
    confidenceLanguage: string; // "Closest known match", "Most likely cultivar", etc.
  };
  
  // STEP 6 — AI + Wiki Blend
  aiWikiBlend: string; // Explicit blend of AI inference + known cultivar references
  
  // STEP 8 — Why Not 100% Certain
  uncertaintyExplanation: string;
  
  // STEP 9 — How To Improve Accuracy
  accuracyTips: string[];
  
  // Legacy fields (keep for backward compat, but prioritize new structure)
  confidence: number; // 0–100 (deprecated, use confidenceRange)
  whyThisMatch: string; // (deprecated, use primaryMatch.whyThisMatch)
  morphology: string; // (deprecated, use flowerStructureAnalysis)
  trichomes: string; // (deprecated, use trichomeDensityMaturity)
  pistils: string; // (deprecated, use colorPistilIndicators)
  structure: string; // (deprecated, use flowerStructureAnalysis)
  growthTraits: string[]; // (deprecated, use growthPatternClues)
  terpeneGuess: string[];
  effectsShort: string[];
  effectsLong: string[]; // STEP 5 — Effects come AFTER structure
  comparisons?: string[];
  referenceStrains: string[];
  sources?: string[];
  genetics: {
    dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown";
    lineage: string;
  };
  experience: {
    effects: string[];
    bestFor: string[];
    bestTime?: string;
    summary?: string;
  };
  disclaimer: string;
  
  // Phase 2.9 Part P — Extended Strain Profile (Wiki-Depth Output)
  extendedProfile?: ExtendedStrainProfile;
}
