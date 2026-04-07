import { NextResponse } from "next/server";
import { getFeedbackIdentity, setFeedbackThreadCookie, supabaseAdmin } from "../_helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = supabaseAdmin();
    const { userId, threadIdFromCookie } = await getFeedbackIdentity();

    // Find or create a thread:
    let threadId: string | null = threadIdFromCookie;

    if (!threadId) {
      const { data: created, error: createErr } = await supabase
        .from("feedback_threads")
        .insert({ user_id: userId })
        .select("id")
        .single();

      if (createErr || !created?.id) {
        return NextResponse.json({ error: "thread_create_failed" }, { status: 500 });
      }

      threadId = created.id;
      await setFeedbackThreadCookie(threadId);
    }

    const { data: messages, error } = await supabase
      .from("feedback_messages")
      .select("id, role, message, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) return NextResponse.json({ error: "read_failed" }, { status: 500 });

    return NextResponse.json({ ok: true, threadId, messages: messages ?? [] });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
