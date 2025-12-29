import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

import "server-only";
export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // TEMP: Dev logging
    if (process.env.NODE_ENV === "development") {
      console.log("USER:", user);
      console.log("AUTH ERROR:", authError);
    }
    
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error: dbError } = await supabase
      .from("grows")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (dbError) throw dbError;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("GET GROWS ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const body = await req.json();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("API USER:", user?.id);

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Accept both 'name'/'strain' (legacy) and 'strain_name' (current schema)
    const strainName = body.strain_name || body.name || body.strain;
    const startDate = body.start_date || new Date().toISOString().slice(0, 10);
    const stage = body.stage || 'veg';
    
    if (!strainName) {
      return NextResponse.json(
        { error: "missing_fields", details: "strain_name (or name/strain) is required" },
        { status: 400 }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        { error: "missing_fields", details: "start_date is required" },
        { status: 400 }
      );
    }

    const { data, error: dbError } = await supabase
      .from("grows")
      .insert({
        user_id: user.id,
        strain_name: strainName,
        start_date: startDate,
        stage: stage,
      })
      .select("*")
      .single();

    if (dbError) throw dbError;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("CREATE GROW ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
