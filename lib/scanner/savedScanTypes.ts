/**
 * Canonical saved scan model — shared by Scan History, Grow Log linkage, and continuity.
 * Stored server-side in `scans.result` (schemaVersion 2) and/or client `ss_saved_scans_v2`.
 */

import type {
  GrowCoachPayload,
  PlantAnalysisPayload,
  RankedMatchRow,
  UnifiedScanSummary,
} from "./rankedScanTypes";

export const SAVED_SCAN_SCHEMA_VERSION = 2 as const;

/** Image reference — data URLs only stored locally or when small enough */
export type SavedScanImageRef = {
  kind: "dataUrl";
  dataUrl?: string;
  thumbDataUrl?: string;
};

export type SavedUnifiedScan = {
  /** Stable id — server UUID or `local:…` */
  id: string;
  schemaVersion: typeof SAVED_SCAN_SCHEMA_VERSION;
  createdAt: string;
  source: {
    kind: "scanner";
    deviceLocal: boolean;
    /** True once persisted to Supabase */
    serverSynced: boolean;
  };
  imageRefs: SavedScanImageRef[];
  summary: UnifiedScanSummary;
  matches: RankedMatchRow[];
  plantAnalysis: PlantAnalysisPayload;
  growCoach: GrowCoachPayload;
  improveTips: string[];
  poorImageMessage?: string;
  /** Same narrative as `/api/scan` top-level `summary` when saved from the scanner. */
  apiScanSummary?: string;
  topStrainName?: string;
  scanStatus?: "ok" | "poor_image";
  /** Grow Log entry ids linked from this scan (client registry; mirrored when possible) */
  linkedGrowLogEntryIds: string[];
  linkedPlantId: string | null;
  /** Snapshot of plant display name when linked (survives if plant renamed later) */
  linkedPlantName?: string | null;
  status: "saved";
};

/** Wrapper inside `scans.result` jsonb */
export type StoredScanResultV2 = {
  schemaVersion: typeof SAVED_SCAN_SCHEMA_VERSION;
  unified: SavedUnifiedScan;
  /** Optional legacy VM / analysis blob for old viewers */
  legacy?: Record<string, unknown>;
};
