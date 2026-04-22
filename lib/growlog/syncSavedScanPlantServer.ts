"use client";

import { syncUnifiedScanPlantLinkToServer } from "@/app/actions/syncUnifiedScanPlantLink";
import { getSavedScanLocal } from "@/lib/growlog/savedScanRegistry";
import { isServerBackedSavedScanId } from "@/lib/scanner/savedScanId";

/**
 * Push current local-registry plant linkage to Supabase for server-backed scan ids.
 * No-op for `local:…` scans or missing registry rows.
 */
export function scheduleSyncSavedScanPlantToServer(
  scanId: string,
  userId: string | null
): void {
  if (!isServerBackedSavedScanId(scanId)) return;
  const saved = getSavedScanLocal(scanId);
  if (!saved) return;
  void syncUnifiedScanPlantLinkToServer({
    scanId,
    userId,
    linkedPlantId: saved.linkedPlantId ?? null,
    linkedPlantName: saved.linkedPlantName?.trim() || null,
  }).catch(() => {
    /* non-fatal */
  });
}
