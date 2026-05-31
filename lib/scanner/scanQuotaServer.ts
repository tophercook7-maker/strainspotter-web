/**
 * Server-only scan quota: profile load, entitlement math, and consume.
 * Shared by `/api/scans/consume` and `/api/scan`.
 */

import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  buildScanEntitlements,
  computeNewMemberPeriodBounds,
  memberPeriodNeedsReset,
  normalizeTier,
  type ConsumedFrom,
  type ScanEntitlements,
} from "@/lib/scanner/scanEntitlements";

export async function getUserFromBearerRequest(
  req: NextRequest
): Promise<User | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function profileRowToEntitlementInput(row: Record<string, unknown>) {
  return {
    membership: row.membership as string | null | undefined,
    freeScansUsed: Number(row.free_scans_used ?? 0),
    memberScansUsed: Number(row.member_scans_used ?? 0),
    topupScansAvailable: Number(row.topup_scans_available ?? 0),
    scanPeriodStartedAt: row.scan_period_started_at as string | null | undefined,
    scanPeriodEndsAt: row.scan_period_ends_at as string | null | undefined,
  };
}

export async function loadProfileRow(
  userId: string
): Promise<
  { ok: true; profile: Record<string, unknown> } | { ok: false; error: string }
> {
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error?.code === "PGRST116" || !profile) {
    return { ok: false as const, error: "Profile not found" };
  }
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, profile: profile as Record<string, unknown> };
}

export function entitlementsFromProfileRow(
  profile: Record<string, unknown>,
  now?: Date
): ScanEntitlements {
  return buildScanEntitlements(profileRowToEntitlementInput(profile), {
    now: now ?? new Date(),
  });
}

/**
 * Apply one scan consumption for a user (same rules as POST /api/scans/consume).
 */
export async function consumeOneScanForUser(userId: string): Promise<
  | { ok: true; entitlements: ScanEntitlements; consumedFrom: ConsumedFrom }
  | { ok: false; error: string }
> {
  const supabase = getSupabaseAdmin();
  const loaded = await loadProfileRow(userId);
  if (loaded.ok === false) {
    return { ok: false as const, error: loaded.error };
  }

  const now = new Date();
  let working = loaded.profile;
  const tier = normalizeTier(working.membership as string | null | undefined);

  if (tier === "pro") {
    const entitlements = entitlementsFromProfileRow(working, now);
    return { ok: true as const, entitlements, consumedFrom: "pro" };
  }

  if (tier === "member") {
    const needsReset = memberPeriodNeedsReset(
      now,
      working.scan_period_started_at as string | null | undefined,
      working.scan_period_ends_at as string | null | undefined
    );

    if (needsReset) {
      const bounds = computeNewMemberPeriodBounds(now);
      const { error: resetErr } = await supabase
        .from("profiles")
        .update({
          member_scans_used: 0,
          scan_period_started_at: bounds.scan_period_started_at,
          scan_period_ends_at: bounds.scan_period_ends_at,
        })
        .eq("id", userId);

      if (resetErr) {
        return { ok: false as const, error: resetErr.message };
      }

      const { data: refreshed, error: refErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (refErr || !refreshed) {
        return {
          ok: false as const,
          error: refErr?.message ?? "Failed to reload profile",
        };
      }
      working = refreshed as Record<string, unknown>;
    }
  }

  const beforeConsume = entitlementsFromProfileRow(working, now);

  if (!beforeConsume.canScan) {
    return { ok: false as const, error: "No scan allowance remaining." };
  }

  let consumedFrom: ConsumedFrom;

  if (tier === "free") {
    if (beforeConsume.freeScansRemaining > 0) {
      const nextFree = Number(working.free_scans_used ?? 0) + 1;
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ free_scans_used: nextFree })
        .eq("id", userId);

      if (upErr) {
        return { ok: false as const, error: upErr.message };
      }
      consumedFrom = "free";
    } else if (beforeConsume.topupScansAvailable > 0) {
      const nextTop = Number(working.topup_scans_available ?? 0) - 1;
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ topup_scans_available: Math.max(0, nextTop) })
        .eq("id", userId);

      if (upErr) {
        return { ok: false as const, error: upErr.message };
      }
      consumedFrom = "topup";
    } else {
      return { ok: false as const, error: "No scan allowance remaining." };
    }
  } else {
    if (beforeConsume.memberScansRemaining > 0) {
      const nextMember = Number(working.member_scans_used ?? 0) + 1;
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ member_scans_used: nextMember })
        .eq("id", userId);

      if (upErr) {
        return { ok: false as const, error: upErr.message };
      }
      consumedFrom = "member";
    } else if (beforeConsume.topupScansAvailable > 0) {
      const nextTop = Number(working.topup_scans_available ?? 0) - 1;
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ topup_scans_available: Math.max(0, nextTop) })
        .eq("id", userId);

      if (upErr) {
        return { ok: false as const, error: upErr.message };
      }
      consumedFrom = "topup";
    } else {
      return { ok: false as const, error: "No scan allowance remaining." };
    }
  }

  const { data: finalProfile, error: finalErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (finalErr || !finalProfile) {
    return {
      ok: false as const,
      error: finalErr?.message ?? "Failed to reload profile",
    };
  }

  const entitlements = entitlementsFromProfileRow(
    finalProfile as Record<string, unknown>,
    new Date()
  );

  return { ok: true as const, entitlements, consumedFrom };
}
