// lib/scanner/viewModel.ts
// 🔒 A.2 — LOCK ScannerViewModel
// Single source of truth for UI-facing scan data

// Phase 2.9 Part P Step 1 — Extended Strain Profile type
import type { ExtendedStrainProfile } from "./extendedProfile";
// Phase 4.3.1 — Name Confidence Stabilization
import type { NameFirstDisplay } from "./types";

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
  // Phase 4.3.1 — Extended with NameFirstDisplay interface
  // Phase 4.1 — ViewModel guarantee: nameFirstDisplay is always present
  nameFirstDisplay: NameFirstDisplay & {
    primaryStrainName: string; // Phase 4.1 — Guaranteed field
    primaryName: string; // Phase 5.1.5 — Alias for primaryStrainName
    confidencePercent: number;
    confidence: number; // Phase 4.1 — Guaranteed field (alias for confidencePercent)
    confidenceTier: "very_high" | "high" | "medium" | "low";
    tagline: string; // "Closest known match based on visual + database consensus"
    explanation: {
      whyThisNameWon: string[]; // Phase 4.1 — Guaranteed field (at least one reason)
      whatRuledOutOthers?: string[]; // Why other candidates didn't win
      varianceNotes?: string[]; // Phenotype variance explanation
    };
    alsoKnownAs?: string[]; // Phase 5.5.5 — Aliases (e.g., "GSC", "Girl Scout Cookies")
    alternateMatches?: Array<{
      name: string;
      confidence?: number; // Phase 5.1.5
      whyNotPrimary: string;
    }>; // "Often confused with: X, Y" (Phase 4.5 Step 4.5.2 — Collapsed if confidence < 92%)
    ratio?: {
      indica: number;
      sativa: number;
      hybrid: number;
      classification?: string;
    };
    signals?: Array<{
      name: string;
      confidence: number;
      source: "visual" | "database" | "consensus";
    }>; // Phase 4.3.4 — Name confidence fusion breakdown
    terpeneExperience?: any;
  };
  
  // Phase 4.6 Step 4.6.2 — Indica/Sativa/Hybrid Ratio (FREE TIER)
  // Phase 5.0 Step 5.0.4 — Enhanced with range display
  // Phase 5.2.5 — VIEWMODEL INTEGRATION: Extend ScannerViewModel with strainType
  // Phase 4.5.0 — Extended with simplified ratio structure
  // Phase 4.8.0 — Extended with V48 engine fields
  // Phase 4.2 — Plant ratio resolver ensures indica, sativa, hybrid fields are populated
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
    } | string[]; // Phase 4.8.0 — Can be object (legacy) or string array (V48 engine)
    // Phase 4.5.0 — Simplified ratio structure
    // Phase 4.2 — Plant ratio resolver populates these fields (weighted scoring: genetics 55pts, visual 15pts, terpenes 10pts)
    indica?: number; // Phase 4.2 — Normalized percentage (0-100)
    sativa?: number; // Phase 4.2 — Normalized percentage (0-100)
    hybrid?: number; // Phase 4.2 — Normalized percentage (0-100)
    label?: string;
    confidence?: number;
    // Phase 4.8.0 — V48 engine fields
    classification?: string;
  };
  
  // Phase 4.3.2 — Ratio Stabilization (stabilized across multiple images)
  stabilizedRatio?: {
    indica: number;
    sativa: number;
    hybrid: number;
    confidence: number;
    explanation: string[];
  };
  
  // Phase 4.3.5 — Indica/Sativa/Hybrid Ratio Normalization
  dominance?: {
    indica: number;
    sativa: number;
    hybrid: number;
    classification: "Indica-dominant" | "Sativa-dominant" | "Hybrid";
  };
  
  // Phase 4.3.6 — Confidence Explanation Layer
  confidenceExplanation?: {
    score: number;
    tier: "Very High" | "High" | "Medium" | "Low";
    explanation: string[];
  };
  
  // Phase 4.4.0 — Name-First Matching Engine
  nameFirst?: {
    primaryName: string;
    confidence: number;
    alternateNames: string[];
    reasoning: string[];
  };
  
  // Phase 4.6.0 — Match Strength Meter
  matchStrength?: {
    score: number;
    tier: string;
    explanation: string[];
  };
  
  // Phase 4.7.0 — Name-First Disambiguation
  nameDisambiguation?: {
    primary: {
      name: string;
      confidence: number;
      whyChosen: string[];
    };
    alternatives: {
      name: string;
      confidence: number;
      whyNotChosen: string[];
    }[];
  };
  
  // Phase 4.3.3 — Visual Trait Anchoring (stable traits across multiple images)
  visualAnchors?: Array<{
    trait: string;
    strength: number;
    sourceImages: number;
  }>;
  
  // Phase 4.3.4 — Name Confidence Fusion (breakdown of name signals)
  nameFusionBreakdown?: Array<{
    name: string;
    confidence: number;
    source: "visual" | "database" | "consensus";
  }>;
  
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
  
  // Phase 5.7.4 — VIEWMODEL UPDATE: alternateMatches is in nameFirstDisplay, removed duplicate
  
  // Phase 5.9.5 — VIEWMODEL UPDATE: Extend ScannerViewModel with strainName, matchType, matchConfidence, alternateMatches
  strainName?: string; // Phase 5.9.5
  matchType?: "Exact" | "Likely" | "Approximate"; // Phase 5.9.5
  matchConfidence?: number; // Phase 5.9.5
  alternateMatchNames?: string[]; // Phase 5.9.5 — Array of alternate match names (string[]) - renamed to avoid conflict
  
  // Phase 8.3.5 — VIEWMODEL LOCK: Extend ScannerViewModel with strainName, nameConfidence, alternateMatches
  // Phase 4.9.0 — Name-First Match Confidence Engine
  nameConfidence?: {
    primaryName: string;
    confidence: number;
    alternateNames: string[];
    explanation: string[];
  };
  
  // Phase 8.5.5 — primaryMatch is already defined above (line 31), removed duplicate
  
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
  
  // Phase 5.8.4 — Ratio data belongs in analysis layer, not ViewModel (architectural fix)
  // Removed duplicate ratio field - use result.analysis.dominance in FullScanResult
  
  // Additional fields for simplified view model access
  highlights?: string[];
  geneticsSummary?: string;
  terpeneSummary?: string;
  notes?: string[]; // Analysis notes (e.g., from consensus fallback scenarios)
  
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
  
  // Phase 4.0.1 — Soft-fail support
  softFail?: {
    reason: string;
    recommendation: string;
  };
}
