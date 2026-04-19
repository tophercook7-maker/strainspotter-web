/**
 * Shared types for the vision scan pipeline (GPT output shape + legacy normalization).
 * Extension-ready: raw AI JSON vs server-normalized legacy blob.
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

/** Top-level image quality / detection flags from the model (raw JSON). */
export interface ImageSignals {
  usableVisualSignal?: boolean;
  blurOrDarkness?: "low" | "medium" | "high";
  textDetected?: boolean;
  strongOcrAgreementWithVisualTopPick?: boolean;
  wholePlantDetected?: boolean;
  flowerDetected?: boolean;
  leafDetailDetected?: boolean;
  packagedProductDetected?: boolean;
}

/** Plant-side signals: growth stage, health, morphology hints (raw JSON — flexible). */
export interface PlantAnalysis {
  multiImageReinforcement?: boolean;
  typeEstimate?: {
    label?: string;
    rawScore?: number;
    reasons?: string[];
  };
  growthStage?: {
    label?: string;
    rawScore?: number;
    reasons?: string[];
  };
  health?: {
    label?: string;
    rawScore?: number;
    reasons?: string[];
    issues?: string[];
  };
  deficiencyAnalysis?: unknown;
  harvestTiming?: unknown;
  sexEstimate?: unknown;
  stressAnalysis?: unknown;
  [key: string]: unknown;
}

/** Grow coach block + optional log hints (raw JSON). */
export interface GrowCoach {
  headline?: string;
  rawScore?: number;
  priorityActions?: string[];
  suggestions?: string[];
  watchFor?: string[];
  cautions?: string[];
  logSupport?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MatchScoreBuckets {
  visualFlower: number;
  structure: number;
  ocr: number;
  secondary: number;
}

/** One ranked cultivar candidate from the model (0–3 in practice). */
export interface RankedMatch {
  strainName?: string;
  scoreBuckets?: Partial<MatchScoreBuckets>;
  reasons?: string[];
  appearsInMultipleImagesConsistent?: boolean;
}

export interface AlternateMatchEntry {
  strainName?: string;
  confidence?: number;
}

export interface Identity {
  strainName?: string;
  confidence?: number;
  alternateMatches?: AlternateMatchEntry[];
}

export interface GeneticsBlock {
  dominance?: string;
  lineage?: string[];
  breederNotes?: string;
  confidenceNotes?: string | null;
}

export interface MorphologyBlock {
  budStructure?: string;
  coloration?: string;
  trichomes?: string;
  visualTraits?: string[];
  growthIndicators?: string[];
}

export interface TerpeneEstimate {
  name?: string;
  confidence?: number;
}

export interface ChemistryBlock {
  terpenes?: TerpeneEstimate[];
  cannabinoids?: Record<string, string>;
  cannabinoidRange?: string;
  likelyTerpenes?: TerpeneEstimate[];
}

export interface ExperienceBlock {
  effects?: string[];
  primaryEffects?: string[];
  secondaryEffects?: string[];
  onset?: string;
  duration?: string;
  bestUse?: string[];
}

export interface CultivationBlock {
  difficulty?: string;
  floweringTime?: string;
  yield?: string;
  notes?: string;
}

export interface ReasoningBlock {
  whyThisMatch?: string;
  conflictingSignals?: unknown[] | null;
  databaseMatch?: boolean;
}

/**
 * Parsed GPT JSON object (loose — model may omit or extend keys).
 * Used by `buildUnifiedScanPayload` and normalization.
 */
export interface ScanAnalysisRaw {
  imageSignals?: ImageSignals;
  plantAnalysis?: PlantAnalysis;
  growCoach?: GrowCoach;
  rankedMatches?: RankedMatch[];
  identity?: Identity;
  genetics?: GeneticsBlock;
  morphology?: MorphologyBlock;
  chemistry?: ChemistryBlock;
  experience?: ExperienceBlock;
  cultivation?: CultivationBlock;
  reasoning?: ReasoningBlock;
  [key: string]: unknown;
}

/** Legacy-normalized chemistry (includes `likelyTerpenes` mirror). */
export interface ChemistryNormalized extends ChemistryBlock {
  terpenes: TerpeneEstimate[];
  cannabinoids: Record<string, string>;
  cannabinoidRange: string;
  likelyTerpenes: TerpeneEstimate[];
}

export interface IdentityNormalized {
  strainName: string;
  confidence: number;
  alternateMatches: unknown[];
}

export interface GeneticsNormalized {
  dominance: string;
  lineage: string[];
  breederNotes: string;
  confidenceNotes: string | null;
}

export interface MorphologyNormalized {
  budStructure: string;
  coloration: string;
  trichomes: string;
  visualTraits: string[];
  growthIndicators: string[];
}

export interface ExperienceNormalized {
  effects: string[];
  primaryEffects: string[];
  secondaryEffects: string[];
  onset: string;
  duration: string;
  bestUse: string[];
}

export interface CultivationNormalized {
  difficulty: string;
  floweringTime: string;
  yield: string;
  notes: string;
}

export interface ReasoningNormalized {
  whyThisMatch: string;
  conflictingSignals: unknown[] | null;
  databaseMatch: boolean;
}

/**
 * Output of `normalizeScanAnalysis` — safe defaults for legacy `result` consumers.
 */
export interface ScanAnalysisNormalized {
  identity: IdentityNormalized;
  genetics: GeneticsNormalized;
  morphology: MorphologyNormalized;
  chemistry: ChemistryNormalized;
  experience: ExperienceNormalized;
  cultivation: CultivationNormalized;
  reasoning: ReasoningNormalized;
  disclaimer: string;
}
