// app/api/b2b/connect/respond/route.ts — accept / decline / withdraw.
//
// POST { requestId, action: "accept" | "decline" | "withdraw" }
// - accept/decline: recipient only, pending only.
// - withdraw: sender only, pending only.
// On ACCEPT: creates the direct chat thread + both participants and links it
// to the connection — mutual consent immediately opens a business chat.

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBusinessProfile, isUuid } from "@/lib/b2b/server";
import { logger } from "@/lib/observability/log";

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/b2b/connect/respond" });
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const action = body.action;
  if (!isUuid(body.requestId) || !["accept", "decline", "withdraw"].includes(action as string)) {
    return NextResponse.json(
      { error: "requestId (uuid) and action (accept|decline|withdraw) are required" },
      { status: 400 }
    );
  }

  try {
    const me = await getBusinessProfile(gate.userId);
    if (!me) {
      return NextResponse.json(
        { error: "Create a business profile first.", code: "no_business_profile" },
        { status: 403 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: reqRow } = await admin
      .from("connection_requests")
      .select("id, from_profile, to_profile, status, thread_id")
      .eq("id", body.requestId)
      .maybeSingle();
    if (!reqRow) return NextResponse.json({ error: "Request not found." }, { status: 404 });
    if (reqRow.status !== "pending") {
      return NextResponse.json({ error: `Request is already ${reqRow.status}.` }, { status: 409 });
    }

    const isRecipient = reqRow.to_profile === me.id;
    const isSender = reqRow.from_profile === me.id;
    if ((action === "withdraw" && !isSender) || (action !== "withdraw" && !isRecipient)) {
      return NextResponse.json({ error: "Not your request to act on." }, { status: 403 });
    }

    let threadId: string | null = null;

    if (action === "accept") {
      // Look up both sides' user ids for chat participants.
      const { data: sides, error: sidesErr } = await admin
        .from("business_profiles")
        .select("id, user_id")
        .in("id", [reqRow.from_profile, reqRow.to_profile]);
      if (sidesErr || !sides || sides.length !== 2) {
        throw new Error(`profile lookup failed: ${sidesErr?.message ?? "missing side"}`);
      }

      const { data: thread, error: threadErr } = await admin
        .from("chat_threads")
        .insert({ type: "direct", created_by: gate.userId })
        .select("id")
        .single();
      if (threadErr) throw new Error(`thread create failed: ${threadErr.message}`);
      threadId = thread.id;

      const { error: partErr } = await admin.from("chat_participants").insert(
        sides.map((s) => ({ thread_id: threadId, user_id: s.user_id }))
      );
      if (partErr) throw new Error(`participants create failed: ${partErr.message}`);
    }

    const nextStatus =
      action === "accept" ? "accepted" : action === "decline" ? "declined" : "withdrawn";
    const { error: updErr } = await admin
      .from("connection_requests")
      .update({ status: nextStatus, responded_at: new Date().toISOString(), thread_id: threadId })
      .eq("id", reqRow.id)
      .eq("status", "pending"); // guard against a concurrent respond
    if (updErr) throw new Error(`status update failed: ${updErr.message}`);

    log.info("b2b_connect_responded", { request: reqRow.id, action });
    return NextResponse.json({ ok: true, status: nextStatus, threadId });
  } catch (e) {
    log.error("b2b_respond_error", { user: gate.userId, err: String(e) });
    return NextResponse.json({ error: "Failed to respond to request" }, { status: 500 });
  }
}
