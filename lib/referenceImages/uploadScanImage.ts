/**
 * Upload a scan image to Supabase storage and return a durable public URL.
 * Used by the fallback scan path when creating candidate reference images.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "strain-reference-images";

function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

/**
 * Upload image from data URL to storage; return public URL or null on failure.
 * Non-throwing; returns null if bucket missing or upload fails.
 */
export async function uploadScanImageToStorage(
  supabase: SupabaseClient,
  dataUrl: string
): Promise<string | null> {
  try {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) return null;

    const ext = parsed.mime === "image/png" ? "png" : "jpg";
    const path = `candidates/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const buffer = Buffer.from(parsed.base64, "base64");
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: parsed.mime, upsert: false });

    if (error) {
      console.warn("Scan image upload failed:", error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return urlData?.publicUrl ?? null;
  } catch (e) {
    console.warn("Scan image upload error:", e);
    return null;
  }
}

/**
 * Returns true if the URL looks durable (http/https, not a data URL).
 */
export function isDurableUrl(url: string): boolean {
  const t = (url ?? "").trim();
  return t.startsWith("http://") || t.startsWith("https://");
}
