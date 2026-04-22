/** Client + server: scanner API payloads (ranked strains + unified plant analysis) */

export type RankedConfidenceTier = "high" | "moderate" | "low" | "very_low";

export interface RankedScanSummary {
  confidenceTier: RankedConfidenceTier;
  multiPhotoUsed: boolean;
  textDetected: boolean;
  disclaimer: string;
  /** When max confidence &lt; 35 but we still show 3 plausible picks */
  setLabel?: "Low-confidence visual suggestions";
}

/** Extended summary for unified scan (image content flags). */
export interface UnifiedScanSummary extends RankedScanSummary {
  wholePlantDetected?: boolean;
  flowerDetected?: boolean;
  leafDetailDetected?: boolean;
  packagedProductDetected?: boolean;
}

export interface RankedMatchRow {
  rank: 1 | 2 | 3;
  slug: string;
  name: string;
  confidence: number;
  confidenceLabel: string;
  cardLabel: "Best overall match" | "Close alternative" | "Another possible match";
  reasons: string[];
}

export interface PlantInsightBlock {
  label: string;
  confidence: number;
  confidenceLabel: string;
  reasons: string[];
}

export interface PlantHealthInsight extends PlantInsightBlock {
  issues?: string[];
}

/** Single possible deficiency / nutrient pattern (never stated as certain). */
export interface DeficiencyLikelyIssue {
  name: string;
  confidence: number;
  reasons: string[];
}

export interface PlantDeficiencyInsight {
  label: string;
  confidence: number;
  confidenceLabel: string;
  likelyIssues: DeficiencyLikelyIssue[];
}

export interface HarvestTimingInsight {
  label: string;
  confidence: number;
  confidenceLabel: string;
  /** e.g. "1 to 2 weeks remaining" — always hedged */
  estimate?: string;
  reasons: string[];
}

export interface SexEstimateInsight {
  label: string;
  confidence: number;
  confidenceLabel: string;
  reasons: string[];
}

export interface StressPatternInsight {
  type: string;
  confidence: number;
  reasons: string[];
}

export interface PlantStressInsight {
  label: string;
  confidence: number;
  confidenceLabel: string;
  patterns: StressPatternInsight[];
}

export interface PlantAnalysisPayload {
  typeEstimate: PlantInsightBlock | null;
  growthStage: PlantInsightBlock | null;
  health: PlantHealthInsight | null;
  deficiencyAnalysis?: PlantDeficiencyInsight | null;
  harvestTiming?: HarvestTimingInsight | null;
  sexEstimate?: SexEstimateInsight | null;
  stressAnalysis?: PlantStressInsight | null;
}

/** Structured fields for Grow Log prefill — all estimates, not diagnosis. */
export interface GrowCoachLogSuggestedFields {
  growthStage: string;
  healthStatus: string;
  possibleIssues: string[];
  recommendedActions: string[];
  watchFor: string[];
}

/** Log-ready content derived from Grow Coach + plant analysis. */
export interface GrowCoachLogSupport {
  suggestedEntryTitle: string;
  suggestedSummary: string;
  suggestedFields: GrowCoachLogSuggestedFields;
  followUpSuggestion: string;
  /** Optional short labels for filtering / search */
  tags?: string[];
}

/** Practical next steps derived from scan — max confidence capped in pipeline (88). */
export interface GrowCoachPayload {
  headline: string;
  confidence: number;
  confidenceLabel: string;
  priorityActions: string[];
  suggestions: string[];
  watchFor: string[];
  cautions: string[];
  /** When evidence is too weak for detailed coaching */
  limited?: boolean;
  /** Prefill for Grow Log entries */
  logSupport?: GrowCoachLogSupport;
  /** Human-readable re-scan window, e.g. "3 to 5 days" */
  recommendedFollowUpWindow?: string;
  /** When prior scan snapshot is available (client may inject) */
  progressionNote?: string;
}

export interface RankedScanPayload {
  status: "ok" | "poor_image";
  resultType: "ranked_matches";
  summary: RankedScanSummary;
  matches: RankedMatchRow[];
  improveTips: string[];
  poorImageMessage?: string;
}

export interface UnifiedScanPayload extends Omit<RankedScanPayload, "resultType" | "summary"> {
  resultType: "unified_scan_analysis";
  summary: UnifiedScanSummary;
  plantAnalysis: PlantAnalysisPayload;
  growCoach: GrowCoachPayload;
}

export const RANKED_DISCLAIMER =
  "Visual identification is an estimate, not a guaranteed confirmation.";

export const RESULT_SUBTEXT =
  "StrainSpotter compares visible traits and detected clues to suggest the closest matches. Visual identification is an estimate, not a guaranteed lab-confirmed result.";

export const UNIFIED_PAGE_HEADER = "Scan Results";

export const UNIFIED_SUMMARY_SUBTEXT =
  "StrainSpotter analyzed visible traits, plant structure, and detected clues to generate the closest strain matches and plant insights. Results are visual estimates, not guaranteed confirmations.";

/** Parent heading for plant-side analysis blocks on Scan Results */
export const SECTION_PLANT_INSIGHTS_TITLE = "Plant Insights";
export const SECTION_PLANT_INSIGHTS_SUB =
  "Visual estimates of type, stage, and health from your photos — not a lab assessment.";

export const SECTION_STRAIN_TITLE = "Top 3 Likely Matches";
export const SECTION_STRAIN_SUB =
  "These are the closest strain matches based on visible flower traits, structure, and any detected clues.";

export const SECTION_PLANT_TYPE_TITLE = "Plant Type Estimate";
export const SECTION_PLANT_TYPE_SUB =
  "Whole-plant structure and leaf shape can suggest indica-leaning or sativa-leaning traits, but most modern plants are hybrids.";

export const SECTION_GROWTH_TITLE = "Growth Stage";
export const SECTION_GROWTH_SUB =
  "Estimated from visible plant maturity, bud development, pistils, and overall structure.";

export const SECTION_HEALTH_TITLE = "Plant Health";
export const SECTION_HEALTH_SUB =
  "Estimated from leaf color, posture, damage patterns, and overall vitality visible in the images.";

export const SECTION_GROW_COACH_TITLE = "Grow Coach";
export const SECTION_GROW_COACH_SUB =
  "Suggested next steps based on visible plant traits and scan confidence.";

export const TRUST_BLOCK_UNIFIED =
  "Cannabis appearance can change based on phenotype, lighting, growing conditions, curing, camera quality, and breeder variation. Different strains can look similar, and the same strain can look different across grows. Plant health and stage estimates are also visual best guesses, not lab or expert diagnosis.";
