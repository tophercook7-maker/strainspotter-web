// app/api/membership/decrement/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

async function getAuthenticatedSupabase() {
  const cookieStore = await cookies();
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  const token = cookieStore.get('sb-access-token')?.value;
  
  if (token) {
    supabase.auth.setSession({ access_token: token, refresh_token: '' });
  }
  
  return supabase;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type } = body; // "scan" or "doctor"

    const supabase = await getAuthenticatedSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "not_signed_in" });
    }

    const userId = user.id;

    // Get current membership data
    const { data: membership, error: fetchError } = await supabase
      .from("memberships")
      .select("scans_left, doctor_left")
      .eq("user_id", userId)
      .single();

    if (fetchError || !membership) {
      return NextResponse.json({ ok: false, error: "membership_not_found" });
    }

    // Determine which column to decrement
    const col = type === "doctor" ? "doctor_left" : "scans_left";
    const currentValue = membership[col] ?? 0;

    // Decrement (ensure it doesn't go below 0)
    const newValue = Math.max(currentValue - 1, 0);

    const { error } = await supabase
      .from("memberships")
      .update({ [col]: newValue })
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ ok: false, error: "update_failed" });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

