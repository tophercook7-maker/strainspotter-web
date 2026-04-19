/**
 * Weighted hybrid fusion: CLIP embedding neighbors + GPT bucket scores + metadata catalog hints.
 * Strains are keyed by catalog slug so "Blue Dream" and "blue-dream" merge.
 */

import type { RetrievalCandidate } from "@/lib/scanner/retrievalTypes";
import { resolveStrainSlug } from "@/lib/scanner/rankedScanPipeline";
import { displayStrainNameForSlug } from "@/lib/scanner/strainSlug";
import type { FusedCandidate } from "@/lib/scanner/scanFusion";

export interface HybridFusionWeights {
  gpt: number;
  embedding: number;
  metadata: number;
}

/** Weights sum to 1 — GPT explains, CLIP grounds, metadata nudges catalog fit. */
export const DEFAULT_HYBRID_WEIGHTS: HybridFusionWeights = {
  gpt: 0.45,
  embedding: 0.35,
  metadata: 0.2,
};

type SourceKey = "gpt" | "embedding" | "metadata" | "ocr";

function normalizeWeights(w: HybridFusionWeights): HybridFusionWeights {
  const sum = w.gpt + w.embedding + w.metadata;
  if (sum <= 0) return DEFAULT_HYBRID_WEIGHTS;
  return {
    gpt: w.gpt / sum,
    embedding: w.embedding / sum,
    metadata: w.metadata / sum,
  };
}

/**
 * Merge retrieval rows by strain slug, take best score per source, then weighted sum (0–100).
 * OCR-backed rows count toward the GPT channel for weighting.
 */
export function fuseHybridScanCandidates(
  candidates: RetrievalCandidate[],
  weights: HybridFusionWeights = DEFAULT_HYBRID_WEIGHTS
): FusedCandidate[] {
  const w = normalizeWeights(weights);

  const buckets = new Map<
    string,
    {
      slug: string;
      bestHint: string;
      best: Partial<Record<SourceKey, number>>;
      reasons: Set<string>;
    }
  >();

  for (const c of candidates) {
    const rawName = typeof c.strainName === "string" ? c.strainName.trim() : "";
    if (!rawName) continue;

    const slug = resolveStrainSlug(rawName);
    const src = c.source as SourceKey;
    const channel: SourceKey =
      src === "ocr" ? "gpt" : src === "gpt" || src === "embedding" || src === "metadata" ? src : "gpt";

    if (!buckets.has(slug)) {
      buckets.set(slug, {
        slug,
        bestHint: rawName,
        best: {},
        reasons: new Set(),
      });
    }
    const b = buckets.get(slug)!;
    if (rawName.length > b.bestHint.length) b.bestHint = rawName;

    const score = Math.max(0, Math.min(1, Number(c.score) || 0));
    const prev = b.best[channel];
    if (prev === undefined || score > prev) b.best[channel] = score;

    for (const r of c.reasons ?? []) {
      if (typeof r === "string" && r.trim()) b.reasons.add(r.trim());
    }
  }

  const fused: FusedCandidate[] = [];

  for (const b of buckets.values()) {
    const g = b.best.gpt ?? 0;
    const e = b.best.embedding ?? 0;
    const m = b.best.metadata ?? 0;

    const combined01 =
      w.gpt * g + w.embedding * e + w.metadata * m;

    const sourcesPresent = [g > 0, e > 0, m > 0].filter(Boolean).length;
    const agreementBonus = Math.min(12, Math.max(0, (sourcesPresent - 1) * 6));

    let score = Math.round(Math.min(100, combined01 * 100 + agreementBonus));
    score = Math.max(0, Math.min(100, score));

    const strainName = displayStrainNameForSlug(b.slug, b.bestHint);

    const sources: FusedCandidate["sources"] = [];
    if (g > 0) sources.push("gpt");
    if (e > 0) sources.push("embedding");
    if (m > 0) sources.push("metadata");

    fused.push({
      strainName,
      score,
      sources,
      reasons: Array.from(b.reasons),
    });
  }

  fused.sort((a, b) => b.score - a.score);
  return fused;
}
