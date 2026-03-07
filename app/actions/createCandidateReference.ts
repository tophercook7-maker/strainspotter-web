"use server";

import { createServerClient } from "../_server/supabase/server";
import {
  createCandidateReferenceImage,
  extractCandidateEligibility,
} from "@/lib/referenceImages";
import type { ScanResultPayloadV1 } from "@/lib/scanner/types";
import { isScanResultPayloadV1 } from "@/lib/scanner/types";

/**
 * Create a candidate reference image if the scan payload meets eligibility rules.
 * Reusable for both backend-first and fallback scan paths.
 * Non-blocking; failure must not break scanning.
 */
export async function createCandidateReferenceIfEligible(opts: {
  result_payload: ScanResultPayloadV1 | null;
  image_url: string | null;
}) {
  try {
    const payload = opts.result_payload;
    if (!payload || !isScanResultPayloadV1(payload)) return;

    const imageUrl = (opts.image_url ?? "").trim();
    if (imageUrl.length === 0) return;

    const eligibility = extractCandidateEligibility(payload);
    if (!eligibility) return;

    const supabase = createServerClient();
    await createCandidateReferenceImage(supabase, {
      strain_slug: eligibility.strain_slug,
      image_url: imageUrl,
      match_confidence: eligibility.confidence,
      source_type: "scan_candidate",
      metadata: { model: payload.model },
    });
  } catch (e) {
    console.warn("Candidate reference creation skipped:", e);
  }
}
