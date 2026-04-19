/**
 * Legacy normalization for GPT scan JSON — safe defaults for older `result` consumers.
 */

import type {
  ScanAnalysisNormalized,
  TerpeneEstimate,
} from "@/lib/scanner/scanTypes";

const DEFAULT_TERPENE = { name: "Myrcene", confidence: 0.5 };
const DOMINANCE_OPTIONS = ["Indica", "Sativa", "Hybrid"] as const;

function safeString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

function safeStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) ? (value as string[]) : fallback;
}

/** Clamp identity-style confidence to [min, max], with optional default when NaN. */
function boundedConfidence(
  value: unknown,
  min: number,
  max: number,
  defaultValue: number
): number {
  const n = Number(value);
  const base = Number.isFinite(n) ? n : defaultValue;
  return Math.max(min, Math.min(max, base));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Ensure the AI response has all required fields with safe defaults (legacy `result` blob).
 */
export function normalizeScanAnalysis(
  raw: Record<string, unknown>
): ScanAnalysisNormalized {
  const identity = asRecord(raw.identity);
  const genetics = asRecord(raw.genetics);
  const morphology = asRecord(raw.morphology);
  const chemistry = asRecord(raw.chemistry);
  const experience = asRecord(raw.experience);
  const cultivation = asRecord(raw.cultivation);
  const reasoning = asRecord(raw.reasoning);

  const terpenesRaw = chemistry.terpenes;
  const terpenes: TerpeneEstimate[] = Array.isArray(terpenesRaw)
    ? (terpenesRaw as TerpeneEstimate[])
    : [DEFAULT_TERPENE];

  const dominanceStr = genetics.dominance as string | undefined;
  const dominance = DOMINANCE_OPTIONS.includes(
    dominanceStr as (typeof DOMINANCE_OPTIONS)[number]
  )
    ? dominanceStr!
    : "Hybrid";

  return {
    identity: {
      strainName: safeString(identity.strainName, "Unknown Cultivar"),
      confidence: boundedConfidence(identity.confidence, 35, 95, 60),
      alternateMatches: Array.isArray(identity.alternateMatches)
        ? identity.alternateMatches
        : [],
    },
    genetics: {
      dominance,
      lineage: Array.isArray(genetics.lineage) ? (genetics.lineage as string[]) : [],
      breederNotes: safeString(
        genetics.breederNotes,
        "Lineage analysis based on visual traits"
      ),
      confidenceNotes: (genetics.confidenceNotes as string | null | undefined) || null,
    },
    morphology: {
      budStructure: safeString(morphology.budStructure, "Analysis pending"),
      coloration: safeString(morphology.coloration, "Standard green coloration"),
      trichomes: safeString(morphology.trichomes, "Trichome assessment pending"),
      visualTraits: safeStringArray(morphology.visualTraits, []),
      growthIndicators: safeStringArray(morphology.growthIndicators, []),
    },
    chemistry: {
      terpenes,
      cannabinoids: (chemistry.cannabinoids as Record<string, string>) || {
        THC: "15-25%",
        CBD: "<1%",
      },
      cannabinoidRange: safeString(
        chemistry.cannabinoidRange,
        "15-25% THC, <1% CBD"
      ),
      likelyTerpenes: Array.isArray(terpenesRaw)
        ? (terpenesRaw as TerpeneEstimate[]).slice(0, 3)
        : [DEFAULT_TERPENE],
    },
    experience: {
      effects: safeStringArray(experience.effects, ["Relaxed"]),
      primaryEffects: safeStringArray(experience.primaryEffects, []),
      secondaryEffects: safeStringArray(experience.secondaryEffects, []),
      onset: safeString(experience.onset, "Moderate"),
      duration: safeString(experience.duration, "2-4 hours"),
      bestUse: safeStringArray(experience.bestUse, []),
    },
    cultivation: {
      difficulty: safeString(cultivation.difficulty, "Moderate"),
      floweringTime: safeString(cultivation.floweringTime, "8-10 weeks"),
      yield: safeString(cultivation.yield, "Medium"),
      notes: safeString(cultivation.notes, "Standard cultivation requirements"),
    },
    reasoning: {
      whyThisMatch: safeString(
        reasoning.whyThisMatch,
        "Visual analysis of uploaded images"
      ),
      conflictingSignals: Array.isArray(reasoning.conflictingSignals)
        ? reasoning.conflictingSignals
        : null,
      databaseMatch:
        typeof reasoning.databaseMatch === "boolean"
          ? reasoning.databaseMatch
          : false,
    },
    disclaimer:
      "AI-assisted visual analysis powered by StrainSpotter's 314-strain database. Not a substitute for laboratory testing.",
  };
}
