// app/api/founder/remaining/route.ts
//
// "Founder Lifetime — first 1,000 only" scarcity counter (informational).
// Drives the paywall badge copy ("Only 432 left"). The cap is ENFORCED at
// purchase time in /api/stripe/checkout via isFounderSoldOut() — this endpoint
// is just the display number, so a 60s cache is fine.
//
// Public endpoint — no auth required.

import { NextRequest, NextResponse } from "next/server";
import { FOUNDER_CAP, countFoundersSold, founderRemaining } from "@/lib/billing/founder";

export const runtime = "edge";

let cachedAt = 0;
let cachedRemaining: number | null = null;
const CACHE_TTL_MS = 60_000;

export async function GET(_req: NextRequest) {
  if (cachedRemaining !== null && Date.now() - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      ok: true,
      cap: FOUNDER_CAP,
      remaining: cachedRemaining,
      sold: FOUNDER_CAP - cachedRemaining,
      cached: true,
    });
  }

  try {
    const sold = await countFoundersSold();
    const remaining = founderRemaining(sold);
    cachedAt = Date.now();
    cachedRemaining = remaining;
    return NextResponse.json({ ok: true, cap: FOUNDER_CAP, remaining, sold, cached: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = /not configured/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: "Founder count error", detail: message }, { status });
  }
}
