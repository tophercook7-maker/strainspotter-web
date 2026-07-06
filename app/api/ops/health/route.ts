// app/api/ops/health/route.ts — the Medic's stethoscope.
//
// GET with `x-ops-token` → deep internal health checks, each mapped to a
// failure class in docs/ops-runbook.md. Unlike /api/ops/report (business
// numbers), this answers "is the machinery itself sound?"

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 30;

interface Check {
  name: string;
  ok: boolean;
  detail: string;
  runbook?: string; // section id in docs/ops-runbook.md
}

export async function GET(req: NextRequest) {
  const token = process.env.OPS_REPORT_TOKEN;
  if (!token || req.headers.get("x-ops-token") !== token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const checks: Check[] = [];
  const sb = getSupabaseAdmin();

  // 1. Database + PostgREST reachable, profiles readable (RLS-recursion canary:
  //    this exact read is what 500'd app-wide during the is_moderator incident).
  try {
    const { error } = await sb.from("profiles").select("id", { count: "exact", head: true });
    checks.push({
      name: "db_profiles_read",
      ok: !error,
      detail: error ? error.message : "profiles readable",
      runbook: error?.message.includes("stack depth") ? "rls-recursion" : "db-unreachable",
    });
  } catch (e) {
    checks.push({ name: "db_profiles_read", ok: false, detail: String(e), runbook: "db-unreachable" });
  }

  // 2. Quota machinery: consume_scan + refund_scan functions exist and the
  //    columns they touch are present (phantom-column class).
  try {
    const { data, error } = await sb.rpc("consume_scan", {
      p_user_id: "00000000-0000-0000-0000-000000000000", // nonexistent user → clean refusal
    });
    const refusal = (data as { allowed?: boolean; reason?: string } | null);
    const healthy = !error && refusal?.allowed === false;
    checks.push({
      name: "quota_functions",
      ok: healthy,
      detail: error ? error.message : `consume_scan responds (reason: ${refusal?.reason ?? "?"})`,
      runbook: error?.message.includes("does not exist") ? "phantom-column" : "quota-machinery",
    });
  } catch (e) {
    checks.push({ name: "quota_functions", ok: false, detail: String(e), runbook: "quota-machinery" });
  }

  // 3. Chat schema: the thread columns exist (the 42703 chat outage class).
  try {
    const { error } = await sb
      .from("chat_messages")
      .select("thread_id, sender_id, hidden", { head: true })
      .limit(1);
    checks.push({
      name: "chat_thread_columns",
      ok: !error,
      detail: error ? error.message : "thread columns present",
      runbook: "phantom-column",
    });
  } catch (e) {
    checks.push({ name: "chat_thread_columns", ok: false, detail: String(e), runbook: "phantom-column" });
  }

  // 4. OpenAI key valid (dead-key class). Models list is free.
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
      signal: AbortSignal.timeout(10000),
    });
    checks.push({
      name: "openai_key",
      ok: res.ok,
      detail: res.ok ? "key valid" : `openai ${res.status} — scans will fail`,
      runbook: "dead-api-key",
    });
  } catch (e) {
    checks.push({ name: "openai_key", ok: false, detail: String(e), runbook: "dead-api-key" });
  }

  // 5. Overpass (dispensary finder's upstream) — external-rejection class.
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: "[out:json];node(1);out;",
      headers: {
        "Content-Type": "text/plain",
        "User-Agent": "StrainSpotter/1.0 (+https://strainspotter.app)",
      },
      signal: AbortSignal.timeout(10000),
    });
    checks.push({
      name: "overpass_upstream",
      ok: res.ok,
      detail: res.ok ? "responding" : `HTTP ${res.status} (finder falls back to mirror/local list)`,
      runbook: "external-rejection",
    });
  } catch (e) {
    checks.push({ name: "overpass_upstream", ok: false, detail: "timeout/unreachable (mirror fallback covers)", runbook: "external-rejection" });
  }

  // 6. Stripe webhook freshness — money-pipe canary (only meaningful once
  //    there's regular volume; report, don't fail on it).
  try {
    const { data } = await sb
      .from("stripe_webhook_events")
      .select("processed_at")
      .order("processed_at", { ascending: false })
      .limit(1);
    checks.push({
      name: "stripe_webhook_last_event",
      ok: true,
      detail: data?.[0]?.processed_at ? `last event ${data[0].processed_at}` : "no events yet",
      runbook: "money-pipe",
    });
  } catch (e) {
    checks.push({ name: "stripe_webhook_last_event", ok: false, detail: String(e), runbook: "money-pipe" });
  }

  const failing = checks.filter((c) => !c.ok);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    healthy: failing.length === 0,
    failingCount: failing.length,
    checks,
  });
}
