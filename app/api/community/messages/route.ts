// app/api/community/messages/route.ts — group chat read/send.
//
// GET  ?threadId=<uuid>&after=<ISO> — joined members only. Messages come with
//      sender display names + moderator badges; hidden messages are excluded.
// POST { threadId, content } — joined + not muted + passes the no-sales guard.

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/observability/rateLimit";
import { isUuid, cleanText } from "@/lib/b2b/server";
import { getParticipant, isMuted, canModerate } from "@/lib/chat/server";
import { checkNoSales, NO_SALES_MESSAGE } from "@/lib/chat/salesGuard";
import { logger } from "@/lib/observability/log";

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
    const me = await getParticipant(threadId, gate.userId);
    if (!me) {
      return NextResponse.json({ error: "Join the group to read it.", code: "not_joined" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    let query = admin
      .from("chat_messages")
      .select("id, sender_id, sender_type, content, created_at")
      .eq("thread_id", threadId)
      .eq("hidden", false)
      .order("created_at", { ascending: true })
      .limit(200);
    if (after) query = query.gt("created_at", after);
    const { data: msgs, error } = await query;
    if (error) throw new Error(error.message);

    // Sender names + moderator badges in one pass.
    const senderIds = [...new Set((msgs ?? []).map((m) => m.sender_id).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (senderIds.length) {
      const { data: profs } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", senderIds);
      for (const p of profs ?? []) names.set(p.id, (p.display_name as string) || "Grower");
    }
    const { data: mods } = await admin
      .from("chat_participants")
      .select("user_id")
      .eq("thread_id", threadId)
      .eq("role", "moderator");
    const modSet = new Set((mods ?? []).map((m) => m.user_id));

    return NextResponse.json({
      canModerate: me.role === "moderator" ? true : await canModerate(threadId, gate.userId),
      muted: isMuted(me),
      messages: (msgs ?? []).map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_type === "system" ? "StrainSpotter" : names.get(m.sender_id ?? "") ?? "Grower",
        isModerator: modSet.has(m.sender_id ?? ""),
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
  const log = logger.child({ route: "/api/community/messages" });
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  const rl = await checkRateLimit(gate.userId, 20, 60, "community-msg:1m");
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
    const me = await getParticipant(body.threadId, gate.userId);
    if (!me) {
      return NextResponse.json({ error: "Join the group to post.", code: "not_joined" }, { status: 403 });
    }
    if (isMuted(me)) {
      return NextResponse.json(
        { error: "You're muted in this group for now — you can still read along.", code: "muted" },
        { status: 403 }
      );
    }

    const guard = checkNoSales(content);
    if (guard.blocked) {
      log.warn("community_msg_blocked_sales", { user: gate.userId, thread: body.threadId, rule: guard.reason });
      return NextResponse.json({ error: NO_SALES_MESSAGE, code: "no_sales" }, { status: 422 });
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
