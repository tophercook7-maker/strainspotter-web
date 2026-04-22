import type { ClientScanSnapshot } from "@/lib/growlog/growLogStorage";
import type { HybridScanPresentation } from "./scanOrchestrator";
import {
  RANKED_DISCLAIMER,
  type GrowCoachPayload,
  type PlantAnalysisPayload,
  type RankedConfidenceTier,
  type RankedMatchRow,
  type UnifiedScanPayload,
  type UnifiedScanSummary,
} from "./rankedScanTypes";
import type { SavedUnifiedScan, StoredScanResultV2 } from "./savedScanTypes";
import { SAVED_SCAN_SCHEMA_VERSION } from "./savedScanTypes";
import { resolveStrainSlug } from "./strainSlug";

/** UI bundle used on the scanner page */
export type UnifiedScanUi = {
  summary: SavedUnifiedScan["summary"];
  matches: SavedUnifiedScan["matches"];
  plantAnalysis: SavedUnifiedScan["plantAnalysis"];
  growCoach: SavedUnifiedScan["growCoach"];
  improveTips: string[];
  poorImageMessage?: string;
  apiScanSummary?: string;
};

export function unifiedUiFromPayload(p: UnifiedScanPayload): UnifiedScanUi {
  return {
    summary: p.summary,
    matches: p.matches,
    plantAnalysis: p.plantAnalysis,
    growCoach: p.growCoach,
    improveTips: p.improveTips,
    poorImageMessage: p.poorImageMessage,
  };
}

export function buildSavedUnifiedScan(input: {
  id: string;
  createdAt: string;
  ui: UnifiedScanUi;
  imageRefs: SavedUnifiedScan["imageRefs"];
  serverSynced: boolean;
  deviceLocal: boolean;
  linkedGrowLogEntryIds?: string[];
  linkedPlantId?: string | null;
  linkedPlantName?: string | null;
  scanStatus?: "ok" | "poor_image";
}): SavedUnifiedScan {
  const top =
    input.ui.matches[0]?.name ??
    input.ui.matches.find((m) => m.rank === 1)?.name;
  return {
    id: input.id,
    schemaVersion: SAVED_SCAN_SCHEMA_VERSION,
    createdAt: input.createdAt,
    source: {
      kind: "scanner",
      deviceLocal: input.deviceLocal,
      serverSynced: input.serverSynced,
    },
    imageRefs: input.imageRefs,
    summary: input.ui.summary,
    matches: input.ui.matches,
    plantAnalysis: input.ui.plantAnalysis,
    growCoach: input.ui.growCoach,
    improveTips: input.ui.improveTips,
    poorImageMessage: input.ui.poorImageMessage,
    ...(input.ui.apiScanSummary?.trim()
      ? { apiScanSummary: input.ui.apiScanSummary.trim() }
      : {}),
    topStrainName: top,
    scanStatus: input.scanStatus ?? (input.ui.poorImageMessage ? "poor_image" : "ok"),
    linkedGrowLogEntryIds: input.linkedGrowLogEntryIds ?? [],
    linkedPlantId: input.linkedPlantId ?? null,
    linkedPlantName: input.linkedPlantName ?? null,
    status: "saved",
  };
}

export function savedToScanUi(saved: SavedUnifiedScan): UnifiedScanUi {
  return {
    summary: saved.summary,
    matches: saved.matches,
    plantAnalysis: saved.plantAnalysis,
    growCoach: saved.growCoach,
    improveTips: saved.improveTips,
    poorImageMessage: saved.poorImageMessage,
    ...(saved.apiScanSummary?.trim()
      ? { apiScanSummary: saved.apiScanSummary.trim() }
      : {}),
  };
}

export function savedToClientSnapshot(saved: SavedUnifiedScan): ClientScanSnapshot {
  const urls = saved.imageRefs
    .filter((r) => r.kind === "dataUrl" && r.dataUrl)
    .map((r) => r.dataUrl as string);
  return {
    id: saved.id,
    capturedAt: saved.createdAt,
    imageCount: Math.max(saved.imageRefs.length, urls.length, 1),
    summary: saved.summary,
    matches: saved.matches,
    plantAnalysis: saved.plantAnalysis,
    growCoach: saved.growCoach,
    savedScanId: saved.id,
    savedScanScope: saved.source.serverSynced ? "server" : "local",
    imageDataUrls: urls.length ? urls : undefined,
    linkedPlantId: saved.linkedPlantId ?? undefined,
    linkedPlantName: saved.linkedPlantName ?? undefined,
  };
}

