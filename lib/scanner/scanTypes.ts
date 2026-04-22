/**
 * Shared types for the vision scan pipeline (GPT output shape + legacy normalization).
 */

/** Row shape from `strains.json` used when building the prompt catalog. */
export interface StrainEntry {
  name: string;
  type?: string;
  visualProfile?: {
    trichomeDensity?: string;
    pistilColor?: string[];
    budStructure?: string;
    leafShape?: string;
    colorProfile?: string;
  };
  terpeneProfile?: string[];
  effects?: string[];
  indicaSativaRatio?: { indica?: number; sativa?: number };
}

export interface ImageSignals {
  usableVisualSignal: boolean;
  blurOrDarkness?: string;
  textDetected?: boolean;
  strongOcrAgreementWithVisualTopPick?: boolean;
  wholePlantDetected?: boolean;
  flowerDetected?: boolean;
  leafDetailDetected?: boolean;
  packagedProductDetected?: boolean;
}

export interface ScoredLabel {
  label: string;
  rawScore: number;
  reasons: string[];
}

export interface PlantAnalysis {
  multiImageReinforcement?: boolean;
  typeEstimate?: ScoredLabel | null;
  growthStage?: ScoredLabel | null;
  health?: (ScoredLabel & { issues?: string[] }) | null;
  deficiencyAnalysis?: unknown;
  harvestTiming?: unknown;
  sexEstimate?: unknown;
  stressAnalysis?: unknown;
}

export interface GrowCoach {
  headline?: string;
  rawScore?: number;
  priorityActions?: string[];
  suggestions?: string[];
  watchFor?: string[];
  cautions?: string[];
  logSupport?: {
    suggestedEntryTitle?: string;
    suggestedSummary?: string;
    suggestedFields?: Record<string, unknown>;
    followUpSuggestion?: string;
    tags?: string[];
  };
}

export interface RankedMatch {
  strainName?: string;
  scoreBuckets?: {
    visualFlower?: number;
    structure?: number;
    ocr?: number;
    secondary?: number;
  };
  reasons?: string[];
  appearsInMultipleImagesConsistent?: boolean;
}

export interface Identity {
  strainName?: string;
  confidence?: number;
  alternateMatches?: Array<{
    strainName?: string;
    confidence?: number;
  }>;
}

/** Single terpene line item (normalized chemistry + normalizer defaults). */
export interface TerpeneEstimate {
  name: string;
  confidence: number;
}

export interface ChemistryNormalized {
  terpenes: TerpeneEstimate[];
  cannabinoids: Record<string, unknown>;
  cannabinoidRange: string;
  likelyTerpenes: TerpeneEstimate[];
}

export interface ScanAnalysisRaw {
  imageSignals?: ImageSignals;
  plantAnalysis?: PlantAnalysis;
  growCoach?: GrowCoach;
  rankedMatches?: RankedMatch[];
  identity?: Record<string, unknown>;
  genetics?: Record<string, unknown>;
  morphology?: Record<string, unknown>;
  chemistry?: Record<string, unknown>;
  experience?: Record<string, unknown>;
  cultivation?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
}

export interface ScanAnalysisNormalized {
  identity: {
    strainName: string;
    confidence: number;
    alternateMatches: Array<{ strainName?: string; confidence?: number }>;
  };
  genetics: {
    dominance: "Indica" | "Sativa" | "Hybrid";
    lineage: string[];
    breederNotes: string;
    confidenceNotes: string | null;
  };
  morphology: {
    budStructure: string;
    coloration: string;
    trichomes: string;
    visualTraits: string[];
    growthIndicators: string[];
  };
  chemistry: ChemistryNormalized;
  experience: {
    effects: string[];
    primaryEffects: string[];
    secondaryEffects: string[];
    onset: string;
    duration: string;
    bestUse: string[];
  };
  cultivation: {
    difficulty: string;
    floweringTime: string;
    yield: string;
    notes: string;
  };
  reasoning: {
    whyThisMatch: string;
    conflictingSignals: string[] | null;
    databaseMatch: boolean;
  };
  disclaimer: string;
}
