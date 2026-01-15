import type { Tier } from "./tiers";

export type Entitlement =
  | "scanner"
  | "doctor"
  | "analytics";

export const TIER_ENTITLEMENTS: Record<Tier, Entitlement[]> = {
  APP: ["scanner"],
  MEMBER: ["scanner", "doctor"],
  PRO: ["scanner", "doctor", "analytics"],
};

export const PLAN_ENTITLEMENTS = TIER_ENTITLEMENTS;
