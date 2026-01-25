"use server";

import { createServerClient } from "../../lib/supabase/server";

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
      primary_name: scan.strainName || null,
      confidence: scan.confidence || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Silent fail — history must never break scanning
    console.warn("Scan history save skipped:", err);
  }
}
