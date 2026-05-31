// app/api/founder/remaining/route.ts
//
// "Founder Lifetime — first 1,000 only" scarcity counter.
//
// Returns the number of founder slots remaining. The number drives the
// paywall badge copy ("Only 432 left") and lets us archive the Stripe
// price once we hit the cap.
//
// Public endpoint — no auth required. Cheap, cached, and rate-limited
// by IP to prevent a hostile actor from polling it to map exact
// purchase timing.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** Founder inventory cap. Hard-coded — the marketing promise is "first 1,000". */
const FOUNDER_CAP = 1000;

/** Cache the answer for 60 seconds. The counter doesn't need to be live. */
let cachedAt = 0;
let cachedRemaining: number | null = null;
const CACHE_TTL_MS = 60_000;

export async function GET(_req: NextRequest) {
  // Cache hit — return immediately
  if (cachedRemaining !== null && Date.now() - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      ok: true,
      cap: FOUNDER_CAP,
      remaining: cachedRemaining,
      sold: FOUNDER_CAP - cachedRemaining,
      cached: true,
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    // Count rows where founder_purchase_at is not null. We use a HEAD
    // request with Prefer: count=exact so PostgREST returns the count
    // in the Content-Range header without sending row data.
    const res = await fetch(
      `${supabaseUrl}/rest/v1/profiles?founder_purchase_at=not.is.null&select=id`,
      {
        method: "HEAD",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "count=exact",
          Range: "0-0",
        },
      }
    );

    if (!res.ok && res.status !== 206) {
      return NextResponse.json(
        { error: "Couldn't read founder count." },
        { status: 502 }
      );
    }

    // Content-Range: 0-0/<total> — extract total.
    const cr = res.headers.get("content-range") || "";
    const total = parseInt(cr.split("/")[1] || "0", 10);
    const sold = Number.isFinite(total) ? total : 0;
    const remaining = Math.max(0, FOUNDER_CAP - sold);

    // Update cache
    cachedAt = Date.now();
    cachedRemaining = remaining;

    return NextResponse.json({
      ok: true,
      cap: FOUNDER_CAP,
      remaining,
      sold,
      cached: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Founder count error", detail: message },
      { status: 500 }
    );
  }
}
