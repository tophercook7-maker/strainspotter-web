import type { WikiResult } from "./types";

export type InsightResult = {
  summary: string;
  geneticsNarrative: string;
  experienceNarrative: string;
  confidenceExplanation: string;
};

export function buildInsights(
  wiki: WikiResult,
  confidence: number
): InsightResult {
  const name = wiki.identity.strainName ?? "Unknown cultivar";
  const dominance = wiki.genetics?.dominance ?? "Unknown";
  const parents = wiki.genetics?.lineage?.join(" × ") ?? "Unknown lineage";

  const aromas =
    wiki.chemistry?.terpenes
      ?.slice(0, 3)
      .map((t) => t.name)
      .join(", ") ?? "no dominant aromas identified";

  const effects =
    wiki.experience?.effects?.slice(0, 3).join(", ") ??
    "no dominant effects identified";

  const bestFor =
    wiki.experience?.bestUse?.slice(0, 2).join(", ") ??
    "general use";

  return {
    summary: `${name} is commonly described as a ${dominance.toLowerCase()}-leaning cultivar, often associated with ${effects}.`,

    geneticsNarrative: `Genetically, this cultivar is categorized as ${dominance}. Its reported lineage traces back to ${parents}. As with many cannabis cultivars, exact genetics may vary by phenotype and grower.`,

    experienceNarrative: `Users often report aromas described as ${aromas}. The experience is generally characterized by ${effects}, which influences how and when it is preferred.`,

    confidenceExplanation: `This analysis was generated with an estimated confidence of ${confidence}%. Confidence reflects visual similarity, dataset coverage, and known ambiguity in cannabis identification.`,
  };
}
