import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServer();
  
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: grows, error: growsErr } = await supabase
    .from("grows")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (growsErr) return NextResponse.json({ error: growsErr }, { status: 400 });

  const ids = (grows ?? []).map(g => g.id);
  const { data: logs, error: logsErr } = await supabase
    .from("grow_logs")
    .select("*")
    .in("grow_id", ids)
    .order("created_at", { ascending: false });

  if (logsErr) return NextResponse.json({ error: logsErr }, { status: 400 });

  return NextResponse.json({ grows: grows ?? [], logs: logs ?? [] });
}
