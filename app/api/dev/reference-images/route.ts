/**
 * Dev-only: inspect strain_reference_images (candidates and approved).
 * Returns 404 in production.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@/app/_server/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const supabase = createServerClient();

    const [candidatesRes, approvedRes] = await Promise.all([
      supabase
        .from("strain_reference_images")
        .select("id, strain_slug, image_url, match_confidence, approved, approval_status, created_at")
        .eq("approval_status", "candidate")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("strain_reference_images")
        .select("id, strain_slug, image_url, match_confidence, approved, approval_status, created_at")
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const candidates = candidatesRes.data ?? [];
    const approved = approvedRes.data ?? [];

    return NextResponse.json({
      candidates: { count: candidates.length, rows: candidates },
      approved: { count: approved.length, rows: approved },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
