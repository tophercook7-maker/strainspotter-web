// app/api/ops/report/route.ts — the Heartbeat's data source.
//
// GET with header `x-ops-token: <OPS_REPORT_TOKEN>` → business-health
// aggregates for the scheduled morning-ops agent. Numbers only, no PII, no
// credentials — a leaked token exposes counts, not data or money. Token is a
// random 48-hex env var, NOT a Supabase/Stripe key.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const token = process.env.OPS_REPORT_TOKEN;
  if (!token || req.headers.get("x-ops-token") !== token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const sb = getSupabaseAdmin();
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const count = async (table: string, mod?: (q: any) => any) => {
      let q = sb.from(table).select("*", { count: "exact", head: true });
      if (mod) q = mod(q);
      const { count: c, error } = await q;
      return error ? -1 : (c ?? 0);
    };

    const [
      usersTotal, usersNew24h, scans24h, scansTotal,
      stripeEvents24h, feedbackNew, reportsOpen,
      businesses, menuItems, connectionsAccepted,
      chatMessages24h, strainsDescribed,
    ] = await Promise.all([
      count("profiles"),
      count("profiles", (q) => q.gte("created_at", dayAgo)),
      count("scans", (q) => q.gte("created_at", dayAgo)),
      count("scans"),
      count("stripe_webhook_events", (q) => q.gte("processed_at", dayAgo)),
      count("feedback", (q) => q.eq("status", "new")),
      count("chat_reports", (q) => q.eq("status", "open")),
      count("business_profiles"),
      count("dispensary_menu_items"),
      count("connection_requests", (q) => q.eq("status", "accepted")),
      count("chat_messages", (q) => q.gte("created_at", dayAgo)),
      count("strains", (q) => q.not("description", "is", null)),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      users: { total: usersTotal, new24h: usersNew24h },
      scans: { last24h: scans24h, total: scansTotal },
      money: { stripeWebhookEvents24h: stripeEvents24h },
      community: {
        feedbackAwaitingReply: feedbackNew,
        chatReportsOpen: reportsOpen,
        chatMessages24h,
      },
      b2b: { businesses, menuItems, connectionsAccepted },
      library: { strainsWithDescriptions: strainsDescribed },
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 }
    );
  }
}
