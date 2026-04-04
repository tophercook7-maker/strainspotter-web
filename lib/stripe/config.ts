// Stripe price IDs — test mode
// Switch to live IDs when going to production

export const STRIPE_PRICES = {
  member: "price_1TIckP2LVfewrTUsCzQYTAYb",
  pro: "price_1TIckP2LVfewrTUsO0vH5suw",
  topup_10: "price_1TIckP2LVfewrTUslINC4Z6F",
  topup_25: "price_1TIckQ2LVfewrTUsW7Bh4c8h",
} as const;

export const STRIPE_PORTAL_CONFIG = "bpc_1TIckQ2LVfewrTUshHmnJSPe";

export type StripeTier = "member" | "pro";
export type TopupPack = "topup_10" | "topup_25";
