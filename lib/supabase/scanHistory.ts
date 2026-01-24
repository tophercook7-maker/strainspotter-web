import { supabase } from "./client";
import type { OrchestratedScanResult } from "../scanner/scanOrchestrator";

export type ScanHistoryEntry = {
  id?: string;
  user_id?: string;
  display_name: string;
  confidence_percent: number;
  confidence_tier: string;
  scan_timestamp: string;
  summary: string[]; // Stored as JSON array
  is_public: boolean;
};

/**
 * Saves a normalized scan result to Supabase.
 * NEVER throws. Returns null on failure.
 * NEVER accesses rawScannerResult internals.
 */
export async function saveScanResultToHistory(
  result: OrchestratedScanResult,
  userId?: string
): Promise<string | null> {
  if (!supabase) {
    console.warn("Supabase not configured, skipping history save.");
    return null;
  }

  try {
    const entry: ScanHistoryEntry = {
      user_id: userId, // Can be undefined for anonymous scans
      display_name: result.displayName,
      confidence_percent: result.confidencePercent,
      confidence_tier: result.confidenceTier,
      scan_timestamp: new Date().toISOString(),
      summary: result.summary,
      is_public: false,
    };

    const { data, error } = await supabase
      .from("scan_history")
      .insert([entry])
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save scan history:", error.message);
      return null;
    }

    return data?.id || null;
  } catch (e) {
    console.error("Unexpected error saving scan history:", e);
    return null;
  }
}
