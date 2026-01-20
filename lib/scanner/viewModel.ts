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
  nameFirstDisplay?: {
    primaryStrainName: string;
    confidencePercent: number;
    confidenceTier: "very_high" | "high" | "medium" | "low";
    tagline: string; // "Closest known match based on visual + database consensus"
    alternateMatches?: Array<{
      name: string;
      whyNotPrimary: string;
    }>; // "Often confused with: X, Y" (Phase 4.5 Step 4.5.2 — Collapsed if confidence < 92%)
    // Phase 4.5 Step 4.5.3 — Explanation for "Why this strain?" section (FREE TIER)
    explanation?: {
      whyThisNameWon: string[]; // 3-5 bullets: Visual markers, database frequency, lineage, terpenes
      whatRuledOutOthers: string[]; // Why other candidates didn't win
      varianceNotes: string[]; // Phenotype variance explanation
    };
    // Phase 4.6 Step 4.6.2 — Indica/Sativa/Hybrid Ratio (FREE TIER)
    ratio?: {
      indicaPercent: number; // 0-100
      sativaPercent: number; // 0-100
      dominance: "Indica" | "Sativa" | "Hybrid" | "Balanced";
      displayText: string; // "Indica 70% · Sativa 30%" or "Balanced Hybrid (50 / 50)"
      explanation: {
        summary: string; // Short summary for collapsed header
        fullExplanation: string[]; // Bullets for expanded section
      };
    };
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
