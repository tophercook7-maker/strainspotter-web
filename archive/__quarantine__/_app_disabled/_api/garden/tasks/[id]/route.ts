import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

import "server-only";
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServer();
    const { id } = await params;
    const body = await req.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { status } = body;

    const { data, error } = await supabase
      .from("garden_tasks")
      .update({ status: status || "done" })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ task: data });
  } catch (err: any) {
    console.error("PATCH GARDEN TASK ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
