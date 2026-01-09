import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ scan_id: string }> }
) {
  try {
    const supabase = await createSupabaseServer();
    const { scan_id } = await params;
    const body = await req.json();
    const label = (body?.label ?? "").toString().trim();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("scans")
      .select("id, user_id")
      .eq("id", scan_id)
      .single();
    if (fetchError || !existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("scans")
      .update({ label })
      .eq("id", scan_id);

    if (updateError) throw updateError;

    return NextResponse.json({ label });
  } catch (err: any) {
    console.error("[scan label] error", err);
    return NextResponse.json({ error: err.message || "failed" }, { status: 500 });
  }
}

