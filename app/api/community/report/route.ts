// app/api/community/report/route.ts — members flag a message for review.
//
// POST { threadId, messageId, reason? } — participant-gated, rate-limited.
// Reports land in the owner's admin console (Reports tab). Duplicate reports
// by the same user are absorbed silently (the reporter just sees "thanks").

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/observability/rateLimit";
import { isUuid, cleanText } from "@/lib/b2b/server";
import { getParticipant } from "@/lib/chat/server";
import { logger } from "@/lib/observability/log";

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/community/report" });
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  const rl = await checkRateLimit(gate.userId, 10, 86400, "chat-report:1d");
  if (rl.ok === false) {
    return NextResponse.json(
      { error: "That's a lot of reports for one day — thanks, we've got it from here.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isUuid(body.threadId) || !isUuid(body.messageId)) {
    return NextResponse.json({ error: "threadId and messageId (uuids) are required" }, { status: 400 });
  }

  try {
    if (!(await getParticipant(body.threadId, gate.userId))) {
      return NextResponse.json({ error: "Join the group first." }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    // Message must belong to the thread (no cross-thread report forgery).
    const { data: msg } = await admin
      .from("chat_messages")
      .select("id")
      .eq("id", body.messageId)
      .eq("thread_id", body.threadId)
      .maybeSingle();
    if (!msg) return NextResponse.json({ error: "Message not found." }, { status: 404 });

    const { error } = await admin.from("chat_reports").insert({
      thread_id: body.threadId,
      message_id: body.messageId,
      reported_by: gate.userId,
      reason: cleanText(body.reason, 500),
    });
    // 23505 = they already reported this message — same friendly outcome.
    if (error && error.code !== "23505") throw new Error(error.message);

    log.info("chat_message_reported", { message: body.messageId, by: gate.userId });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Report failed" }, { status: 500 });
  }
}
