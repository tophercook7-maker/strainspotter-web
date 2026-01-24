// lib/supabase/scanHistory.ts
import { createClient } from "@/lib/supabase/client";

/**
 * Non-blocking, production-safe scan history writer.
 * Failure here must NEVER break scanning.
 */
export async function saveScanResultToHistory({
  userId,
  scanResult,
}: {
  userId: string | null;
  scanResult: any;
}) {
  try {
    if (!userId) return;

    const supabase = createClient();

    await supabase.from("scans").insert({
      user_id: userId,
      result: scanResult,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Silent fail — history must never break scanning
    console.warn("Scan history save skipped:", err);
  }
}
