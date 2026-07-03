// app/api/admin/reports/route.ts — the owner's report queue.
//
// GET — open reports grouped per message (report count, reasons, message
//       content + sender + group name) so one glance shows what's burning.
// POST { reportIds?, messageId, action: "hide_resolve" | "resolve" }
//       hide_resolve — hide the message AND resolve all its open reports.
//       resolve      — dismiss the reports, message stays visible.

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/ownerGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid } from "@/lib/b2b/server";
import { logger } from "@/lib/observability/log";

export async function GET(req: NextRequest) {
  const gate = await requireOwner(req);
  if (gate.ok === false) return gate.response;

  try {
    const admin = getSupabaseAdmin();
    const { data: reports, error } = await admin
      .from("chat_reports")
      .select("id, thread_id, message_id, reason, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    if (!reports?.length) return NextResponse.json({ reports: [] });

    const messageIds = [...new Set(reports.map((r) => r.message_id))];
    const threadIds = [...new Set(reports.map((r) => r.thread_id))];

    const [msgsRes, threadsRes] = await Promise.all([
      admin
        .from("chat_messages")
        .select("id, sender_id, content, hidden, created_at")
        .in("id", messageIds),
      admin.from("chat_threads").select("id, name").in("id", threadIds),
    ]);
    if (msgsRes.error) throw new Error(msgsRes.error.message);
    const msgById = new Map((msgsRes.data ?? []).map((m) => [m.id, m]));
    const threadById = new Map((threadsRes.data ?? []).map((t) => [t.id, t]));

    const senderIds = [...new Set((msgsRes.data ?? []).map((m) => m.sender_id).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (senderIds.length) {
      const { data: profs } = await admin.from("profiles").select("id, display_name").in("id", senderIds);
      for (const p of profs ?? []) names.set(p.id, (p.display_name as string) || "Grower");
    }

    // Group per message.
    const grouped = new Map<string, { message: Record<string, unknown>; reports: typeof reports }>();
    for (const r of reports) {
      const g = grouped.get(r.message_id) ?? {
        message: (() => {
          const m = msgById.get(r.message_id);
          return {
            id: r.message_id,
            content: m?.content ?? "(message deleted)",
            hidden: m?.hidden === true,
            senderName: m?.sender_id ? names.get(m.sender_id) ?? "Grower" : "Unknown",
            groupName: threadById.get(r.thread_id)?.name ?? "Group",
            threadId: r.thread_id,
          };
        })(),
        reports: [],
      };
      g.reports.push(r);
      grouped.set(r.message_id, g);
    }

    return NextResponse.json({
      reports: [...grouped.values()].map((g) => ({
        message: g.message,
        reportCount: g.reports.length,
        reasons: g.reports.map((r) => r.reason).filter(Boolean),
        firstReportedAt: g.reports[g.reports.length - 1].created_at,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/admin/reports" });
  const gate = await requireOwner(req);
  if (gate.ok === false) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const action = body.action;
  if (!isUuid(body.messageId) || !["hide_resolve", "resolve"].includes(action as string)) {
    return NextResponse.json(
      { error: "messageId (uuid) and action (hide_resolve|resolve) are required" },
      { status: 400 }
    );
  }

  try {
    const admin = getSupabaseAdmin();
    if (action === "hide_resolve") {
      const { error } = await admin
        .from("chat_messages")
        .update({ hidden: true })
        .eq("id", body.messageId);
      if (error) throw new Error(error.message);
    }
    const { error: repErr } = await admin
      .from("chat_reports")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("message_id", body.messageId)
      .eq("status", "open");
    if (repErr) throw new Error(repErr.message);

    log.info("admin_report_action", { message: body.messageId, action });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Report action failed" }, { status: 500 });
  }
}