/** Ensure plant linkage and list fields survive older JSON shapes from Supabase. */
export function normalizeSavedUnifiedFromStored(u: SavedUnifiedScan): SavedUnifiedScan {
  return {
    ...u,
    linkedGrowLogEntryIds: u.linkedGrowLogEntryIds ?? [],
    linkedPlantId: u.linkedPlantId ?? null,
    linkedPlantName: u.linkedPlantName ?? null,
  };
}

export function parseStoredScanResult(rowResult: unknown): {
  unified: SavedUnifiedScan | null;
  legacy: Record<string, unknown> | null;
} {
  if (!rowResult || typeof rowResult !== "object") {
    return { unified: null, legacy: null };
  }
  const r = rowResult as Record<string, unknown>;
  if (r.schemaVersion === SAVED_SCAN_SCHEMA_VERSION && r.unified && typeof r.unified === "object") {
    return {
      unified: normalizeSavedUnifiedFromStored(r.unified as SavedUnifiedScan),
      legacy: (r.legacy as Record<string, unknown>) || null,
    };
  }
  return { unified: null, legacy: r as Record<string, unknown> };
}

/**
 * Display strain label for list/detail UI. Derived from `scans.result` JSON only —
 * does not rely on a `primary_name` DB column (which may not exist in all deployments).
 */
export function primaryStrainLabelFromStoredResult(rowResult: unknown): string | null {
  const { unified, legacy } = parseStoredScanResult(rowResult);
  if (unified) {
    const fromMatch = unified.matches?.[0]?.name?.trim();
    if (fromMatch) return fromMatch;
    const top = unified.topStrainName?.trim();
    if (top) return top;
  }
  if (legacy && typeof legacy === "object") {
    const primary = (legacy as Record<string, unknown>).primaryStrainName;
    if (typeof primary === "string" && primary.trim()) return primary.trim();
    const id = (legacy as Record<string, unknown>).identity;
    if (id && typeof id === "object") {
      const sn = (id as Record<string, unknown>).strainName;
      if (typeof sn === "string" && sn.trim()) return sn.trim();
    }
  }
  return null;
}

