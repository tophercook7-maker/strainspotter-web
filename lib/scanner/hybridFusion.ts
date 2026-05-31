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
  gpt: 0.25,
  embedding: 0.6,
  metadata: 0.15,
};

/** Below this (0–1 embedding channel), GPT is damped so it cannot fake high confidence alone. */
const EMBEDDING_WEAK = 0.32;
const EMBEDDING_VERY_WEAK = 0.2;

/** When sum of per-source peaks is low, shrink fused score toward modest values. */
const ALL_WEAK_SIGNAL_CUTOFF = 0.52;

/** Bonuses are added to the 0–100 weighted score; kept small and capped. */
const MAX_EMBEDDING_PAIR_BONUS = 5;

/** When only GPT + metadata agree (metadata is derived from GPT), do not amplify the echo. */
const GPT_METADATA_ONLY_BONUS = 0;

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

    let gptEffective = gptScore;
    if (embeddingScore < EMBEDDING_WEAK) {
      const span = EMBEDDING_WEAK - EMBEDDING_VERY_WEAK;
      const t =
        embeddingScore <= EMBEDDING_VERY_WEAK
          ? 0
          : Math.min(1, (embeddingScore - EMBEDDING_VERY_WEAK) / span);
      const dampen = 0.52 + 0.4 * t;
      gptEffective = gptScore * dampen;
    }

    let weighted =
      gptEffective * weights.gpt +
      embeddingScore * weights.embedding +
      metadataScore * weights.metadata;

    const signalSum = embeddingScore + gptScore + metadataScore;
    if (signalSum < ALL_WEAK_SIGNAL_CUTOFF) {
      const factor = 0.68 + 0.32 * (signalSum / ALL_WEAK_SIGNAL_CUTOFF);
      weighted *= factor;
    }

    if (embeddingScore < 0.28 && gptScore > 0.55) {
      weighted *= 0.88;
    }

    let base100 = weighted * 100;

    let agreementBonus = 0;
    if (embeddingScore > 0) {
      if (gptScore > 0) agreementBonus += 2.5;
      if (metadataScore > 0) agreementBonus += 2;
      agreementBonus = Math.min(MAX_EMBEDDING_PAIR_BONUS, agreementBonus);
    } else if (gptScore > 0 && metadataScore > 0) {
      agreementBonus = GPT_METADATA_ONLY_BONUS;
    }

    if (embeddingScore < 0.3) {
      agreementBonus *= 0.45;
    }

    const raw = base100 + agreementBonus;

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
