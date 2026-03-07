/**
 * Strain reference image pipeline.
 * Candidates are created from high-confidence scans; approved images require manual promotion.
 * Does NOT replace current heuristic matching—prepares for future image-to-image matching.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ReferenceImageRow = {
  id: string;
  strain_slug: string;
  image_url: string;
  source_type: string;
  match_confidence: number | null;
  approved: boolean;
  approval_status: string;
  scan_event_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const CANDIDATE_CONFIDENCE_THRESHOLD = 0.8; // 80%

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "unknown";
}

/**
 * Create a candidate reference image from a high-confidence scan.
 * Only creates if strain_slug is present and confidence >= threshold.
 * Non-blocking; failures must not break scanning.
 */
export async function createCandidateReferenceImage(
  supabase: SupabaseClient,
  opts: {
    strain_slug: string;
    image_url: string;
    match_confidence: number;
    scan_event_id?: string | null;
    created_by?: string | null;
    source_type?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ id?: string; error?: string }> {
  try {
    const { error, data } = await supabase
      .from("strain_reference_images")
      .insert({
        strain_slug: opts.strain_slug,
        image_url: opts.image_url,
        source_type: opts.source_type ?? "scan_candidate",
        match_confidence: opts.match_confidence,
        approved: false,
        approval_status: "candidate",
        scan_event_id: opts.scan_event_id ?? null,
        created_by: opts.created_by ?? null,
        metadata: opts.metadata ?? {},
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    return { id: data?.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * List approved reference images for a strain.
 * Used by future image-to-image matching; not yet wired into matching.
 */
export async function listApprovedReferenceImagesByStrain(
  supabase: SupabaseClient,
  strain_slug: string
): Promise<ReferenceImageRow[]> {
  const { data, error } = await supabase
    .from("strain_reference_images")
    .select("*")
    .eq("strain_slug", strain_slug)
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as ReferenceImageRow[];
}

/**
 * Stub: promote a candidate to approved.
 * NOT auto-enabled; for admin use only.
 */
export async function maybePromoteCandidate(
  _supabase: SupabaseClient,
  _id: string,
  _approved_by?: string | null
): Promise<{ ok: boolean; error?: string }> {
  // TODO: Implement when admin flow exists.
  return { ok: false, error: "Not implemented" };
}

/**
 * Determine strain slug and confidence from a v1 payload.
 * Returns null if not eligible for candidate creation.
 */
export function extractCandidateEligibility(payload: {
  primary_match?: { strain_id?: string | null; strain_name?: string | null; confidence?: number };
}): { strain_slug: string; confidence: number } | null {
  const pm = payload?.primary_match;
  if (!pm) return null;

  const confidence = typeof pm.confidence === "number" ? pm.confidence : 0;
  if (confidence < CANDIDATE_CONFIDENCE_THRESHOLD) return null;

  const strain_slug =
    (typeof pm.strain_id === "string" && pm.strain_id.trim())
      ? pm.strain_id.trim()
      : (typeof pm.strain_name === "string" && pm.strain_name.trim())
        ? toSlug(pm.strain_name)
        : null;

  if (!strain_slug || strain_slug === "unknown") return null;

  return { strain_slug, confidence };
}
