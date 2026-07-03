// app/api/admin/moderator/route.ts — approve or remove a group moderator.
//
// POST { profileId, action: "approve" | "remove", bonusScans? }
// approve: marks the business profile moderator_active, promotes the user to
//   role='moderator' on ALL seeded system group threads, and grants a small
//   one-time scan bonus (default 10 — "a few extra scans, not many to start").
// remove: demotes their group participant rows back to member and clears the
//   active flag (no scan clawback — goodwill).

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/ownerGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isUuid } from "@/lib/b2b/server";
import { logger } from "@/lib/observability/log";

const DEFAULT_BONUS_SCANS = 10;
const MAX_BONUS_SCANS = 100;

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "/api/admin/moderator" });
  const gate = await requireOwner(req);
  if (gate.ok === false) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const action = body.action;
  if (!isUuid(body.profileId) || !["approve", "remove"].includes(action as string)) {
    return NextResponse.json(
      { error: "profileId (uuid) and action (approve|remove) are required" },
      { status: 400 }
    );
  }

  try {
    const admin = getSupabaseAdmin();

    const { data: profile, error: profErr } = await admin
      .from("business_profiles")
      .select("id, user_id, business_name, moderator_active")
      .eq("id", body.profileId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { data: groups, error: groupErr } = await admin
      .from("chat_threads")
      .select("id")
      .eq("type", "group")
      .eq("system_group", true);
    if (groupErr) throw new Error(groupErr.message);
    const groupIds = (groups ?? []).map((g) => g.id);

    if (action === "approve") {
      // Promote across all system groups (upsert handles both "not in group
      // yet" and "already a member").
      if (groupIds.length) {
        const { error: upErr } = await admin.from("chat_participants").upsert(
          groupIds.map((threadId) => ({
            thread_id: threadId,
            user_id: profile.user_id,
            role: "moderator",
          })),
          { onConflict: "thread_id,user_id" }
        );
        if (upErr) throw new Error(`participant upsert failed: ${upErr.message}`);
      }

      // One-time scan bonus — only on first approval, never on re-approve.
      let bonusGranted = 0;
      if (!profile.moderator_active) {
        const raw = typeof body.bonusScans === "number" ? Math.round(body.bonusScans) : DEFAULT_BONUS_SCANS;
        bonusGranted = Math.max(0, Math.min(MAX_BONUS_SCANS, raw));
        if (bonusGranted > 0) {
          const { data: prof, error: readErr } = await admin
            .from("profiles")
            .select("id_scan_topups_remaining")
            .eq("id", profile.user_id)
            .maybeSingle();
          if (readErr) throw new Error(readErr.message);
          const current = (prof?.id_scan_topups_remaining as number) ?? 0;
          const { error: grantErr } = await admin
            .from("profiles")
            .update({ id_scan_topups_remaining: current + bonusGranted })
            .eq("id", profile.user_id);
          if (grantErr) throw new Error(`scan bonus failed: ${grantErr.message}`);
        }
      }

      const { error: flagErr } = await admin
        .from("business_profiles")
        .update({ moderator_active: true, moderator_approved_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (flagErr) throw new Error(flagErr.message);

      log.info("admin_moderator_approved", { profile: profile.id, bonusGranted });
      return NextResponse.json({ ok: true, bonusGranted, groups: groupIds.length });
    }

    // remove
    if (groupIds.length) {
      const { error: demErr } = await admin
        .from("chat_participants")
        .update({ role: "member" })
        .eq("user_id", profile.user_id)
        .eq("role", "moderator")
        .in("thread_id", groupIds);
      if (demErr) throw new Error(`demote failed: ${demErr.message}`);
    }
    const { error: offErr } = await admin
      .from("business_profiles")
      .update({ moderator_active: false })
      .eq("id", profile.id);
    if (offErr) throw new Error(offErr.message);

    log.info("admin_moderator_removed", { profile: profile.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error("admin_moderator_error", { err: String(e) });
    return NextResponse.json({ error: "Moderator action failed" }, { status: 500 });
  }
}
