import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

import "server-only";
export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();



    if (!user)

      return NextResponse.json({ ok: false, error: "not_signed_in" });



    const { data, error } = await supabase

      .from("profiles")

      .select("doctor_credits")

      .eq("user_id", user.id)

      .single();



    if (error)

      return NextResponse.json({ ok: false, error: "not_found", credits: 0 });



    return NextResponse.json({

      ok: true,

      credits: data.doctor_credits ?? 0,

    });

  } catch (error: any) {

    return NextResponse.json(

      { ok: false, error: error?.message || "Internal server error", credits: 0 },

      { status: 500 }

    );

  }

}

