import { TIERS, type Tier } from "./tiers";

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

export type GuardEntitlements = {
  scan: boolean;
  doctor_scan: boolean;
  analytics: boolean;
  business_tools: boolean;
  scans: number;
  doctorScans: number;
};

export function getEntitlements(tier: string) {
  if (tier === "free") {
    return { scans: 1, doctorScans: 0 };
  }

  if (tier === "member") {
    return { scans: 250, doctorScans: 50 };
  }

  if (tier === "pro") {
    return { scans: Infinity, doctorScans: Infinity };
  }

  return { scans: 0, doctorScans: 0 };
}
