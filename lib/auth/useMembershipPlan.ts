"use client";

import type { User } from "@supabase/supabase-js";
import type { ScanEntitlements } from "@/lib/scanner/scanEntitlements";
import { useOptionalAuth } from "@/lib/auth/AuthProvider";
import type { MembershipTier } from "@/lib/auth/effectiveTier";
import { resolveEffectiveTier } from "@/lib/auth/effectiveTier";

export type EntitlementsStatus = "idle" | "loading" | "ok" | "error";

export type UseMembershipPlanResult = {
  membershipPlanTier: MembershipTier;
  effectiveMembershipTier: MembershipTier;
  entitlementsStatus: EntitlementsStatus;
  scanEntitlements: ScanEntitlements | null;
  refreshScanEntitlements: (() => Promise<void>) | undefined;
  user: User | null;
  authLoading: boolean;
};

/**
 * Single hook for UI that should match scanner / Garden hub: prefer server
 * entitlements when loaded, otherwise `resolveEffectiveTier`.
 */
export function useMembershipPlan(): UseMembershipPlanResult {
  const auth = useOptionalAuth();

  const resolvedFallback = resolveEffectiveTier(
    auth
      ? {
          user: auth.user,
          profile: auth.profile,
          loading: auth.loading,
          tier: auth.tier,
        }
      : null
  );

  const membershipPlanTier =
    (auth?.membershipPlanTier ?? resolvedFallback) as MembershipTier;
  const effectiveMembershipTier =
    (auth?.effectiveMembershipTier ?? resolvedFallback) as MembershipTier;

  return {
    membershipPlanTier,
    effectiveMembershipTier,
    entitlementsStatus: (auth?.entitlementsStatus ?? "idle") as EntitlementsStatus,
    scanEntitlements: auth?.scanEntitlements ?? null,
    refreshScanEntitlements: auth?.refreshScanEntitlements,
    user: auth?.user ?? null,
    authLoading: auth?.loading ?? false,
  };
}
