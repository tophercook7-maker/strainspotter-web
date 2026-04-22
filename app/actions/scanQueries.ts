"use server";

import { createServerClient } from "../_server/supabase/server";
import {
  historyListSubtitleFromStoredResult,
  parseStoredScanResult,
  primaryStrainLabelFromStoredResult,
  topConfidenceFromStoredResult,
} from "@/lib/scanner/savedScanMappers";
import type { SavedUnifiedScan } from "@/lib/scanner/savedScanTypes";
import { isServerBackedSavedScanId } from "@/lib/scanner/savedScanId";

export type ScanHistoryRow = {
  id: string;
  /** Derived from `result` JSON (not a physical `scans.primary_name` column). */
  primary_name: string | null;
  /** Derived from `result` JSON (not a physical `scans.confidence` column). */
  confidence: number | null;
  created_at: string | null;
  hasUnified: boolean;
  linkedLogCount: number;
  /** Truncated narrative from stored API summary when available. */
  summary_snippet: string | null;
  /** From `result.unified` when present (for devices without local registry) */
  linkedPlantId?: string | null;
  linkedPlantName?: string | null;
};

export async function fetchScansHistoryForUser(
  userId: string | null
): Promise<ScanHistoryRow[]> {
  try {
    const supabase = createServerClient();
    let q = supabase
      .from("scans")
      .select("id, created_at, result")
      .order("created_at", { ascending: false })
      .limit(40);

    if (userId) {
      q = q.eq("user_id", userId);
    }

    const { data, error } = await q;
    if (error || !data) {
      console.warn("fetchScansHistoryForUser:", error?.message);
      return [];
    }

    return data.map((row: Record<string, unknown>) => {
      const { unified } = parseStoredScanResult(row.result);
      const linked = unified?.linkedGrowLogEntryIds?.length ?? 0;
      return {
        id: String(row.id),
        primary_name: primaryStrainLabelFromStoredResult(row.result),
        confidence: topConfidenceFromStoredResult(row.result),
        created_at: (row.created_at as string) ?? null,
        hasUnified: !!unified,
        linkedLogCount: linked,
        summary_snippet: historyListSubtitleFromStoredResult(row.result),
        linkedPlantId: unified?.linkedPlantId ?? null,
        linkedPlantName: unified?.linkedPlantName ?? null,
      };
    });
  } catch (e) {
    console.warn("fetchScansHistoryForUser", e);
    return [];
  }
}

export async function fetchUnifiedScanByServerId(
  id: string
): Promise<{ unified: SavedUnifiedScan | null; primary_name: string | null; created_at: string | null } | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("scans")
      .select("id, result, created_at")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    let { unified } = parseStoredScanResult(data.result);
    const rid = String(data.id);
    if (unified && unified.id !== rid) {
      unified = {
        ...unified,
        id: rid,
        source: { ...unified.source, serverSynced: true },
      };
    }
    return {
      unified,
      primary_name: primaryStrainLabelFromStoredResult(data.result),
      created_at: data.created_at as string | null,
    };
  } catch {
    return null;
  }
}

/**
 * Load canonical unified scan for Grow Log compose when the device has no local registry copy.
 * Local `local:…` ids are not fetched here — the client uses the registry only.
 */
export async function fetchSavedScanForCompose(
  scanId: string
): Promise<SavedUnifiedScan | null> {
  const trimmed = scanId.trim();
  if (!trimmed || !isServerBackedSavedScanId(trimmed)) return null;

  const row = await fetchUnifiedScanByServerId(trimmed);
  return row?.unified ?? null;
}
