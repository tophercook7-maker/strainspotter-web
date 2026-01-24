// lib/supabase/scanHistory.ts
// Production-safe scan history saving
// NEVER throws, always returns status object

type SaveScanHistoryInput = {
  userId?: string | null;
  imagesCount: number;
  primaryStrainName: string;
  confidencePercent?: number | null;
  status: "success" | "partial";
  scanId?: string | null;
  raw?: any;
};

export async function saveScanResultToHistory(
  input: SaveScanHistoryInput
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  // 1) Guard: if no SUPABASE_URL or SUPABASE_ANON_KEY => return { ok:false, skipped:true }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === "development") {
      console.log("Supabase not configured, skipping history save.");
    }
    return { ok: false, skipped: true };
  }

  try {
    // 2) Create client dynamically
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3) Insert into table: scan_history (fallback to "scans" if needed)
    const payload = {
      created_at: new Date().toISOString(),
      user_id: input.userId || null,
      status: input.status,
      primary_name: input.primaryStrainName,
      confidence: input.confidencePercent ?? null,
      images_count: input.imagesCount,
      scan_id: input.scanId || null,
    };

    // Try scan_history first, fallback to scans
    let result;
    let error;

    // Try scan_history table
    const { data: data1, error: error1 } = await supabase
      .from("scan_history")
      .insert([payload])
      .select("id")
      .single();

    if (!error1) {
      result = data1;
    } else {
      // Fallback to scans table
      const { data: data2, error: error2 } = await supabase
        .from("scans")
        .insert([payload])
        .select("id")
        .single();

      if (!error2) {
        result = data2;
      } else {
        error = error2;
      }
    }

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to save scan history:", error.message);
      }
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    if (process.env.NODE_ENV === "development") {
      console.error("Unexpected error saving scan history:", e);
    }
    return { ok: false, error: errorMessage };
  }
}

// Legacy export for backward compatibility (deprecated)
export type ScanHistoryEntry = {
  id?: string;
  user_id?: string;
  display_name: string;
  confidence_percent: number;
  confidence_tier: string;
  scan_timestamp: string;
  summary: string[];
  is_public: boolean;
};
