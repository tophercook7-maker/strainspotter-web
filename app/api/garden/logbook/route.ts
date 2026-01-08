import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const garden_id = searchParams.get("garden_id");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!garden_id) {
      return NextResponse.json({ error: "garden_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("garden_logbook_entries")
      .select("*")
      .eq("garden_id", garden_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ entries: data || [] });
  } catch (err: any) {
    console.error("GET GARDEN LOGBOOK ERROR:", err);
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

    const { garden_id, entry_type, text, related_plant_id, label } = body;

    if (!garden_id || !entry_type || !text) {
      return NextResponse.json(
        { error: "garden_id, entry_type, and text required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("garden_logbook_entries")
      .insert({
        garden_id,
        user_id: user.id,
        entry_type,
        text: text.trim(),
        label: label?.trim() || null,
        related_plant_id: related_plant_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ entry: data });
  } catch (err: any) {
    console.error("POST GARDEN LOGBOOK ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
