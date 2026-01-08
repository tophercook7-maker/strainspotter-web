import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const garden_id = searchParams.get("garden_id");
    const status = searchParams.get("status") || "open";

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!garden_id) {
      return NextResponse.json({ error: "garden_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("garden_tasks")
      .select("*")
      .eq("garden_id", garden_id)
      .eq("user_id", user.id)
      .eq("status", status)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tasks: data || [] });
  } catch (err: any) {
    console.error("GET GARDEN TASKS ERROR:", err);
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

    const { garden_id, title, due_at } = body;

    if (!garden_id || !title) {
      return NextResponse.json(
        { error: "garden_id and title required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("garden_tasks")
      .insert({
        garden_id,
        user_id: user.id,
        title: title.trim(),
        due_at: due_at || null,
        status: "open",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ task: data });
  } catch (err: any) {
    console.error("POST GARDEN TASK ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
