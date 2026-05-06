"use server";

import { createServerClient } from "../_server/supabase/server";
import { toStoredResultV2 } from "@/lib/scanner/savedScanMappers";
import type { SavedUnifiedScan } from "@/lib/scanner/savedScanTypes";

/**
 * Server action to save scan history to Supabase.
 * Non-blocking, production-safe. Failure must NEVER break scanning.
 *
 * Legacy entry point — kept for older callers that haven't migrated to the
 * unified scan model. New callers should use `saveUnifiedScanToServer`.
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
      primary_name: scan.strainName || null,
      confidence: scan.confidence || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Silent fail — history must never break scanning
    console.warn("Scan history save skipped:", err);
  }
}

/**
 * Save a unified scan record to Supabase, returning the inserted row id.
 * Used by the Grow Log persistence flow (`lib/growlog/persistUnifiedScan.ts`).
 *
 * Schema:
 *   - `result`         → StoredScanResultV2 wrapper (schemaVersion 2)
 *   - `primary_name`   → top strain display name (best-effort)
 *   - `confidence`     → top match confidence percentage (best-effort)
 *   - `created_at`     → mirrors the unified scan's createdAt
 *
 * Returns `{ id }` on success, `null` on any failure (caller falls back to
 * a `local:…` id and the local registry).
 */
export async function saveUnifiedScanToServer(input: {
  userId: string | null;
  unified: SavedUnifiedScan;
  legacyMetadata?: Record<string, unknown>;
}): Promise<{ id: string } | null> {
  try {
    const supabase = createServerClient();
    const result = toStoredResultV2(input.unified, input.legacyMetadata);

    const topName =
      input.unified.topStrainName ??
      input.unified.matches?.[0]?.name ??
      null;
    const topConfidence = input.unified.matches?.[0]?.confidence ?? null;

    const { data, error } = await supabase
      .from("scans")
      .insert({
        user_id: input.userId,
        result,
        primary_name: topName,
        confidence: topConfidence,
        created_at: input.unified.createdAt ?? new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      console.warn("saveUnifiedScanToServer insert failed:", error?.message);
      return null;
    }

    return { id: String((data as { id: unknown }).id) };
  } catch (err) {
    console.warn("saveUnifiedScanToServer error:", err);
    return null;
  }
}
