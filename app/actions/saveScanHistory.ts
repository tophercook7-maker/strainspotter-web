"use server";

import { createServerClient } from "../_server/supabase/server";
import { isScanResultPayloadV1, type ScanResultPayloadV1 } from "@/lib/scanner/types";
import { scanResultToPayloadV1 } from "@/lib/scanner/resultPayloadAdapter";
import { createCandidateReferenceIfEligible } from "./createCandidateReference";
import {
  uploadScanImageToStorage,
  isDurableUrl,
} from "@/lib/referenceImages/uploadScanImage";

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Resolve Public Garden id for anonymous/legacy scans (user_id null).
 * Ensures one row exists with user_id null, returns its id.
 */
async function getPublicGardenId(supabase: SupabaseClient): Promise<string> {
  const { data: existing } = await supabase
    .from("gardens")
    .select("id")
    .is("user_id", null)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: inserted, error } = await supabase
    .from("gardens")
    .insert({ user_id: null, name: "Public Garden" })
    .select("id")
    .single();
  if (error || !inserted?.id) {
    throw new Error("Could not ensure Public Garden: " + (error?.message ?? "no id"));
  }
  return inserted.id;
}

/**
 * Server action to save scan history to Supabase.
 * Writes canonical result_payload (v1.0) only. Inserts DB-valid row with garden_id and image_url.
 * Non-blocking; failure must never break scanning.
 */
export async function saveScanHistory(scan: {
  result_payload?: ScanResultPayloadV1 | null;
  metadata?: any; // ScanResult from judge/orchestrator — used to build result_payload when not provided
  image_url?: string | null; // Required for DB; use data URL or public URL from upload
  vision_payload?: any;
  model_version?: string | null;
  matched_strain_slug?: string | null;
  /** When set, update existing scan (backend path) instead of inserting. Avoids duplicates. */
  existing_scan_id?: string | null;
}) {
  try {
    let payload: ScanResultPayloadV1 | null = null;
    if (scan.result_payload && isScanResultPayloadV1(scan.result_payload)) {
      payload = scan.result_payload;
    } else if (scan.metadata && scan.metadata.result) {
      payload = scanResultToPayloadV1(scan.metadata);
    }
    if (!payload) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[StrainSpotter] saveScanHistory: no payload, skipping");
      }
      return;
    }

    let imageUrl = (scan.image_url ?? "").trim();
    if (imageUrl.length === 0) {
      throw new Error("image_url_required");
    }

    const supabase = createServerClient();
    if (!supabase) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[StrainSpotter] saveScanHistory: Supabase client unavailable");
      }
      return;
    }

    // Prefer durable URL: upload data URL to storage when not already durable
    if (!isDurableUrl(imageUrl)) {
      try {
        const durableUrl = await uploadScanImageToStorage(supabase, imageUrl);
        if (durableUrl) imageUrl = durableUrl;
      } catch (uploadErr) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[StrainSpotter] saveScanHistory: storage upload failed, using original URL", uploadErr);
        }
      }
    }

    const now = new Date().toISOString();
    const gardenId = await getPublicGardenId(supabase);

    // Backend path: update existing scan so it appears in Log Book (garden_id filter)
    if (scan.existing_scan_id && typeof scan.existing_scan_id === "string" && scan.existing_scan_id.length > 0) {
      const { data: existing, error: fetchErr } = await supabase
        .from("scans")
        .select("id, garden_id")
        .eq("id", scan.existing_scan_id)
        .maybeSingle();

      if (process.env.NODE_ENV === "development") {
        console.log("[StrainSpotter] saveScanHistory: existing_scan_id", scan.existing_scan_id, "found:", !!existing, "fetchErr:", fetchErr?.message ?? null);
      }

      if (existing) {
        const hasGarden = !!existing.garden_id;
        const updatePayload: Record<string, unknown> = {
          garden_id: gardenId,
          status: "done",
          processed_at: now,
          result_payload: payload,
          image_url: imageUrl,
        };
        if (scan.vision_payload != null) updatePayload.vision_payload = scan.vision_payload;
        if (scan.model_version != null) updatePayload.model_version = scan.model_version;
        if (scan.matched_strain_slug != null) updatePayload.matched_strain_slug = scan.matched_strain_slug;

        const { error: updateErr } = await supabase
          .from("scans")
          .update(updatePayload)
          .eq("id", scan.existing_scan_id);

        if (updateErr) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[StrainSpotter] saveScanHistory: update failed", updateErr);
          }
          throw updateErr;
        }
        createCandidateReferenceIfEligible({ result_payload: payload, image_url: imageUrl }).catch(() => {});
        if (process.env.NODE_ENV === "development") {
          console.log("[StrainSpotter] History save OK (updated existing scan for Log Book)");
        }
        return;
      }
    }

    // Local path: insert new row
    const insertPayload = {
      user_id: null,
      garden_id: gardenId,
      image_url: imageUrl,
      result_payload: payload,
      status: "done",
      processed_at: now,
      ...(scan.vision_payload != null && { vision_payload: scan.vision_payload }),
      ...(scan.model_version != null && { model_version: scan.model_version }),
      ...(scan.matched_strain_slug != null && { matched_strain_slug: scan.matched_strain_slug }),
    };
    if (process.env.NODE_ENV === "development") {
      console.log("[StrainSpotter] saveScanHistory: inserting", { hasPayload: !!payload, hasImage: !!imageUrl });
    }

    const { error: insertErr } = await supabase.from("scans").insert(insertPayload);
    if (insertErr) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[StrainSpotter] saveScanHistory: insert error", insertErr);
      }
      throw insertErr;
    }

    createCandidateReferenceIfEligible({ result_payload: payload, image_url: imageUrl }).catch(() => {});
    if (process.env.NODE_ENV === "development") {
      console.log("[StrainSpotter] History save OK");
    }
  } catch (err) {
    console.warn("[StrainSpotter] Scan history save failed:", err);
    throw err; // Propagate so caller can show user-facing notice
  }
}
