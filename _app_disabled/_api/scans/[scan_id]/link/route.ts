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
    const grow_id = body?.grow_id;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    if (!grow_id) return NextResponse.json({ error: "grow_id required" }, { status: 400 });

    // Ensure scan belongs to user
    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .select("id, user_id")
      .eq("id", scan_id)
      .single();
    if (scanErr || !scan || scan.user_id !== user.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Ensure grow belongs to user
    const { data: grow, error: growErr } = await supabase
      .from("grows")
      .select("id, user_id, strain_name, name")
      .eq("id", grow_id)
      .eq("user_id", user.id)
      .single();
    if (growErr || !grow) {
      return NextResponse.json({ error: "grow_not_found" }, { status: 404 });
    }

    const { error: updateErr } = await supabase
      .from("scans")
      .update({ grow_id })
      .eq("id", scan_id);
    if (updateErr) throw updateErr;

    return NextResponse.json({ grow });
  } catch (err: any) {
    console.error("[scan link] error", err);
    return NextResponse.json({ error: err.message || "failed" }, { status: 500 });
  }
}

