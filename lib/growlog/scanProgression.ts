/**
 * Prior-scan resolution for progression + compare: prefers durable SavedUnifiedScan
 * (local registry), with chain.last as a scored peer so the immediate prior scan wins
 * even when not yet mirrored in the registry.
 */

import type { ClientScanSnapshot } from "@/lib/growlog/growLogStorage";
import { listSavedScansLocalSorted } from "@/lib/growlog/savedScanRegistry";
import type { PlantAnalysisPayload } from "@/lib/scanner/rankedScanTypes";
import type { UnifiedScanSummary } from "@/lib/scanner/rankedScanTypes";
import { savedScanResultsPath } from "@/lib/scanner/savedScanNav";
import type { SavedUnifiedScan } from "@/lib/scanner/savedScanTypes";

export type ProgressionPriorSource = "saved" | "chain";

/** Normalized prior context for compare strip + coach progression (both sources). */
export type PreviousScanComparisonContext = {
  source: ProgressionPriorSource;
  capturedAt: string;
  plantAnalysis: PlantAnalysisPayload;
  priorTopStrain?: string;
  /** When the prior scan can be reopened in the app */
  priorScanHref?: string;
};

type ScoredCandidate = {
  score: number;
  createdMs: number;
  ctx: PreviousScanComparisonContext;
};

function normStr(s: string | undefined | null): string {
  return (s ?? "").trim().toLowerCase();
}

function topStrainFromSaved(s: SavedUnifiedScan): string | undefined {
  const t = s.topStrainName?.trim() || s.matches[0]?.name?.trim();
  return t || undefined;
}

function topStrainFromSnapshot(s: ClientScanSnapshot): string | undefined {
  return s.matches[0]?.name?.trim() || undefined;
}

/**
 * Heuristic score: same linked plant, strain overlap, summary signal similarity, recency.
 * Higher is better. Stable and explainable — not ML.
 */
export function scorePriorAgainstCurrent(
  prior: {
    summary: UnifiedScanSummary;
    topStrain?: string;
    linkedPlantId?: string | null;
    createdAtIso: string;
  },
  current: {
    summary: UnifiedScanSummary;
    topStrain?: string | null;
    linkedPlantId?: string | null;
  },
  nowMs: number
): number {
  let score = 0;
  const cpp = current.linkedPlantId?.trim();
  const ppp = prior.linkedPlantId?.trim();
  if (cpp && ppp && cpp === ppp) score += 520;
  else if (cpp && ppp && cpp !== ppp) score -= 200;
  else if (cpp && !ppp) score -= 40;

  const a = normStr(prior.topStrain);
  const b = normStr(current.topStrain ?? undefined);
  if (a && b && a === b) score += 45;

  const ps = prior.summary;
  const cs = current.summary;
  if (ps.wholePlantDetected === cs.wholePlantDetected) score += 8;
  if (ps.flowerDetected === cs.flowerDetected) score += 6;
  if (ps.packagedProductDetected === cs.packagedProductDetected) score += 6;
  if (ps.textDetected === cs.textDetected) score += 4;

  const priorMs = Date.parse(prior.createdAtIso);
  if (Number.isFinite(priorMs) && priorMs < nowMs) {
    const hours = (nowMs - priorMs) / (1000 * 60 * 60);
    score += Math.max(0, 28 - Math.min(hours, 28));
  }

  return score;
}

function savedToContext(s: SavedUnifiedScan): PreviousScanComparisonContext {
  return {
    source: "saved",
    capturedAt: s.createdAt,
    plantAnalysis: s.plantAnalysis,
    priorTopStrain: topStrainFromSaved(s),
    priorScanHref: savedScanResultsPath(s.id),
  };
}

function chainToContext(snap: ClientScanSnapshot): PreviousScanComparisonContext {
  return {
    source: "chain",
    capturedAt: snap.capturedAt,
    plantAnalysis: snap.plantAnalysis,
    priorTopStrain: topStrainFromSnapshot(snap),
    priorScanHref: snap.savedScanId ? savedScanResultsPath(snap.savedScanId) : undefined,
  };
}

/**
 * Resolve the best prior scan for progression/compare: scores saved registry entries
 * and the session chain snapshot together, so the immediate prior run wins when it’s
 * only on the chain (e.g. before registry write-back). Durable saved rows get the
 * same scoring plus typical metadata; wording still distinguishes saved vs session in coach copy.
 */
export function resolvePreviousScanForProgression(input: {
  capturingAtIso: string;
  currentSummary: UnifiedScanSummary;
  currentTopStrain?: string | null;
  /** Reserved for when plant identity is wired end-to-end */
  currentLinkedPlantId?: string | null;
  chainLast: ClientScanSnapshot | null;
}): PreviousScanComparisonContext | null {
  const nowMs = Date.parse(input.capturingAtIso);
  if (!Number.isFinite(nowMs)) return null;

  const currentPayload = {
    summary: input.currentSummary,
    topStrain: input.currentTopStrain ?? undefined,
    linkedPlantId: input.currentLinkedPlantId ?? null,
  };

  const registryIds = new Set<string>();
  const candidates: ScoredCandidate[] = [];

  for (const s of listSavedScansLocalSorted()) {
    const t = Date.parse(s.createdAt);
    if (!Number.isFinite(t) || t >= nowMs) continue;
    registryIds.add(s.id);
    const score = scorePriorAgainstCurrent(
      {
        summary: s.summary,
        topStrain: topStrainFromSaved(s),
        linkedPlantId: s.linkedPlantId,
        createdAtIso: s.createdAt,
      },
      currentPayload,
      nowMs
    );
    candidates.push({
      score,
      createdMs: t,
      ctx: savedToContext(s),
    });
  }

  const chain = input.chainLast;
  if (chain) {
    const ct = Date.parse(chain.capturedAt);
    if (Number.isFinite(ct) && ct < nowMs) {
      const sid = chain.savedScanId?.trim();
      const skipDuplicate = sid && registryIds.has(sid);
      if (!skipDuplicate) {
        const score = scorePriorAgainstCurrent(
          {
            summary: chain.summary,
            topStrain: topStrainFromSnapshot(chain),
            linkedPlantId: chain.linkedPlantId ?? null,
            createdAtIso: chain.capturedAt,
          },
          currentPayload,
          nowMs
        );
        candidates.push({
          score,
          createdMs: ct,
          ctx: chainToContext(chain),
        });
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.createdMs - a.createdMs;
  });

  return candidates[0].ctx;
}