/** Narrative line from scanner save (`legacy.apiScanSummary` or unified field). */
export function apiScanSummaryFromStoredResult(rowResult: unknown): string | null {
  const { unified, legacy } = parseStoredScanResult(rowResult);
  const u = unified?.apiScanSummary?.trim();
  if (u) return u;
  if (legacy && typeof legacy === "object") {
    const v = (legacy as Record<string, unknown>).apiScanSummary;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** One-line supporting text for history cards (truncated). */
export function historyListSubtitleFromStoredResult(
  rowResult: unknown,
  maxLen = 80
): string | null {
  const sum = apiScanSummaryFromStoredResult(rowResult);
  if (!sum) return null;
  const t = sum.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

/** Best-effort top match confidence from `scans.result` (no `confidence` column required). */
export function topConfidenceFromStoredResult(rowResult: unknown): number | null {
  const { unified, legacy } = parseStoredScanResult(rowResult);
  if (unified) {
    const c = unified.matches?.[0]?.confidence;
    if (c != null && Number.isFinite(Number(c))) return Number(c);
  }
  if (legacy && typeof legacy === "object") {
    const id = (legacy as Record<string, unknown>).identity;
    if (id && typeof id === "object") {
      const cf = (id as Record<string, unknown>).confidence;
      if (cf != null && Number.isFinite(Number(cf))) return Number(cf);
    }
  }
  return null;
}

export function toStoredResultV2(
  unified: SavedUnifiedScan,
  legacy?: Record<string, unknown>
): StoredScanResultV2 {
  return {
    schemaVersion: SAVED_SCAN_SCHEMA_VERSION,
    unified,
    ...(legacy ? { legacy } : {}),
  };
}

const CARD_LABELS: RankedMatchRow["cardLabel"][] = [
  "Best overall match",
  "Close alternative",
  "Another possible match",
];

function tierFromScore(c: number): RankedConfidenceTier {
  if (!Number.isFinite(c)) return "very_low";
  if (c >= 72) return "high";
  if (c >= 45) return "moderate";
  if (c >= 28) return "low";
  return "very_low";
}

function confidenceLabelForPercent(n: number): string {
  if (!Number.isFinite(n)) return "Low confidence";
  if (n >= 70) return "High confidence";
  if (n >= 40) return "Moderate confidence";
  return "Low confidence";
}

function matchesToRankedRows(
  matches: HybridScanPresentation["matches"] | null | undefined
): RankedMatchRow[] {
  if (!Array.isArray(matches) || matches.length === 0) return [];
  return matches.slice(0, 3).map((m, idx) => {
    const rank = (idx + 1) as 1 | 2 | 3;
    const slug =
      resolveStrainSlug(m.strainName) ||
      m.strainName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      "unknown";
    return {
      rank,
      slug,
      name: m.strainName,
      confidence: Math.max(0, Math.min(100, m.confidence)),
      confidenceLabel: confidenceLabelForPercent(m.confidence),
      cardLabel: CARD_LABELS[idx]!,
      reasons: m.reasons ?? [],
    };
  });
}

function emptyPlantAnalysis(): PlantAnalysisPayload {
  return { typeEstimate: null, growthStage: null, health: null };
}

function coercePlantAnalysis(raw: unknown): PlantAnalysisPayload {
  if (raw && typeof raw === "object") {
    return raw as PlantAnalysisPayload;
  }
  return emptyPlantAnalysis();
}

function defaultGrowCoach(): GrowCoachPayload {
  return {
    headline: "",
    confidence: 0,
    confidenceLabel: "—",
    priorityActions: [],
    suggestions: [],
    watchFor: [],
    cautions: [],
  };
}

function coerceGrowCoach(raw: unknown): GrowCoachPayload {
  if (raw && typeof raw === "object") {
    const g = raw as Record<string, unknown>;
    const base = defaultGrowCoach();
    const logSupport = g.logSupport;
    return {
      headline: typeof g.headline === "string" ? g.headline : base.headline,
      confidence: typeof g.confidence === "number" ? g.confidence : base.confidence,
      confidenceLabel:
        typeof g.confidenceLabel === "string" ? g.confidenceLabel : base.confidenceLabel,
      priorityActions: Array.isArray(g.priorityActions)
        ? g.priorityActions.filter((x): x is string => typeof x === "string")
        : base.priorityActions,
      suggestions: Array.isArray(g.suggestions)
        ? g.suggestions.filter((x): x is string => typeof x === "string")
        : base.suggestions,
      watchFor: Array.isArray(g.watchFor)
        ? g.watchFor.filter((x): x is string => typeof x === "string")
        : base.watchFor,
      cautions: Array.isArray(g.cautions)
        ? g.cautions.filter((x): x is string => typeof x === "string")
        : base.cautions,
      ...(typeof g.limited === "boolean" ? { limited: g.limited } : {}),
      ...(logSupport && typeof logSupport === "object"
        ? { logSupport: logSupport as GrowCoachPayload["logSupport"] }
        : {}),
      ...(typeof g.recommendedFollowUpWindow === "string"
        ? { recommendedFollowUpWindow: g.recommendedFollowUpWindow }
        : {}),
    };
  }
  return defaultGrowCoach();
}

/**
 * Build the unified scan UI bundle for `persistUnifiedScan` from hybrid fields + API summary line.
 * Keeps one save path for Scan History / local registry.
 */
export function buildUnifiedScanUiForPersist(input: {
  imageCount: number;
  hybridMatches?: HybridScanPresentation["matches"] | null;
  plantAnalysis: unknown;
  growCoach: unknown;
  improveTips?: string[];
  poorImageMessage?: string;
  /** Top-level `/api/scan` summary string (stored on save for history recall). */
  apiScanSummary?: string | null;
  topConfidence: number;
  status?: "ok" | "needs_better_images";
  resultType?: "matched" | "unresolved";
}): UnifiedScanUi {
  const topC = Math.max(0, Math.min(100, Number(input.topConfidence) || 0));
  const weak =
    input.resultType === "unresolved" ||
    input.status === "needs_better_images" ||
    topC < 42;

  const summaryObj: UnifiedScanSummary = {
    confidenceTier: tierFromScore(topC),
    multiPhotoUsed: input.imageCount > 1,
    textDetected: false,
    disclaimer: RANKED_DISCLAIMER,
    ...(weak ? { setLabel: "Low-confidence visual suggestions" as const } : {}),
    flowerDetected: true,
  };

  const apiLine =
    typeof input.apiScanSummary === "string" && input.apiScanSummary.trim()
      ? input.apiScanSummary.trim()
      : undefined;

  return {
    summary: summaryObj,
    matches: matchesToRankedRows(input.hybridMatches),
    plantAnalysis: coercePlantAnalysis(input.plantAnalysis),
    growCoach: coerceGrowCoach(input.growCoach),
    improveTips: Array.isArray(input.improveTips) ? input.improveTips : [],
    poorImageMessage: input.poorImageMessage,
    ...(apiLine ? { apiScanSummary: apiLine } : {}),
  };
}
