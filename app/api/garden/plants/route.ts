import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const garden_id = searchParams.get("garden_id");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!garden_id) {
      return NextResponse.json({ error: "garden_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("garden_plants")
      .select("*")
      .eq("garden_id", garden_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ plants: data || [] });
  } catch (err: any) {
    console.error("GET GARDEN PLANTS ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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

    const { garden_id, strain_name, stage, started_at, notes } = body;

    if (!garden_id || !strain_name) {
      return NextResponse.json(
        { error: "garden_id and strain_name required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("garden_plants")
      .insert({
        garden_id,
        strain_name,
        stage: stage || "seedling",
        started_at: started_at || new Date().toISOString().split("T")[0],
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ plant: data });
  } catch (err: any) {
    console.error("POST GARDEN PLANT ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
