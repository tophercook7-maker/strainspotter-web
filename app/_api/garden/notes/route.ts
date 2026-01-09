import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("grow_notes")
      .select("id, content, created_at")
      .eq("user_id", user.id)
      .eq("source", "personal")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ notes: data || [] });
  } catch (err: any) {
    console.error("[notes] GET error", err);
    return NextResponse.json({ error: err.message || "failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const body = await req.json();
    const { content } = body;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }

    const payload = {
      user_id: user.id,
      content: content.trim(),
      source: "personal",
    };

    const { data, error } = await supabase.from("grow_notes").insert(payload).select().single();
    if (error) throw error;

    return NextResponse.json({ note: data });
  } catch (err: any) {
    console.error("[notes] POST error", err);
    return NextResponse.json({ error: err.message || "failed" }, { status: 500 });
  }
}
