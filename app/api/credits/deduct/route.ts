import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount = 1 } = body;

    const supabase = await createSupabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "not_signed_in" });
    }

    // Get current credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("scan_credits")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ ok: false, error: "profile_not_found" });
    }

    const currentCredits = profile.scan_credits ?? 0;

    if (currentCredits < amount) {
      return NextResponse.json({
        ok: false,
        error: "insufficient_credits",
        credits: currentCredits,
      });
    }

    // Deduct credits
    const { error } = await supabase
      .from("profiles")
      .update({
        scan_credits: currentCredits - amount,
      })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ ok: false, error: "update_failed" });
    }

    return NextResponse.json({
      ok: true,
      credits: currentCredits - amount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

