// app/api/scan/usage/route.ts
//
// Returns the authenticated user's scan-usage state for the current
// billing period:
//   • tier              — "member" | "pro" | "free"
//   • monthlyCap        — number | null (null = unlimited)
//   • monthlyUsed       — number consumed this period
//   • monthlyRemaining  — convenience: max(0, cap - used)
//   • topupRemaining    — credits from one-time topup packs (no expiry)
//   • totalRemaining    — monthlyRemaining + topupRemaining
//   • approachingLimit  — true when remaining <= 20% of cap
//   • atLimit           — true when totalRemaining <= 0
//
// Used by the in-app upgrade nudge that prompts Member users to switch
// to Pro before they hit the wall. Cheap; should be cached client-side.

import { NextRequest, NextResponse } from "next/server";
import { membershipToTier } from "@/lib/billing/membership";

export const runtime = "edge";

/**
 * Lightweight auth check — accepts both subscribed and unsubscribed
 * users (so this works for both Free→Member upsell and Member→Pro upsell).
 */
async function resolveUser(
  req: Request
): Promise<{ id: string; accessToken: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) return null;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnon,
      },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return user?.id ? { id: user.id, accessToken } : null;
  } catch {
    return null;
  }
}

interface ProfileRow {
  membership?: string | null;
  id_scans_used?: number | null;
  scans_remaining?: number | null;
}

export async function GET(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const profRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(
      user.id
    )}&select=membership,id_scans_used,scans_remaining`,
    {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
        apikey: supabaseAnon,
        Accept: "application/json",
      },
    }
  );
  if (!profRes.ok) {
    return NextResponse.json(
      { error: "Couldn't load usage." },
      { status: 500 }
    );
  }
  const rows = (await profRes.json()) as ProfileRow[];
  const profile = rows?.[0];
  const membership = profile?.membership ?? "free";

  // Map db membership to tier via the canonical collapse helper.
  const tier = membershipToTier(membership);

  // Tier → monthly cap
  // Member: 100/mo. Pro/elite: "unlimited" (capped at 5,000/mo as fair use).
  // Free: 0 (subscribe-or-pay-wall).
  const monthlyCap =
    tier === "pro" ? null : tier === "member" ? 100 : 0;

  const monthlyUsed = profile?.id_scans_used ?? 0;
  const topupRemaining = Math.max(0, profile?.scans_remaining ?? 0);

  const monthlyRemaining =
    monthlyCap === null ? null : Math.max(0, monthlyCap - monthlyUsed);

  const totalRemaining =
    monthlyRemaining === null
      ? null // unlimited
      : monthlyRemaining + topupRemaining;

  // "Approaching limit" — fires the nudge UI. Use 20% remaining as the
  // canonical threshold; for Member that's 20 scans left.
  const approachingLimit =
    tier === "member" &&
    monthlyRemaining !== null &&
    monthlyCap !== null &&
    monthlyRemaining > 0 &&
    monthlyRemaining <= Math.max(5, Math.floor(monthlyCap * 0.2)) &&
    topupRemaining === 0;

  const atLimit =
    tier === "member" &&
    monthlyRemaining === 0 &&
    topupRemaining === 0;

  return NextResponse.json({
    ok: true,
    tier,
    monthlyCap,
    monthlyUsed,
    monthlyRemaining,
    topupRemaining,
    totalRemaining,
    approachingLimit,
    atLimit,
  });
}
