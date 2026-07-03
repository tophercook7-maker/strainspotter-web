// app/api/community/moderate/route.ts — moderator tools for group chat.
//
// POST { threadId, action, messageId?, userId?, minutes? }
//   hide    { messageId }          — hide a message from the group
//   unhide  { messageId }
//   mute    { userId, minutes? }   — user can read but not post (default 24h)
//   unmute  { userId }
//   remove  { userId }             — remove from the group (they can rejoin;
//                                    pair with mute for a cooling-off ban)
//
// Caller must be a moderator of THAT thread, or the app owner. Moderators
// can never target other moderators or the owner — only the owner can.

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid } from "@/lib/b2b/server";
import { canModerate, getParticipant, isOwnerUser } from "@/lib/chat/server";
import { logger } from "@/lib/observability/log";

const ACTIONS = ["hide", "unhide", "mute", "unmute", "remove"] as const;
const DEFAULT_MUTE_MINUTES = 24 * 60;
const MAX_MUTE_MINUTES = 30 * 24 * 60;

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/community/moderate" });
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const action = body.action as (typeof ACTIONS)[number];
  if (!isUuid(body.threadId) || !ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `threadId (uuid) and action (${ACTIONS.join("|")}) are required` },
      { status: 400 }
    );
  }

  try {
    if (!(await canModerate(body.threadId, gate.userId))) {
      return NextResponse.json({ error: "Moderators only." }, { status: 403 });
    }
    const admin = getSupabaseAdmin();

    // ── Message actions ──
    if (action === "hide" || action === "unhide") {
      if (!isUuid(body.messageId)) {
        return NextResponse.json({ error: "messageId (uuid) is required" }, { status: 400 });
      }
      const { error } = await admin
        .from("chat_messages")
        .update({ hidden: action === "hide" })
        .eq("id", body.messageId)
        .eq("thread_id", body.threadId);
      if (error) throw new Error(error.message);
      log.info("community_moderate", { action, message: body.messageId, by: gate.userId });
      return NextResponse.json({ ok: true });
    }

    // ── User actions ──
    if (!isUuid(body.userId)) {
      return NextResponse.json({ error: "userId (uuid) is required" }, { status: 400 });
    }
    if (body.userId === gate.userId) {
      return NextResponse.json({ error: "You can't moderate yourself." }, { status: 400 });
    }
    // Moderators are protected from each other; only the owner may act on them.
    const target = await getParticipant(body.threadId, body.userId);
    if (!target) {
      return NextResponse.json({ error: "That user isn't in this group." }, { status: 404 });
    }
    if ((target.role === "moderator" || (await isOwnerUser(body.userId))) && !(await isOwnerUser(gate.userId))) {
      return NextResponse.json({ error: "Only the owner can moderate a moderator." }, { status: 403 });
    }

    if (action === "mute" || action === "unmute") {
      const minutes =
        action === "unmute"
          ? 0
          : Math.max(1, Math.min(MAX_MUTE_MINUTES, typeof body.minutes === "number" ? Math.round(body.minutes) : DEFAULT_MUTE_MINUTES));
      const mutedUntil = action === "unmute" ? null : new Date(Date.now() + minutes * 60_000).toISOString();
      const { error } = await admin
        .from("chat_participants")
        .update({ muted_until: mutedUntil })
        .eq("thread_id", body.threadId)
        .eq("user_id", body.userId);
      if (error) throw new Error(error.message);
      log.info("community_moderate", { action, target: body.userId, minutes, by: gate.userId });
      return NextResponse.json({ ok: true, mutedUntil });
    }

    // remove
    const { error } = await admin
      .from("chat_participants")
      .delete()
      .eq("thread_id", body.threadId)
      .eq("user_id", body.userId);
    if (error) throw new Error(error.message);
    log.info("community_moderate", { action: "remove", target: body.userId, by: gate.userId });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Moderation action failed" }, { status: 500 });
  }
}
