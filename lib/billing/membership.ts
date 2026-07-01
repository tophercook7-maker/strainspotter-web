// lib/billing/membership.ts
//
// Single source of truth for membership tier values.
//
// Before this module existed, `Membership` was independently declared in:
//   - app/api/stripe/webhook/route.ts
//   - app/api/iap/webhook/route.ts
//   - lib/scanGating.ts (as `Tier`)
//   - lib/stripe/config.ts (as `StripeTier`)
// …and tier-collapse logic was duplicated in serverGate.ts,
// AuthProvider.tsx, and app/api/scan/usage/route.ts. They drifted —
// webhooks were writing strings the rest of the app didn't recognize.
//
// Anything that writes profiles.membership or reads it should use the
// types and helpers from this module.

/**
 * Database value of `profiles.membership`. Constrained by the CHECK in
 * migrations/2025_01_20_scan_quota_backend.sql:
 *   profiles_membership_check IN ('free','garden','standard','pro','elite')
 *
 * Meanings:
 *   - free      → no subscription. Cannot scan.
 *   - garden    → Member tier (the historical label for Member).
 *   - standard  → Member tier (legacy synonym for 'garden').
 *   - pro       → Pro tier (recurring subscription; 300 scans/period).
 *   - elite     → Founder lifetime (legacy; surfaces a UI badge).
 */
export type Membership = "free" | "garden" | "standard" | "pro" | "elite";

/**
 * UI/gate-level tier. The DB has 5 membership values; the app collapses
 * them to 3 buckets for paywall, rate-limit, and feature decisions.
 *
 *   "free"   → no subscription
 *   "member" → Member-equivalent (garden | standard | "member" literal)
 *   "pro"    → Pro-equivalent (pro | elite)
 */
export type Tier = "free" | "member" | "pro";

/**
 * Whitelist of DB strings that satisfy the CHECK constraint. Used to
 * validate inputs from external sources (webhooks, manual ops).
 */
export const VALID_MEMBERSHIPS: readonly Membership[] = [
  "free",
  "garden",
  "standard",
  "pro",
  "elite",
] as const;

/**
 * Collapse a profile.membership value to its UI/gate tier bucket.
 *
 *   garden / standard / "member" (legacy)  → member
 *   pro / elite                            → pro
 *   free / null / unknown                  → free
 *
 * Accepts unknown strings defensively so callers don't have to pre-check
 * (e.g. when reading a DB row that hasn't yet been validated).
 */
export function membershipToTier(membership: string | null | undefined): Tier {
  if (membership === "pro" || membership === "elite") return "pro";
  if (
    membership === "garden" ||
    membership === "standard" ||
    membership === "member" // legacy literal sometimes appears in older rows
  ) {
    return "member";
  }
  return "free";
}

/** Type guard for narrowing untyped input to the DB-valid set. */
export function isMembership(v: unknown): v is Membership {
  return (
    typeof v === "string" &&
    (VALID_MEMBERSHIPS as readonly string[]).includes(v)
  );
}
