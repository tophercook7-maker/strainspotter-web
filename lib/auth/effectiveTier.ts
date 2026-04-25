"use client";

/**
 * Single source of truth for membership tier shown in badges, scanner pill, and MemberGate.
 * Avoids `auth.tier || localStorage` bugs where `"free"` is truthy and hides a paid local tier.
 *
 * Checkout can briefly set `ss_membership_tier` ahead of `profiles.membership`; `ss_tier_promoted_at`
 * bounds how long we trust that elevation when the DB still reads `free`.
 */

export type MembershipTier = "free" | "member" | "pro";

const MEMBER_KEY = "ss_membership_tier";
/** Set when checkout (or similar) writes a paid tier to localStorage before profile catches up. */
export const TIER_PROMOTED_AT_KEY = "ss_tier_promoted_at";
/** How long local "member/pro" may override a profile that still reads `free` (ms). */
export const CHECKOUT_TIER_PROMOTION_TTL_MS = 20 * 60 * 1000;

export function readStoredMembershipTier(): MembershipTier | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MEMBER_KEY);
    if (raw === "member" || raw === "pro") return raw;
    return null;
  } catch {
    return null;
  }
}

export function isCheckoutPromotionActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(TIER_PROMOTED_AT_KEY);
    if (!raw) return false;
    const t = Number(raw);
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < CHECKOUT_TIER_PROMOTION_TTL_MS;
  } catch {
    return false;
  }
}

/** Call after sign-out or when intentionally clearing tier hints. */
export function clearCheckoutPromotionFlags(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TIER_PROMOTED_AT_KEY);
  } catch {
    /* ignore */
  }
}

/** Call when checkout applies member/pro to localStorage so reconciliation has a TTL. */
export function markCheckoutTierPromotion(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TIER_PROMOTED_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function rank(t: MembershipTier): number {
  if (t === "pro") return 2;
  if (t === "member") return 1;
  return 0;
}

function maxTier(a: MembershipTier, b: MembershipTier): MembershipTier {
  return rank(a) >= rank(b) ? a : b;
}

export type EffectiveTierAuthInput = {
  user: { id: string } | null | undefined;
  profile: unknown | null | undefined;
  loading: boolean;
  /** Tier from DB profile only (see AuthProvider). */
  tier: MembershipTier;
};

/**
 * - Anonymous: stored tier if member/pro, else free.
 * - Logged in + loading: max(profile tier, stored) so checkout/localStorage is not hidden during hydration.
 * - Logged in + profile row: profile tier; if DB is still `free` but local says member/pro, trust local
 *   only while checkout promotion is active (TTL). Otherwise trust DB and ignore stale local.
 * - Logged in + no profile (edge): max(profile tier, stored).
 */
export function resolveEffectiveTier(
  auth: EffectiveTierAuthInput | null | undefined
): MembershipTier {
  const stored = readStoredMembershipTier();
  if (!auth?.user) {
    return stored ?? "free";
  }
  const fromProfile = auth.tier;
  if (auth.loading) {
    return maxTier(fromProfile, stored ?? "free");
  }
  if (auth.profile != null) {
    if (fromProfile === "free" && (stored === "member" || stored === "pro")) {
      if (isCheckoutPromotionActive()) return stored;
      return fromProfile;
    }
    return fromProfile;
  }
  return maxTier(fromProfile, stored ?? "free");
}
