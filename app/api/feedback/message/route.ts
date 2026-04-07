import { NextResponse } from "next/server";
import { getFeedbackIdentity, setFeedbackThreadCookie, supabaseAdmin } from "../_helpers";

export const dynamic = "force-dynamic";

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const message = asNonEmptyString(body?.message);

    if (!message) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "too_long" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { userId, threadIdFromCookie } = await getFeedbackIdentity();

    // Find or create thread
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

    const { error: insertErr } = await supabase.from("feedback_messages").insert({
      thread_id: threadId,
      user_id: userId,
      role: "user",
      message,
    });

    if (insertErr) return NextResponse.json({ error: "insert_failed" }, { status: 500 });

    return NextResponse.json({ ok: true, threadId });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
