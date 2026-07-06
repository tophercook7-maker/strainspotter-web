// app/api/admin/analytics/route.ts — owner-only funnel metrics from our OWN
// Supabase data (independent of Vercel's plan). Every query is a head-count
// (no rows transferred) and defensively wrapped so one missing table can't
// blank the whole panel.

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/ownerGate";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type Admin = ReturnType<typeof getSupabaseAdmin>;

async function count(
  admin: Admin,
  table: string,
  build?: (q: any) => any
): Promise<number> {
  try {
    let q: any = admin.from(table).select("*", { count: "exact", head: true });
    if (build) q = build(q);
    const { count, error } = await q;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireOwner(req);
  if (gate.ok === false) return gate.response;

  try {
    const admin = getSupabaseAdmin();
    const now = new Date();
    const iso = (daysAgo: number) =>
      new Date(now.getTime() - daysAgo * 86400000).toISOString();

    const MEMBER = ["garden", "standard"];
    const PRO = ["pro", "elite"];
    const PAID = [...MEMBER, ...PRO];

    const [
      accounts,
      accounts30,
      accounts7,
      freeScanUsed,
      memberSubs,
      proSubs,
      scans,
      scans30,
      corrections,
      confirmations,
    ] = await Promise.all([
      count(admin, "profiles"),
      count(admin, "profiles", (q) => q.gte("created_at", iso(30))),
      count(admin, "profiles", (q) => q.gte("created_at", iso(7))),
      count(admin, "profiles", (q) => q.eq("free_scan_used", true)),
      count(admin, "profiles", (q) => q.in("membership", MEMBER)),
      count(admin, "profiles", (q) => q.in("membership", PRO)),
      count(admin, "scans"),
      count(admin, "scans", (q) => q.gte("created_at", iso(30))),
      count(admin, "scan_corrections"),
      count(admin, "scan_feedback"),
    ]);

    const subscribers = memberSubs + proSubs;
    const pct = (n: number, d: number) =>
      d > 0 ? Math.round((n / d) * 1000) / 10 : 0;

    return NextResponse.json({
      funnel: {
        accounts,
        freeScanUsed,
        subscribers,
        // Stage-to-stage conversion (the drop-off view).
        signupToScan: pct(freeScanUsed, accounts),
        scanToPaid: pct(subscribers, freeScanUsed),
        signupToPaid: pct(subscribers, accounts),
      },
      subscribers: { total: subscribers, member: memberSubs, pro: proSubs },
      scans: { total: scans, last30: scans30 },
      flywheel: { corrections, confirmations },
      growth: { accounts, accountsLast30: accounts30, accountsLast7: accounts7 },
      note:
        "Visitor/page-view counts live in Vercel Analytics; these are your first-party account + scan + subscriber numbers.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Analytics failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
