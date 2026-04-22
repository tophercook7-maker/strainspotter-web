/**
 * Legacy normalization for GPT scan JSON — safe defaults for older `result` consumers.
 */

import type { ScanAnalysisNormalized } from "@/lib/scanner/scanTypes";

function asRecord(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function boundedConfidence(value: unknown, min = 35, max = 95, fallback = 38): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

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

  const terpeneList = Array.isArray(chemistry.terpenes)
    ? chemistry.terpenes
    : [{ name: "Myrcene", confidence: 0.5 }];

  const experienceEffects = safeStringArray(experience.effects);

  return {
    identity: {
      strainName: safeString(identity.strainName, "Unknown Cultivar"),
      confidence: boundedConfidence(identity.confidence),
      alternateMatches: Array.isArray(identity.alternateMatches)
        ? (identity.alternateMatches as Array<{
            strainName?: string;
            confidence?: number;
          }>)
        : [],
    },
    genetics: {
      dominance:
        genetics.dominance === "Indica" ||
        genetics.dominance === "Sativa" ||
        genetics.dominance === "Hybrid"
          ? genetics.dominance
          : "Hybrid",
      lineage: safeStringArray(genetics.lineage),
      breederNotes: safeString(
        genetics.breederNotes,
        "Lineage analysis based on visual traits"
      ),
      confidenceNotes:
        typeof genetics.confidenceNotes === "string"
          ? genetics.confidenceNotes
          : null,
    },
    morphology: {
      budStructure: safeString(morphology.budStructure, "Analysis pending"),
      coloration: safeString(morphology.coloration, "Standard green coloration"),
      trichomes: safeString(morphology.trichomes, "Trichome assessment pending"),
      visualTraits: safeStringArray(morphology.visualTraits),
      growthIndicators: safeStringArray(morphology.growthIndicators),
    },
    chemistry: {
      terpenes: terpeneList as Array<{ name: string; confidence: number }>,
      cannabinoids:
        chemistry.cannabinoids && typeof chemistry.cannabinoids === "object"
          ? (chemistry.cannabinoids as Record<string, unknown>)
          : { THC: "15-25%", CBD: "<1%" },
      cannabinoidRange: safeString(
        chemistry.cannabinoidRange,
        "15-25% THC, <1% CBD"
      ),
      likelyTerpenes: terpeneList as Array<{ name: string; confidence: number }>,
    },
    experience: {
      effects: experienceEffects.length ? experienceEffects : ["Relaxed"],
      primaryEffects: safeStringArray(experience.primaryEffects),
      secondaryEffects: safeStringArray(experience.secondaryEffects),
      onset: safeString(experience.onset, "Moderate"),
      duration: safeString(experience.duration, "2-4 hours"),
      bestUse: safeStringArray(experience.bestUse),
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
        ? (reasoning.conflictingSignals as string[])
        : null,
      databaseMatch:
        typeof reasoning.databaseMatch === "boolean"
          ? reasoning.databaseMatch
          : false,
    },
    disclaimer:
      "AI-assisted visual analysis powered by StrainSpotter's cannabis database. Not a substitute for laboratory testing.",
  };
}
