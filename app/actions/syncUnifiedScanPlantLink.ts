"use server";

import { createServerClient } from "../_server/supabase/server";
import { parseStoredScanResult, toStoredResultV2 } from "@/lib/scanner/savedScanMappers";
import { isServerBackedSavedScanId } from "@/lib/scanner/savedScanId";
import type { SavedUnifiedScan } from "@/lib/scanner/savedScanTypes";

/**
 * Patch `scans.result.unified` plant linkage for a server-backed scan.
 * Verifies row ownership against `userId` when the row has a `user_id`.
 */
export async function syncUnifiedScanPlantLinkToServer(input: {
  scanId: string;
  userId: string | null;
  linkedPlantId: string | null;
  linkedPlantName: string | null;
}): Promise<{ ok: boolean }> {
  const scanId = input.scanId.trim();
  if (!isServerBackedSavedScanId(scanId)) return { ok: false };

  try {
    const supabase = createServerClient();
    const { data: row, error: fetchError } = await supabase
      .from("scans")
      .select("id, user_id, result")
      .eq("id", scanId)
      .maybeSingle();

    if (fetchError || !row) {
      console.warn("syncUnifiedScanPlantLinkToServer: fetch", fetchError?.message);
      return { ok: false };
    }

    const rowUserId = (row.user_id as string | null) ?? null;
    if (rowUserId) {
      if (!input.userId || rowUserId !== input.userId) return { ok: false };
    } else if (input.userId) {
      // Row is anonymous; refuse updates from a signed-in client to avoid cross-tenant writes.
      return { ok: false };
    }

    const parsed = parseStoredScanResult(row.result);
    if (!parsed.unified) return { ok: false };

    const unifiedNext: SavedUnifiedScan = {
      ...parsed.unified,
      id: scanId,
      linkedPlantId: input.linkedPlantId,
      linkedPlantName: input.linkedPlantName,
      source: {
        ...parsed.unified.source,
        serverSynced: true,
      },
    };

    const stored = toStoredResultV2(unifiedNext, parsed.legacy ?? undefined);

    const { error: updateError } = await supabase
      .from("scans")
      .update({ result: stored as unknown as Record<string, unknown> })
      .eq("id", scanId);

    if (updateError) {
      console.warn("syncUnifiedScanPlantLinkToServer: update", updateError.message);
      return { ok: false };
    }

    return { ok: true };
  } catch (e) {
    console.warn("syncUnifiedScanPlantLinkToServer:", e);
    return { ok: false };
  }
}
