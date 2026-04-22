"use server";

import { createServerClient } from "../_server/supabase/server";
import { toStoredResultV2 } from "@/lib/scanner/savedScanMappers";
import type { SavedUnifiedScan } from "@/lib/scanner/savedScanTypes";

/**
 * Server action to save scan history to Supabase.
 * Non-blocking, production-safe. Failure must NEVER break scanning.
 */
export async function saveScanHistory(scan: {
  strainName: string | null;
  confidence: number | null;
  metadata: any;
}) {
  try {
    const supabase = createServerClient();

    await supabase.from("scans").insert({
      user_id: null, // TODO: wire auth when available
      result: scan.metadata || {},
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Silent fail — history must never break scanning
    console.warn("Scan history save skipped:", err);
  }
}

/**
 * Persist a unified saved scan row (`scans.result` schema v2). Returns server id or null.
 * Callers treat failure as non-fatal (local registry still updated).
 */
export async function saveUnifiedScanToServer(input: {
  userId: string | null;
  unified: SavedUnifiedScan;
  legacyMetadata?: Record<string, unknown>;
}): Promise<{ id: string } | null> {
  try {
    const uid = input.userId?.trim();
    if (!uid) return null;

    const supabase = createServerClient();
    const u = input.unified;

    const resultPayload = toStoredResultV2(u, input.legacyMetadata);

    const { data, error } = await supabase
      .from("scans")
      .insert({
        user_id: uid,
        result: resultPayload,
        created_at: u.createdAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.warn("saveUnifiedScanToServer:", error?.message);
      return null;
    }

    return { id: String((data as { id: string }).id) };
  } catch (e) {
    console.warn("saveUnifiedScanToServer:", e);
    return null;
  }
}
