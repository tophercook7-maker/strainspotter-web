import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();



    if (!user)

      return NextResponse.json({ ok: false, error: "not_signed_in" });



    // Get current credits

    const { data: profile } = await supabase

      .from("profiles")

      .select("doctor_credits")

      .eq("user_id", user.id)

      .single();



    if (!profile || profile.doctor_credits <= 0)

      return NextResponse.json({

        ok: false,

        error: "no_doctor_credits",

      });



    // Deduct 1 credit

    const { error } = await supabase

      .from("profiles")

      .update({

        doctor_credits: profile.doctor_credits - 1,

      })

      .eq("user_id", user.id);



    if (error)

      return NextResponse.json({

        ok: false,

        error: "update_failed",

      });



    return NextResponse.json({ ok: true });

  } catch (error: any) {

    return NextResponse.json(

      { ok: false, error: error?.message || "Internal server error" },

      { status: 500 }

    );

  }

}

