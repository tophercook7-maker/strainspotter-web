// lib/scanner/hybridFusion.ts

import type { RetrievalCandidate, RetrievalSource } from "@/lib/scanner/retrievalTypes";
import { resolveStrainSlug } from "@/lib/scanner/strainSlug";

export interface FusedCandidate {
  strainName: string;
  score: number; // 0 to 100
  sources: RetrievalSource[];
  reasons: string[];
}

interface FusionWeights {
  gpt: number;
  embedding: number;
  metadata: number;
}

const DEFAULT_WEIGHTS: FusionWeights = {
  gpt: 0.45,
  embedding: 0.35,
  metadata: 0.2,
};

/** Extra boost when GPT agrees with embedding or metadata on the same slug (conservative cap). */
const MAX_PAIR_BONUS = 5;

export function fuseHybridScanCandidates(
  candidates: RetrievalCandidate[],
  weights: FusionWeights = DEFAULT_WEIGHTS
): FusedCandidate[] {
  const grouped = new Map<
    string,
    {
      strainName: string;
      bestBySource: Partial<Record<"gpt" | "embedding" | "metadata", number>>;
      sources: Set<RetrievalSource>;
      reasons: Set<string>;
    }
  >();

  for (const candidate of candidates) {
    const displayName =
      typeof candidate.strainName === "string" ? candidate.strainName.trim() : "";
    if (!displayName) continue;

    const slug = resolveStrainSlug(displayName) || displayName.toLowerCase();

    if (!grouped.has(slug)) {
      grouped.set(slug, {
        strainName: displayName,
        bestBySource: {},
        sources: new Set<RetrievalSource>(),
        reasons: new Set<string>(),
      });
    }

    const entry = grouped.get(slug)!;

    const normalizedSource: "gpt" | "embedding" | "metadata" =
      candidate.source === "ocr"
        ? "gpt"
        : candidate.source === "embedding"
          ? "embedding"
          : candidate.source === "metadata"
            ? "metadata"
            : "gpt";

    entry.sources.add(candidate.source);

    const numericScore = Math.max(0, Math.min(1, Number(candidate.score) || 0));
    const existing = entry.bestBySource[normalizedSource] ?? 0;
    entry.bestBySource[normalizedSource] = Math.max(existing, numericScore);

    for (const reason of candidate.reasons ?? []) {
      if (typeof reason === "string" && reason.trim()) {
        entry.reasons.add(reason.trim());
      }
    }
  }

  const fused: FusedCandidate[] = Array.from(grouped.values()).map((entry) => {
    const gptScore = entry.bestBySource.gpt ?? 0;
    const embeddingScore = entry.bestBySource.embedding ?? 0;
    const metadataScore = entry.bestBySource.metadata ?? 0;

    const weighted =
      gptScore * weights.gpt +
      embeddingScore * weights.embedding +
      metadataScore * weights.metadata;

    const agreementCount = [
      gptScore > 0,
      embeddingScore > 0,
      metadataScore > 0,
    ].filter(Boolean).length;

    const spreadBonus = Math.min(10, Math.max(0, (agreementCount - 1) * 3));

    const gptEmbPair = gptScore > 0 && embeddingScore > 0 ? 3 : 0;
    const gptMetaPair = gptScore > 0 && metadataScore > 0 ? 2 : 0;
    const pairBonus = Math.min(MAX_PAIR_BONUS, gptEmbPair + gptMetaPair);

    const raw = weighted * 100 + spreadBonus + pairBonus;

    return {
      strainName: entry.strainName,
      score: Math.max(0, Math.min(100, Math.round(raw))),
      sources: Array.from(entry.sources),
      reasons: Array.from(entry.reasons),
    };
  });

  fused.sort((a, b) => b.score - a.score);

  return fused;
}
