// lib/scanGating.ts — Subscription-only gating + pricing display
//
// May 2026 pivot: NO FREE TIER. Every scan, every diagnostic call requires
// an active paid subscription. The previous "5 lifetime free" model has
// been retired.
//
// May 25 2026 update: expanded pricing display to expose annual plans,
// founder lifetime SKU, and rebalanced topup tiers (now ~2× sub per-scan
// price; previously was 3-4× and felt like a ripoff).
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

/**
 * The PRIMARY subscription plans shown on the paywall card grid.
 * Each links to a Stripe priceKey defined in lib/stripe/config.ts.
 *
 * Copy guidelines:
 *   - Make the value gap visceral. "100 scans" vs "Unlimited" is too abstract;
 *     anchor it to a concrete usage pattern.
 *   - Annual plans show the per-month effective rate, not just the yearly total.
 *   - Founder is a launch-only scarcity lever; phase out after 1,000 sales.
 */
export const MEMBERSHIP_TIERS = {
  member: {
    name: "Member",
    price: "$4.99/mo",
    period: "monthly" as const,
    scans: "100 scans/month",
    tagline: "Plenty if you scan a few times a week.",
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
    period: "monthly" as const,
    scans: "300 scans/month",
    tagline: "For growers who scan every harvest.",
    features: [
      "Everything in Member",
      "300 scans/month + diagnostics",
      "Priority scan processing",
      "Advanced analytics on every scan",
      "Early access to new features",
    ],
    footnote:
      "Need more than 300 in a month? One-time top-up packs stack on top and never expire.",
  },
} as const;

/**
 * Top-up packs — one-time scan credit purchases for the user who doesn't
 * want a subscription but needs a few more scans.
 *
 * Pricing (Jun 2026): $2.99/10 + $4.99/20 + $9.99/50.
 * Deliberately priced ABOVE the subscription per-scan rate (Member is
 * $4.99/100 = $0.05/scan) so packs read as premium convenience and the
 * monthly plans stay the obvious value. The 50-pack is best value and
 * gets a badge; bigger packs carry a real volume discount.
 */
export const TOPUP_PACKS = [
  {
    id: "topup_10" as const,
    scans: 10,
    price: "$2.99",
    perScan: 0.299,
    label: "10 scans",
    sublabel: "$0.30 per scan",
  },
  {
    id: "topup_20" as const,
    scans: 20,
    price: "$4.99",
    perScan: 0.2495,
    label: "20 scans",
    sublabel: "$0.25 per scan",
  },
  {
    id: "topup_50" as const,
    scans: 50,
    price: "$9.99",
    perScan: 0.1998,
    label: "50 scans",
    sublabel: "$0.20 per scan — best value",
    badge: "Best value",
  },
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
