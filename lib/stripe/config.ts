// Stripe price IDs — LIVE mode

export const STRIPE_PRICES = {
  member: "price_1TK7uf2LVfewrTUsnHCdPsR9",
  pro: "price_1TK7uf2LVfewrTUsU1IO9cfL",
  topup_10: "price_1TK7ug2LVfewrTUsFTd5HhlM",
  topup_25: "price_1TK7ug2LVfewrTUs4ajDAy8H",
} as const;

export const STRIPE_PORTAL_CONFIG = "bpc_1TK7uy2LVfewrTUsmCNg4qJq";

export type StripeTier = "member" | "pro";
export type TopupPack = "topup_10" | "topup_25";
