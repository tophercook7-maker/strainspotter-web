"use client";

import { saveUnifiedScanToServer } from "@/app/actions/saveScanHistory";
import type { UnifiedScanUi } from "@/lib/scanner/savedScanMappers";
import {
  buildSavedUnifiedScan,
} from "@/lib/scanner/savedScanMappers";
import type { SavedUnifiedScan } from "@/lib/scanner/savedScanTypes";
import { upsertSavedScanLocal } from "./savedScanRegistry";
import { attachScanToPlant, getPlantById } from "./plantStorage";

export type PersistScanOutcome = {
  savedScanId: string;
  scope: "server" | "local";
  saved: SavedUnifiedScan;
};

/**
 * Persist unified scan: try Supabase first, always mirror in local registry for linkage / offline.
 */
export async function persistUnifiedScan(input: {
  ui: UnifiedScanUi;
  userId: string | null;
  imageDataUrls?: string[];
  /** Pre-scan client snapshot id (continuity) — may become local id prefix */
  clientSnapshotId: string;
  serverSyncedHint?: boolean;
  /** When set, saved scan + plant record are linked after persist */
  linkedPlantId?: string | null;
  linkedPlantName?: string | null;
  /** Passed through to `toStoredResultV2` (e.g. API summary line for recall). */
  legacyMetadata?: Record<string, unknown>;
}): Promise<PersistScanOutcome> {
  const createdAt = new Date().toISOString();
  const imageRefs =
    input.imageDataUrls?.map((dataUrl) => ({
      kind: "dataUrl" as const,
      dataUrl,
    })) ?? [];

  const plantId = input.linkedPlantId?.trim() || null;
  const plantName =
    input.linkedPlantName?.trim() ||
    (plantId ? getPlantById(plantId)?.name : undefined) ||
    null;

  let serverId: string | null = null;
  try {
    const builtLocalFirst = buildSavedUnifiedScan({
      id: `local:${input.clientSnapshotId}`,
      createdAt,
      ui: input.ui,
      imageRefs,
      serverSynced: false,
      deviceLocal: true,
      scanStatus: input.ui.poorImageMessage ? "poor_image" : "ok",
      linkedPlantId: plantId,
      linkedPlantName: plantName,
    });

    const res = await saveUnifiedScanToServer({
      userId: input.userId,
      unified: builtLocalFirst,
      legacyMetadata: input.legacyMetadata ?? {},
    });

    if (res?.id) {
      serverId = res.id;
    }
  } catch {
    /* non-fatal */
  }

  const id = serverId ?? `local:${input.clientSnapshotId}`;
  const saved = buildSavedUnifiedScan({
    id,
    createdAt,
    ui: input.ui,
    imageRefs,
    serverSynced: !!serverId,
    deviceLocal: !serverId,
    scanStatus: input.ui.poorImageMessage ? "poor_image" : "ok",
    linkedPlantId: plantId,
    linkedPlantName: plantName,
  });

  upsertSavedScanLocal(saved);

  if (plantId && getPlantById(plantId)) {
    attachScanToPlant(plantId, saved);
  }

  return {
    savedScanId: id,
    scope: serverId ? "server" : "local",
    saved,
  };
}
