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
  member_annual: {
    name: "Member · Annual",
    price: "$39/yr",
    effectivePerMonth: "$3.25/mo",
    period: "yearly" as const,
    scans: "100 scans/month",
    savingsLabel: "Save 35% — 2 months free",
    tagline: "Same Member plan. Pay yearly, save a third.",
    features: [
      "Everything in Member",
      "Effective $3.25/mo — 35% less than monthly",
      "One charge per year, no monthly surprises",
    ],
  },
  pro: {
    name: "Pro",
    price: "$9.99/mo",
    period: "monthly" as const,
    scans: "Unlimited scans*",
    tagline: "For growers who scan every harvest.",
    features: [
      "Everything in Member",
      "Unlimited scans + diagnostics",
      "Priority scan processing",
      "Advanced analytics on every scan",
      "Early access to new features",
    ],
    footnote:
      "*Fair-use rate limits apply — 500/day, 5,000/month. Plenty for any real human; designed to block scripted abuse.",
  },
  pro_annual: {
    name: "Pro · Annual",
    price: "$79/yr",
    effectivePerMonth: "$6.58/mo",
    period: "yearly" as const,
    scans: "Unlimited scans*",
    savingsLabel: "Save 34% — 2 months free",
    tagline: "All the Pro features, one yearly charge.",
    features: [
      "Everything in Pro",
      "Effective $6.58/mo — 34% less than monthly",
      "One charge per year, no monthly surprises",
    ],
  },
  founder_lifetime: {
    name: "Founder",
    price: "$99 once",
    period: "lifetime" as const,
    scans: "Unlimited scans, forever*",
    badge: "Limited — first 1,000 only",
    tagline: "Pay once. Use forever. Locked-in launch price.",
    features: [
      "Everything in Pro — for life",
      "No monthly bill, no annual renewal",
      "Founder badge on your profile",
      "Direct line to feature requests",
      "Locked in before public price hikes",
    ],
    footnote: "*Same fair-use rate limits as Pro.",
  },
} as const;

/**
 * Top-up packs — one-time scan credit purchases for the user who doesn't
 * want a subscription but needs a few more scans.
 *
 * Pricing rebalanced May 25 2026:
 *   - Old: $1.99/10 ($0.20/scan) + $3.99/25 ($0.16/scan) — 3-4× the sub rate.
 *   - New: $0.99/10 + $2.49/25 + $8.99/100 (~$0.10/scan, ~2× the sub rate).
 *
 * Per-scan economics (subscriber gets ~$0.05/scan); the topup is still a
 * premium for the convenience of not subscribing, but no longer feels
 * like a rip-off. The 100-pack is genuinely good value and gets a badge.
 */
export const TOPUP_PACKS = [
  {
    id: "topup_10" as const,
    scans: 10,
    price: "$0.99",
    perScan: 0.099,
    label: "10 scans",
    sublabel: "$0.10 per scan",
  },
  {
    id: "topup_25" as const,
    scans: 25,
    price: "$2.49",
    perScan: 0.0996,
    label: "25 scans",
    sublabel: "$0.10 per scan",
  },
  {
    id: "topup_100" as const,
    scans: 100,
    price: "$8.99",
    perScan: 0.0899,
    label: "100 scans",
    sublabel: "$0.09 per scan — best value",
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
