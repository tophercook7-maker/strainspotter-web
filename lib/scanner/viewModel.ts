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
    type?: "Indica" | "Sativa" | "Hybrid"; // Phase 5.4.5 — Type from ratio calculation
    ratioLabel?: string; // Phase 5.4.5 — e.g. "70% Indica / 30% Sativa"
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
  
  // Phase 3.4 Part C — Multi-Image Confidence Explanation
  multiImageInfo?: {
    imageCountText: string; // "Based on X images"
    confidenceRange: string; // "86–92%"
    improvementExplanation: string; // Why confidence improved
  };
  
  // Phase 3.5 Part C — Strain Naming & Closest Match
  namingInfo?: {
    matchType: "exact" | "closest_cultivar" | "strain_family";
    displayLabel: string; // "Closest known match" or "Exact match"
    rationale: string; // One-sentence explanation
  };
  
  // Phase 4.0 Part D — Confidence Tier (Enhanced)
  confidenceTier?: {
    tier: "very_high" | "high" | "medium" | "low";
    label: string;
    description: string;
  };
  
  // Phase 4.0 Part E — Per-Image Findings
  perImageFindings?: Array<{
    imageIndex: number;
    label: string; // "Top view", "Side view", etc.
    strainName: string;
    confidence: number;
    keyTraits: string[];
    differences?: string[];
  }>;
  
  // Phase 4.0 Part E — Consensus Alignment
  consensusAlignment?: {
    whatAligned: string[];
    whatDiffered: string[];
  };
  
  // Phase 4.3 Step 4.3.6 — Name-First Display
  // Phase 4.5 Step 4.5.1 — Name Lock Header
  // Phase 4.5 Step 4.5.3 — Why This Strain (FREE TIER)
  // Phase 4.6 — Indica/Sativa/Hybrid Ratio Engine
  // Phase 5.5 Step 5.5.5 — Enhanced with aliases
  // Phase 5.1.5 — VIEWMODEL UPDATE: ScannerViewModel must include primaryName, confidencePercent, alternateMatches, whyThisNameWon
  nameFirstDisplay?: {
    primaryStrainName: string;
    primaryName: string; // Phase 5.1.5 — Alias for primaryStrainName
    confidencePercent: number;
    confidenceTier: "very_high" | "high" | "medium" | "low";
    tagline: string; // "Closest known match based on visual + database consensus"
    alsoKnownAs?: string[]; // Phase 5.5.5 — Aliases (e.g., "GSC", "Girl Scout Cookies")
    alternateMatches?: Array<{
      name: string;
      confidence?: number; // Phase 5.1.5
      whyNotPrimary: string;
    }>; // "Often confused with: X, Y" (Phase 4.5 Step 4.5.2 — Collapsed if confidence < 92%)
    // Phase 4.5 Step 4.5.3 — Explanation for "Why this strain?" section (FREE TIER)
    // Phase 5.1.5 — whyThisNameWon is required
    explanation?: {
      whyThisNameWon: string[]; // 3-5 bullets: Visual markers, database frequency, lineage, terpenes (Phase 5.1.4)
      whatRuledOutOthers: string[]; // Why other candidates didn't win
      varianceNotes: string[]; // Phenotype variance explanation
    };
  // Phase 4.6 Step 4.6.2 — Indica/Sativa/Hybrid Ratio (FREE TIER)
  // Phase 5.0 Step 5.0.4 — Enhanced with range display
  // Phase 5.2.5 — VIEWMODEL INTEGRATION: Extend ScannerViewModel with strainType
  ratio?: {
    indicaPercent: number; // 0-100
    sativaPercent: number; // 0-100
    indicaRange?: { min: number; max: number }; // Phase 5.0 — Range if variance exists
    sativaRange?: { min: number; max: number }; // Phase 5.0 — Range if variance exists
    dominance: "Indica" | "Sativa" | "Hybrid" | "Balanced";
    hybridLabel: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid" | "Indica-leaning Hybrid" | "Sativa-leaning Hybrid"; // Phase 5.0.3.4
    displayText: string; // "Indica 70% · Sativa 30%" or "Indica-leaning Hybrid (60–70% Indica)"
    explanation: {
      summary: string; // Short summary for collapsed header
      fullExplanation: string[]; // Bullets for expanded section
    };
  };
  
  // Phase 5.2.5 — VIEWMODEL INTEGRATION: strainType field
  strainType?: {
    indica: number; // e.g. 65
    sativa: number; // e.g. 35
    label: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid"; // Phase 5.2.4
  };
  
  // Phase 5.3.5 — VIEWMODEL OUTPUT: Extend ScannerViewModel with strainIdentity
  strainIdentity?: {
    name: string;
    confidence: number;
    alternates: string[]; // Phase 5.3.5
  };
  
  // Phase 5.5.4 — VIEWMODEL OUTPUT: Extend ScannerViewModel with identification
  identification?: {
    primaryName: string;
    confidence: number;
    alternates: Array<{
      name: string;
      reason: string; // Phase 5.5.4 — Why it was close and why it lost
    }>;
  };
  
  // Phase 5.7.4 — VIEWMODEL UPDATE: Extend ScannerViewModel with primaryStrainName and alternateMatches
  primaryStrainName?: string; // Phase 5.7.4
  alternateMatches?: Array<{ // Phase 5.7.4
    name: string;
    confidence: number;
  }>;
  
  // Phase 5.9.5 — VIEWMODEL UPDATE: Extend ScannerViewModel with strainName, matchType, matchConfidence, alternateMatches
  strainName?: string; // Phase 5.9.5
  matchType?: "Exact" | "Likely" | "Approximate"; // Phase 5.9.5
  matchConfidence?: number; // Phase 5.9.5
  alternateMatchNames?: string[]; // Phase 5.9.5 — Array of alternate match names (string[]) - renamed to avoid conflict
  
  // Phase 8.3.5 — VIEWMODEL LOCK: Extend ScannerViewModel with strainName, nameConfidence, alternateMatches
  nameConfidence?: number; // Phase 8.3.5 — Name confidence (separate from matchConfidence for clarity)
  
  // Phase 8.5.5 — VIEWMODEL UPDATE: Extend ScannerViewModel with primaryMatch and alternateMatches
  primaryMatch?: {
    name: string;
    confidence: number;
  };
  alternateMatches?: Array<{
    name: string;
    confidence: number;
  }>;
  
  // Phase 8.1.4 — VIEWMODEL EXTENSION: Extend ScannerViewModel with identity
  identity?: {
    name: string;
    confidence: number;
    alternates: string[];
  };
  
  // Phase 5.6.4 — VIEWMODEL EXTENSION: Extend ScannerViewModel with classification
  classification?: {
    indicaPercent: number;
    sativaPercent: number;
    type: "Indica" | "Sativa" | "Hybrid";
  };
  
  // Phase 5.8.4 — VIEWMODEL ADDITION: Extend ScannerViewModel with ratio (indica, sativa, hybrid)
  ratio?: {
    indica: number;
    sativa: number;
    hybrid: number;
    ratioLabel: "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid";
  };
  
  // Phase 6.0.4 — VIEWMODEL EXTENSION: Extend ScannerViewModel with dominance
  // Phase 8.0.4 — Enhanced with confidence
  // Phase 8.2.4 — Enhanced with type field
  // Phase 8.6.5 — Enhanced with hybrid field and numeric confidence
  dominance?: {
    indica: number;
    sativa: number;
    hybrid: number; // Phase 8.6.5 — Hybrid percentage
    classification: "Indica-dominant" | "Sativa-dominant" | "Hybrid"; // Classification field
    label: string; // "Indica-dominant" | "Sativa-dominant" | "Balanced Hybrid"
    type?: "Indica" | "Sativa" | "Hybrid"; // Phase 8.2.4 — Type field
    confidence?: "Low" | "Medium" | "High" | "Very High" | number; // Phase 8.0.4 — Confidence tier, Phase 8.6.5 — Numeric confidence
  };
  
  // Phase 7.0.4 — VIEWMODEL EXTENSION: Extend ScannerViewModel with chemistry
  chemistry?: {
    primaryTerpenes: string[];
    secondaryTerpenes: string[];
    thcRange: string;
    cbdPresence: string;
  };
    // Phase 5.1 — Terpene-Weighted Experience Engine (FREE TIER)
    terpeneExperience?: {
      dominantTerpenes: string[]; // Top 3 primary terpenes
      secondaryTerpenes: string[]; // Next 2 secondary terpenes
      experience: {
        bodyRelaxation: number; // 0-100
        mentalStimulation: number; // 0-100
        moodElevation: number; // 0-100
        sedation: number; // 0-100
        focusClarity: number; // 0-100
        appetiteStimulation: number; // 0-100
      };
      visualBoosts?: Array<{ name: string; boost: number; reasoning: string }>;
      consensusNotes?: string[];
    };
    // Phase 7.2 — TERPENE & CANNABINOID PROFILE ENGINE
    terpeneCannabinoidProfile?: {
      terpenes: Array<{
        name: string;
        likelihood: "High" | "Medium–High" | "Medium" | "Low–Medium" | "Low";
        confidence: number;
        reasoning: string[];
      }>;
      cannabinoids: Array<{
        compound: string;
        range: string;
        min: number;
        max: number;
        isFlagged?: boolean;
      }>;
      confidence: "very_high" | "high" | "medium" | "low";
      confidenceLabel: string;
      disclaimer: string;
      explanation: string[];
      source: string;
    };
    // Phase 7.4 — TERPENE PROFILE CONSENSUS ENGINE
    terpeneProfileConsensus?: {
      dominantTerpenes: Array<{
        name: string;
        likelihood: "High" | "Medium" | "Medium-Low" | "Low" | "Possible";
        confidence: number;
        interpretation: string;
        reasoning: string[];
        isTrace?: boolean;
      }>;
      traceTerpenes?: Array<{
        name: string;
        likelihood: "High" | "Medium" | "Medium-Low" | "Low" | "Possible";
        confidence: number;
        interpretation: string;
        reasoning: string[];
        isTrace?: boolean;
      }>;
      confidence: "very_high" | "high" | "medium" | "low";
      confidenceLabel: string;
      explanation: string[];
      source: string;
    };
    // Phase 7.6 — EFFECT PROFILE & USE-CASE ENGINE
    effectProfileUseCase?: {
      primaryEffects: Array<{
        name: string;
        category: "primary" | "secondary";
        intensity: "high" | "medium" | "low";
        reasoning: string[];
      }>;
      secondaryEffects: Array<{
        name: string;
        category: "primary" | "secondary";
        intensity: "high" | "medium" | "low";
        reasoning: string[];
      }>;
      useCases: Array<{
        title: string;
        description: string;
        reasoning: string[];
      }>;
      varianceDisclosure: string[];
      explanation: string[];
      confidence: "very_high" | "high" | "medium" | "low";
      confidenceLabel: string;
      source: string;
    };
    // Phase 7.8 — EFFECTS & EXPERIENCE PREDICTION ENGINE
    effectExperiencePrediction?: {
      primaryEffects: Array<{
        name: string;
        category: "primary" | "secondary";
        intensity: "high" | "medium" | "low";
        reasoning: string[];
      }>;
      secondaryEffects: Array<{
        name: string;
        category: "primary" | "secondary";
        intensity: "high" | "medium" | "low";
        reasoning: string[];
      }>;
      timingCurve: {
        onsetSpeed: "Fast" | "Moderate" | "Slow";
        peakWindow: string;
        durationRange: string;
        reasoning: string[];
      };
      experienceSummary: string;
      varianceNotes: string[];
      confidence: "very_high" | "high" | "medium" | "low";
      confidenceLabel: string;
      explanation: string[];
      source: string;
    };
    // Phase 4.7 Step 4.7.2 — Closely Related Variants (if ambiguous)
    closelyRelatedVariants?: Array<{
      name: string;
      canonicalName: string;
      whyNotPrimary: string;
    }>; // 2–3 variants if ambiguous (collapsed)
    isAmbiguous?: boolean; // If multiple variants could be correct
  };
  
  // Phase 3.8 Part D — Why This Name (Enhanced)
  nameReasoning?: {
    bullets: string[]; // Visual traits, strain markers, cross-image agreement, cultivar behaviors
  };
  
  // Phase 3.8 Part B — Name Resolution
  nameResolution?: {
    matchType: "clear_winner" | "close_alternatives" | "family_level";
    closestAlternate?: {
      name: string;
      confidence: number;
      whyNotPrimary: string;
    };
    strainFamily?: string;
  };
  
  // Phase 3.9 Part G — Related Strains
  relatedStrains?: Array<{
    name: string;
    relationship: string;
    reason: string;
  }>;
  
  // Phase 4.2 — Extensive Wiki-Style Report
  wikiReport?: import("./wikiReport").WikiReportSections;
  
  // Phase 3.9 Part A — Origin Story
  originStory?: string;
  
  // Phase 3.9 Part B — Family Tree
  familyTree?: string;
  
  // Phase 3.9 Part D — Entourage Effect Explanation
  entourageExplanation?: string;
}
