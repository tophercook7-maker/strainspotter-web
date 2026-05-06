import type { ClientScanSnapshot } from "@/lib/growlog/growLogStorage";
import type { UnifiedScanPayload } from "./rankedScanTypes";
import type { SavedUnifiedScan, StoredScanResultV2 } from "./savedScanTypes";
import { SAVED_SCAN_SCHEMA_VERSION } from "./savedScanTypes";

/** UI bundle used on the scanner page */
export type UnifiedScanUi = {
  summary: SavedUnifiedScan["summary"];
  matches: SavedUnifiedScan["matches"];
  plantAnalysis: SavedUnifiedScan["plantAnalysis"];
  growCoach: SavedUnifiedScan["growCoach"];
  improveTips: string[];
  poorImageMessage?: string;
  /** From /api/scan when SCANNER_DEBUG_MATCHING — safe subset only (no secrets, no image bytes). */
  matchingDebug?: Record<string, unknown>;
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
