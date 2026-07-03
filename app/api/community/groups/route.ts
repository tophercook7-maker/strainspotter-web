// app/api/community/groups/route.ts — the community groups list + join/leave.
//
// GET  — the seeded system groups with member counts, my membership + role.
// POST { threadId, action: "join" | "leave" }
// Subscribers only (same gate as scanning — community is a member perk).

import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth/serverGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid } from "@/lib/b2b/server";
import { isSystemGroup } from "@/lib/chat/server";

export async function GET(req: NextRequest) {
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  try {
    const admin = getSupabaseAdmin();
    const [groupsRes, partsRes] = await Promise.all([
      admin
        .from("chat_threads")
        .select("id, name")
        .eq("type", "group")
        .eq("system_group", true)
        .order("id"),
      admin.from("chat_participants").select("thread_id, user_id, role"),
    ]);
    if (groupsRes.error) throw new Error(groupsRes.error.message);
    if (partsRes.error) throw new Error(partsRes.error.message);

    const parts = partsRes.data ?? [];
    const groups = (groupsRes.data ?? []).map((g) => {
      const members = parts.filter((p) => p.thread_id === g.id);
      const mine = members.find((p) => p.user_id === gate.userId);
      return {
        threadId: g.id,
        name: g.name,
        memberCount: members.length,
        moderatorCount: members.filter((p) => p.role === "moderator").length,
        joined: Boolean(mine),
        myRole: mine?.role ?? null,
      };
    });
    return NextResponse.json({ groups });
  } catch {
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireSubscription(req);
  if (gate.ok === false) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const action = body.action;
  if (!isUuid(body.threadId) || !["join", "leave"].includes(action as string)) {
    return NextResponse.json(
      { error: "threadId (uuid) and action (join|leave) are required" },
      { status: 400 }
    );
  }

  try {
    if (!(await isSystemGroup(body.threadId))) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }
    const admin = getSupabaseAdmin();

    if (action === "join") {
      // Upsert so rejoin is idempotent — but never downgrade a moderator.
      const { data: existing } = await admin
        .from("chat_participants")
        .select("id")
        .eq("thread_id", body.threadId)
        .eq("user_id", gate.userId)
        .maybeSingle();
      if (!existing) {
        const { error } = await admin
          .from("chat_participants")
          .insert({ thread_id: body.threadId, user_id: gate.userId, role: "member" });
        if (error) throw new Error(error.message);
      }
      return NextResponse.json({ ok: true, joined: true });
    }

    const { error } = await admin
      .from("chat_participants")
      .delete()
      .eq("thread_id", body.threadId)
      .eq("user_id", gate.userId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, joined: false });
  } catch {
    return NextResponse.json({ error: "Group action failed" }, { status: 500 });
  }
}
