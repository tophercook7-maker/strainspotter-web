// app/api/health/anon-leak-check/route.ts
//
// Nightly safety net for the bug class that nearly shipped to prod
// undetected: a permissive RLS policy on a sensitive table leaking
// PII to anyone with the public anon key.
//
// Probes a list of "should-be-locked-down" tables using ONLY the
// publishable NEXT_PUBLIC_SUPABASE_ANON_KEY (no Authorization header).
// If any of them returns rows, something regressed — either a migration
// re-introduced a permissive policy, or a column was added that the
// existing policies don't restrict properly.
//
// Runs nightly via Vercel cron (see vercel.json). Also accepts a manual
// hit. Returns 200 + { ok: true, leaks: [] } on success, 500 + the leak
// list on any leak detected. The Vercel cron will retry on failure and
// surface in the project's notification feed.

import { NextResponse } from "next/server";
import { captureAlert } from "@/lib/observability/log";

// Tables that should NEVER return rows to an anonymous caller.
// Adding a new sensitive table? Add it here.
const SENSITIVE_TABLES = [
  "profiles",
  "users",
  "user_profiles",
  "grower_profiles",
  "journals",
  "events",
  "feedback_threads",
  "feedback_messages",
  "documents",
  "items",
  "organizations",
  "grows",
  "logs",
  "comments",
  // scans has a guest-scan flow with row-level guards
  // (user_id IS NULL AND session_id IS NOT NULL); the probe below
  // sets neither, so it should still return 0.
  "scans",
] as const;

interface LeakResult {
  table: string;
  visibleCount: number | null;
  contentRange: string | null;
}

export async function GET(req: Request) {
  // Cron secret check — Vercel cron sends Authorization: Bearer <CRON_SECRET>.
  // If CRON_SECRET is set in env, require it (lets manual probes work
  // with the secret in a header; lets the cron in too).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401 }
      );
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json(
      { error: "supabase env not configured" },
      { status: 503 }
    );
  }

  const leaks: LeakResult[] = [];
  const checked: LeakResult[] = [];

  for (const table of SENSITIVE_TABLES) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/${table}?select=count`,
        {
          headers: {
            apikey: supabaseAnon,
            Prefer: "count=exact",
            // NB: only the anon key, no Authorization header — that's
            // the point. This is the same identity as a random visitor.
          },
        }
      );
      const range = res.headers.get("content-range");
      // PostgREST sets content-range like "*/5". If 401/permission denied
      // (table fully locked), range will be null and we treat that as
      // OK (= 0 rows visible).
      const total = range ? Number(range.split("/")[1]) : 0;
      const row: LeakResult = {
        table,
        visibleCount: Number.isFinite(total) ? total : null,
        contentRange: range,
      };
      checked.push(row);
      if (Number.isFinite(total) && total > 0) {
        leaks.push(row);
      }
    } catch (err) {
      // Network blip — log but don't fail the whole check on one table.
      console.warn(
        `[leak-check] probe ${table} failed:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  if (leaks.length > 0) {
    console.error(
      "[leak-check] RLS REGRESSION — sensitive tables visible to anon:",
      leaks
    );
    // Notify the external alert webhook (Slack/Discord/Zapier) when set.
    // Don't await — alerting must not gate the response. The 500 itself
    // also surfaces in Vercel's cron retry / notification feed as a
    // second redundant signal.
    void captureAlert("anon_leak_detected", {
      leak_count: leaks.length,
      tables: leaks.map((l) => ({
        table: l.table,
        visible: l.visibleCount,
      })),
    });
    return NextResponse.json(
      {
        ok: false,
        leaks,
        message:
          "Sensitive tables are readable by anonymous callers. " +
          "Audit pg_policies for USING(true) policies on these tables.",
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    leaks: [],
    checkedCount: checked.length,
    checkedAt: new Date().toISOString(),
  });
}
