/**
 * Reference imagery source mode (local TheVault / embedding index vs Supabase metadata).
 * Embeddings stay local for dev; Supabase mirrors approved blobs + metadata for production.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ReferenceSourceMode = "local" | "supabase" | "hybrid";

export function getReferenceSourceMode(): ReferenceSourceMode {
  const raw = (process.env.REFERENCE_SOURCE || "local").trim().toLowerCase();
  if (raw === "supabase" || raw === "hybrid") return raw;
  return "local";
}

/** Whether CLIP / embedding indexes should continue loading from local JSON + paths. */
export function useLocalReferenceEmbeddings(): boolean {
  const mode = getReferenceSourceMode();
  return mode === "local" || mode === "hybrid";
}

/**
 * Prefer DB-backed metadata (e.g. public URLs) from Supabase in production when hybrid.
 */
export function preferSupabaseReferenceMetadata(): boolean {
  const mode = getReferenceSourceMode();
  if (mode === "supabase") return true;
  if (mode === "hybrid") return process.env.NODE_ENV === "production";
  return false;
}

export type ScannerReferenceImageRecord = {
  id: string;
  strain_slug: string;
  strain_name: string;
  source_name: string | null;
  storage_bucket: string;
  storage_path: string;
  public_url: string | null;
  content_hash: string;
  disabled: boolean;
  review_status: string | null;
};

/**
 * Load scanner_reference_images rows (server-side only). Safe no-op surface for future wiring.
 */
export async function fetchScannerReferenceMetadata(
  client: SupabaseClient,
  opts?: { limit?: number; strainSlug?: string }
): Promise<ScannerReferenceImageRecord[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 5000, 1), 20000);
  let q = client
    .from("scanner_reference_images")
    .select(
      "id, strain_slug, strain_name, source_name, storage_bucket, storage_path, public_url, content_hash, disabled, review_status"
    )
    .eq("disabled", false);

  if (opts?.strainSlug) {
    q = q.eq("strain_slug", opts.strainSlug);
  }

  const { data, error } = await q.limit(limit);
  if (error) throw error;
  return (data || []) as ScannerReferenceImageRecord[];
}
