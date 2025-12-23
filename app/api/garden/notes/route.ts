import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/garden/notes
 * Get all notes for the current user
 */
export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const plant_id = searchParams.get("plant_id");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("grow_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (plant_id) {
      query = query.eq("related_plant_id", plant_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ notes: data || [] });
  } catch (err: any) {
    console.error("GET GROW NOTES ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/garden/notes
 * Create a new note
 */
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const body = await req.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { content, related_plant_id, source } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const insertPayload: any = {
      user_id: user.id,
      content: content.trim(),
      source: source || "manual",
      shareable: false, // Not exposed in UI yet
    };

    if (related_plant_id) {
      insertPayload.related_plant_id = related_plant_id;
    }

    const { data, error } = await supabase
      .from("grow_notes")
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ note: data });
  } catch (err: any) {
    console.error("POST GROW NOTES ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
