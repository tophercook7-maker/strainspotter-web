import { NextRequest, NextResponse } from "next/server";
import { normalizeSlug, requireScannerSupabase } from "@/lib/server/smartScannerLearning";

export const runtime = "nodejs";

type FeedbackPayload = {
  scan_id?: string | null;
  scan_history_id?: string | null;
  matched_strain_slug?: string | null;
  selected_strain_slug?: string | null;
  was_correct?: boolean;
  confidence?: number | null;
  notes?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FeedbackPayload;

    if (typeof body.was_correct !== "boolean") {
      return NextResponse.json(
        { error: "was_correct boolean is required" },
        { status: 400 }
      );
    }

    const confidence = normalizeConfidence(body.confidence);
    const matched = normalizeSlug(body.matched_strain_slug);
    const selected = normalizeSlug(body.selected_strain_slug);
    const supabase = requireScannerSupabase();

    const { error } = await (supabase as any).from("scan_feedback").insert({
      scan_id: normalizeUuid(body.scan_id),
      scan_history_id: normalizeUuid(body.scan_history_id),
      matched_strain_slug: matched,
      selected_strain_slug: selected,
      was_correct: body.was_correct,
      confidence,
      notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : null,
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to save scanner feedback", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isConfigError = message.includes("Missing required Supabase");
    return NextResponse.json(
      { error: isConfigError ? "Supabase is not configured" : "Feedback failed", detail: message },
      { status: isConfigError ? 500 : 500 }
    );
  }
}

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : null;
}

function normalizeConfidence(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}
