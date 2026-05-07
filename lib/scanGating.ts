// lib/scanGating.ts — Subscription-only gating
//
// May 2026 pivot: NO FREE TIER. Every scan, every diagnostic call requires
// an active paid subscription. The previous "5 lifetime free" model has
// been retired.
//
// This module is intentionally small — the heavy lifting is the server-side
// auth + tier check on /api/scan and /api/grow-doctor/diagnose, plus the
// client-side paywall flow in components/ScanPaywall.tsx.

const TIER_KEY = "ss_local_tier"; // mirrors profile.membership for unauth/offline UX

export type Tier = "member" | "pro" | null;

export function getLocalTier(): Tier {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(TIER_KEY);
    if (v === "member" || v === "pro") return v;
    return null;
  } catch {
    return null;
  }
}

export function setLocalTier(tier: Tier): void {
  if (typeof window === "undefined") return;
  try {
    if (tier === null) {
      localStorage.removeItem(TIER_KEY);
    } else {
      localStorage.setItem(TIER_KEY, tier);
    }
  } catch {
    /* localStorage unavailable — non-fatal */
  }
}

/** Strict client-side check: are they subscribed at all? */
export function isSubscribed(): boolean {
  return getLocalTier() !== null;
}

/* ─── Pricing display copy (kept in sync with Stripe price IDs) ─── */

export const MEMBERSHIP_TIERS = {
  member: {
    name: "Member",
    price: "$4.99/mo",
    scans: "100 scans/month",
    features: [
      "AI Scan & Analyze — 100 scans/month",
      "Grow Doctor — full lifecycle + photo diagnostics",
      "Strain Library — full catalog with filters",
      "Dispensary & Seed-Vendor directories",
      "Scan history, favorites, journal — fully personalized",
    ],
  },
  pro: {
    name: "Pro",
    price: "$9.99/mo",
    scans: "Unlimited scans",
    features: [
      "Everything in Member",
      "Unlimited scans + diagnostics",
      "Priority scan processing",
      "Advanced analytics on every scan",
      "Early access to new features",
    ],
  },
} as const;

export const TOPUP_PACKS = [
  { id: "topup_10", scans: 10, price: "$1.99", label: "10 extra scans" },
  { id: "topup_25", scans: 25, price: "$3.99", label: "25 extra scans" },
] as const;

/* ─── Legacy compatibility shims ─────────────────────────────────────────
 *
 * The old free-tier API is no longer used internally, but external callers
 * (the scanner page in particular still has scaffolding) might import these.
 * They now reflect the no-free-scans reality.
 */

/** Always 0 — there is no free allowance. */
export const FREE_SCAN_TOTAL = 0;

/** Always 0 — there are no free scans remaining, ever. */
export function getScansRemaining(): number {
  return 0;
}

/**
 * Without a subscription this is `false`. With a subscription, the caller
 * should defer to the server-side gate; client-side optimism is fine.
 */
export function canScan(): boolean {
  return isSubscribed();
}

/** No-op kept for legacy callers; scan accounting is server-side now. */
export function consumeScan(): void {
  /* intentionally empty */
}

/** Always 'empty' for unsubscribed; 'none' for subscribed. */
export function shouldShowWarning(): "none" | "low" | "last" | "empty" {
  return isSubscribed() ? "none" : "empty";
}

export function getScanUsage(): {
  totalUsed: number;
  firstScanAt: string | null;
  lastScanAt: string | null;
} {
  return { totalUsed: 0, firstScanAt: null, lastScanAt: null };
}
