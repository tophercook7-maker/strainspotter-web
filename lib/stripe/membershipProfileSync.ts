import type { SupabaseClient } from "@supabase/supabase-js";
import { computeNewMemberPeriodBounds } from "@/lib/scanner/scanEntitlements";

/**
 * Merge Stripe-driven membership updates with garden scan-period rules.
 * Does not clear top-ups or free scan history. For `garden`, initializes a 30-day
 * window when there is no active period (missing or past scan_period_ends_at).
 */
export async function buildMembershipStripeUpdate(
  supabase: SupabaseClient,
  userId: string,
  membership: "garden" | "pro" | "free",
  stripeCustomerId: string | null
): Promise<Record<string, unknown>> {
  const base: Record<string, unknown> = { membership };
  if (typeof stripeCustomerId === "string" && stripeCustomerId.length > 0) {
    base.stripe_customer_id = stripeCustomerId;
  }

  if (membership !== "garden") {
    return base;
  }

  const { data: row } = await supabase
    .from("profiles")
    .select("scan_period_started_at, scan_period_ends_at")
    .eq("id", userId)
    .maybeSingle();

  const now = new Date();
  let needsPeriodInit = true;

  if (row) {
    const endsRaw = row.scan_period_ends_at as string | null | undefined;
    const startsRaw = row.scan_period_started_at as string | null | undefined;
    if (startsRaw == null && endsRaw == null) {
      needsPeriodInit = true;
    } else if (endsRaw == null || endsRaw === "") {
      needsPeriodInit = true;
    } else {
      const end = new Date(endsRaw);
      if (Number.isNaN(end.getTime())) {
        needsPeriodInit = true;
      } else {
        needsPeriodInit = now.getTime() > end.getTime();
      }
    }
  }

  if (!needsPeriodInit) {
    return base;
  }

  const bounds = computeNewMemberPeriodBounds(now);
  return {
    ...base,
    scan_period_started_at: bounds.scan_period_started_at,
    scan_period_ends_at: bounds.scan_period_ends_at,
    member_scans_used: 0,
  };
}

export async function incrementTopupScans(
  supabase: SupabaseClient,
  userId: string,
  amount: 10 | 25,
  stripeCustomerId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const { data: row, error: selErr } = await supabase
    .from("profiles")
    .select("topup_scans_available")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) {
    return { ok: false, error: selErr.message };
  }
  if (!row) {
    return { ok: false, error: "Profile not found" };
  }

  const current = Number(row.topup_scans_available ?? 0);
  const next = current + amount;

  const patch: Record<string, unknown> = {
    topup_scans_available: next,
  };
  if (stripeCustomerId) {
    patch.stripe_customer_id = stripeCustomerId;
  }

  const { error: upErr } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }
  return { ok: true };
}
