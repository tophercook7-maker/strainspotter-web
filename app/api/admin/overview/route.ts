// app/api/admin/overview/route.ts — the owner dashboard payload.
//
// One call returns: business counts by role, pending license verifications,
// the MODERATOR BOX (per-group moderator counts + names), pending volunteer
// list, and feedback status counts.

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/ownerGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const gate = await requireOwner(req);
  if (gate.ok === false) return gate.response;

  try {
    const admin = getSupabaseAdmin();

    const [profilesRes, groupsRes, modsRes, feedbackRes, reportsRes] = await Promise.all([
      admin
        .from("business_profiles")
        .select("id, user_id, role, business_name, region, license_number, verified, directory_opt_in, moderator_volunteer, moderator_active, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      admin
        .from("chat_threads")
        .select("id, name")
        .eq("type", "group")
        .eq("system_group", true),
      admin
        .from("chat_participants")
        .select("thread_id, user_id, role")
        .eq("role", "moderator"),
      admin.from("feedback").select("status"),
      admin
        .from("chat_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
    ]);

    for (const r of [profilesRes, groupsRes, modsRes, feedbackRes]) {
      if (r.error) throw new Error(r.error.message);
    }

    const profiles = profilesRes.data ?? [];
    const byUserId = new Map(profiles.map((p) => [p.user_id, p]));

    // Moderator box: per-group counts + who.
    const groups = (groupsRes.data ?? []).map((g) => {
      const mods = (modsRes.data ?? []).filter((m) => m.thread_id === g.id);
      return {
        threadId: g.id,
        name: g.name,
        moderatorCount: mods.length,
        moderators: mods.map((m) => ({
          userId: m.user_id,
          businessName: byUserId.get(m.user_id)?.business_name ?? null,
          role: byUserId.get(m.user_id)?.role ?? null,
        })),
      };
    });

    const roleCounts: Record<string, number> = {};
    for (const p of profiles) {
      const r = (p.role as string) ?? "unset";
      roleCounts[r] = (roleCounts[r] ?? 0) + 1;
    }

    const feedbackCounts: Record<string, number> = { new: 0, replied: 0, closed: 0 };
    for (const f of feedbackRes.data ?? []) {
      feedbackCounts[f.status as string] = (feedbackCounts[f.status as string] ?? 0) + 1;
    }

    return NextResponse.json({
      businesses: {
        total: profiles.length,
        byRole: roleCounts,
        verified: profiles.filter((p) => p.verified).length,
        directoryOptIn: profiles.filter((p) => p.directory_opt_in).length,
      },
      pendingVerifications: profiles.filter((p) => p.license_number && !p.verified),
      volunteers: {
        pending: profiles.filter((p) => p.moderator_volunteer && !p.moderator_active),
        active: profiles.filter((p) => p.moderator_active),
      },
      moderatorBox: groups,
      feedbackCounts,
      openReports: reportsRes.count ?? 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Overview failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
