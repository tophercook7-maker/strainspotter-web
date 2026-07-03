// app/api/b2b/messages/route.ts — read/send messages in a connection chat.
//
// GET  ?threadId=<uuid>&after=<ISO timestamp, optional>
// POST { threadId, content }
// Participant-only, enforced in code (service-role client). The client polls
// GET with `after` for near-real-time updates; Supabase Realtime can replace
// polling later without changing this contract.

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/observability/rateLimit";
import { isThreadParticipant, isUuid, cleanText } from "@/lib/b2b/server";

export async function GET(req: NextRequest) {
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");
  const after = searchParams.get("after");
  if (!isUuid(threadId)) {
    return NextResponse.json({ error: "threadId (uuid) is required" }, { status: 400 });
  }

  try {
    if (!(await isThreadParticipant(threadId, gate.userId))) {
      return NextResponse.json({ error: "Not a participant of this chat." }, { status: 403 });
    }

    let query = getSupabaseAdmin()
      .from("chat_messages")
      .select("id, sender_id, sender_type, content, created_at")
      .eq("thread_id", threadId)
      .eq("hidden", false)
      .order("created_at", { ascending: true })
      .limit(200);
    if (after) query = query.gt("created_at", after);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({
      messages: (data ?? []).map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        senderType: m.sender_type,
        content: m.content,
        createdAt: m.created_at,
        mine: m.sender_id === gate.userId,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  const rl = await checkRateLimit(gate.userId, 30, 60, "b2b-msg:1m");
  if (rl.ok === false) {
    return NextResponse.json(
      { error: "Slow down a moment.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const content = cleanText(body.content, 2000);
  if (!isUuid(body.threadId) || !content) {
    return NextResponse.json({ error: "threadId (uuid) and content are required" }, { status: 400 });
  }

  try {
    if (!(await isThreadParticipant(body.threadId, gate.userId))) {
      return NextResponse.json({ error: "Not a participant of this chat." }, { status: 403 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("chat_messages")
      .insert({
        thread_id: body.threadId,
        sender_id: gate.userId,
        sender_type: "user",
        content,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, id: data.id, createdAt: data.created_at });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
