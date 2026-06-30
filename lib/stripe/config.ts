// lib/stripe/config.ts
//
// Stripe price IDs + monetization SKU configuration.
//
// Jun 2026 simplification: dropped annual plans and the Founder Lifetime SKU.
// Catalog is now two monthly subscriptions (Member, Pro) + three one-time
// top-up packs (10 / 20 / 50 scans). The top-up amounts changed ($2.99 /
// $4.99 / $9.99), so each needs a NEW Stripe price ID supplied via env —
// the old price IDs encoded the old amounts and must not be reused.
//
// NOTE: existing Founder customers keep their `elite` membership; we just no
// longer SELL the lifetime SKU. See app/api/iap/webhook (founder entitlement
// → elite restore path) and lib/billing/membership.

export const STRIPE_PRICES = {
  // ── Subscriptions (recurring, monthly) ────────────────────────────
  member: process.env.STRIPE_PRICE_MEMBER || "price_1TK7uf2LVfewrTUsnHCdPsR9",
  pro: process.env.STRIPE_PRICE_PRO || "price_1TK7uf2LVfewrTUsU1IO9cfL",

  // ── Top-up packs (one-time scan credit grants) ────────────────────
  // $2.99 / $4.99 / $9.99 — live Stripe prices created Jun 2026.
  topup_10: process.env.STRIPE_PRICE_TOPUP_10 || "price_1To5042LVfewrTUsoPHlH7Pm",
  topup_20: process.env.STRIPE_PRICE_TOPUP_20 || "price_1To5042LVfewrTUspnPhyPOT",
  topup_50: process.env.STRIPE_PRICE_TOPUP_50 || "price_1To5042LVfewrTUsGQoBSV27",
} as const;

export const STRIPE_PORTAL_CONFIG = "bpc_1TK7uy2LVfewrTUsmCNg4qJq";

/**
 * Scan credits granted per top-up SKU. Used by the Stripe + IAP webhooks
 * to convert a successful top-up purchase into a profile.scans_remaining
 * increment. Keep in sync with lib/iap/products.ts.
 */
export const SCAN_CREDIT_GRANTS: Record<
  "topup_10" | "topup_20" | "topup_50",
  number
> = {
  topup_10: 10,
  topup_20: 20,
  topup_50: 50,
};

export type StripeTier = "member" | "pro";
export type TopupPack = "topup_10" | "topup_20" | "topup_50";
export type StripePriceKey = "member" | "pro" | TopupPack;
