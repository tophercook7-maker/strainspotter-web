import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, credits: 0, error: "not_signed_in" });
    }

    // Get user's scan credits from profiles table
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("scan_credits")
      .eq("user_id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ ok: false, credits: 0, error: "not_found" });
    }

    return NextResponse.json({
      ok: true,
      credits: profile?.scan_credits ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, credits: 0, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

