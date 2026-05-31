// lib/stripe/config.ts
//
// Stripe price IDs + monetization SKU configuration.
//
// May 25 2026 pivot expanded the catalog: added annual plans, a
// limited-quantity "Founder Lifetime" SKU, and a third top-up tier.
// Hardcoded IDs preserved for the originals (kept working through prior
// deploys); new ones expected via env. Replace with real price IDs from
// the Stripe dashboard before launching the new SKUs publicly.

export const STRIPE_PRICES = {
  // ── Subscriptions (recurring) ─────────────────────────────────────
  member: process.env.STRIPE_PRICE_MEMBER || "price_1TK7uf2LVfewrTUsnHCdPsR9",
  member_annual:
    process.env.STRIPE_PRICE_MEMBER_ANNUAL ||
    "price_member_annual_PLACEHOLDER",
  pro: process.env.STRIPE_PRICE_PRO || "price_1TK7uf2LVfewrTUsU1IO9cfL",
  pro_annual:
    process.env.STRIPE_PRICE_PRO_ANNUAL || "price_pro_annual_PLACEHOLDER",

  // ── One-time / lifetime ───────────────────────────────────────────
  founder_lifetime:
    process.env.STRIPE_PRICE_FOUNDER_LIFETIME ||
    "price_founder_lifetime_PLACEHOLDER",

  // ── Top-up packs (one-time scan credit grants) ────────────────────
  topup_10: process.env.STRIPE_PRICE_TOPUP_10 || "price_1TK7ug2LVfewrTUsFTd5HhlM",
  topup_25: process.env.STRIPE_PRICE_TOPUP_25 || "price_1TK7ug2LVfewrTUs4ajDAy8H",
  topup_100:
    process.env.STRIPE_PRICE_TOPUP_100 || "price_topup_100_PLACEHOLDER",
} as const;

export const STRIPE_PORTAL_CONFIG = "bpc_1TK7uy2LVfewrTUsmCNg4qJq";

/**
 * Scan credits granted per top-up SKU. Used by the Stripe + IAP webhooks
 * to convert a successful top-up purchase into a profile.scans_remaining
 * increment. Keep in sync with lib/iap/products.ts.
 */
export const SCAN_CREDIT_GRANTS: Record<
  "topup_10" | "topup_25" | "topup_100",
  number
> = {
  topup_10: 10,
  topup_25: 25,
  topup_100: 100,
};

export type StripeTier = "member" | "pro";
export type TopupPack = "topup_10" | "topup_25" | "topup_100";
export type StripePriceKey =
  | "member"
  | "member_annual"
  | "pro"
  | "pro_annual"
  | "founder_lifetime"
  | TopupPack;
