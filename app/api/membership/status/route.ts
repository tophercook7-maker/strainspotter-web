import "server-only";
// app/api/membership/status/route.ts

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

export async function GET() {
  try {
    const supabase = await getAuthenticatedSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ tier: 0 });
    }

    const userId = user.id;

    // Fetch membership row
    const { data, error } = await supabase
      .from("memberships")
      .select("tier, scans_left, doctor_left")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ tier: 0 });
    }

    return NextResponse.json({
      tier: data.tier ?? 0,
      scans_left: data.scans_left ?? 0,
      doctor_left: data.doctor_left ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { tier: 0, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

