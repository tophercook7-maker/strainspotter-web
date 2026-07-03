// app/api/admin/feedback/route.ts — owner side of the two-way feedback loop.
//
// GET  ?status=new|replied|closed (optional) — list submissions.
// POST { feedbackId, reply?, status? } — reply to and/or re-status a submission.

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/ownerGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid, cleanText } from "@/lib/b2b/server";

export async function GET(req: NextRequest) {
  const gate = await requireOwner(req);
  if (gate.ok === false) return gate.response;

  const status = new URL(req.url).searchParams.get("status");
  let query = getSupabaseAdmin()
    .from("feedback")
    .select("id, user_id, category, content, status, admin_reply, created_at, replied_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && ["new", "replied", "closed"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Read failed" }, { status: 500 });
  return NextResponse.json({ feedback: data ?? [] });
}

export async function POST(req: NextRequest) {
  const gate = await requireOwner(req);
  if (gate.ok === false) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isUuid(body.feedbackId)) {
    return NextResponse.json({ error: "feedbackId (uuid) is required" }, { status: 400 });
  }
  const reply = cleanText(body.reply, 2000);
  const status =
    typeof body.status === "string" && ["new", "replied", "closed"].includes(body.status)
      ? body.status
      : reply
        ? "replied"
        : undefined;

  const patch: Record<string, unknown> = {};
  if (reply) {
    patch.admin_reply = reply;
    patch.replied_at = new Date().toISOString();
  }
  if (status) patch.status = status;
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update — send reply and/or status" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("feedback")
    .update(patch)
    .eq("id", body.feedbackId);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
