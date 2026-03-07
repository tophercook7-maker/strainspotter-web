/**
 * Passive hooks for future image-to-image matching.
 * Does NOT replace current heuristic/vector matching.
 * Use approved reference images when/if we add embedding-based image search.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { listApprovedReferenceImagesByStrain } from "./index";
import type { ReferenceImageRow } from "./index";

/**
 * Load approved reference images for a matched strain.
 * Future matching can use these for enrichment or embedding-based similarity.
 * Currently passive—call when building match context if desired.
 */
export async function loadApprovedReferencesForStrain(
  supabase: SupabaseClient,
  strain_slug: string
): Promise<ReferenceImageRow[]> {
  return listApprovedReferenceImagesByStrain(supabase, strain_slug);
}

/**
 * TODO: Future embedding/image-search logic.
 * When ready: compute embeddings for query image, compare against
 * precomputed embeddings of approved reference images, return ranked matches.
 * Stub only—no implementation.
 */
export function getImageSearchStub(): string {
  return "Future: embedding-based image search against approved references";
}
