import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const growId = searchParams.get("grow_id");
    const limit = parseInt(searchParams.get("limit") || "40", 10);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!growId) {
      return NextResponse.json({ error: "grow_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("measurements")
      .select("*")
      .eq("grow_id", growId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ measurements: data || [] });
  } catch (err: any) {
    console.error("[measurements] GET error", err);
    return NextResponse.json({ error: err.message || "failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const body = await req.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { grow_id, type, value, unit } = body;
    if (!grow_id || !type || value === undefined || value === null) {
      return NextResponse.json({ error: "grow_id, type, value required" }, { status: 400 });
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return NextResponse.json({ error: "value must be numeric" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("measurements")
      .insert({
        grow_id,
        user_id: user.id,
        type,
        value: numericValue,
        unit: unit || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ measurement: data });
  } catch (err: any) {
    console.error("[measurements] POST error", err);
    return NextResponse.json({ error: err.message || "failed" }, { status: 500 });
  }
}

