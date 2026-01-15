import type { Plan } from "./tiers";

export type Entitlement =
  | "scan_basic"
  | "scan_advanced"
  | "save_favorites"
  | "grow_coach"
  | "dispensary_filters";

export const PLAN_ENTITLEMENTS: Record<Plan, Entitlement[]> = {
  free: ["scan_basic"],
  pro: [
    "scan_basic",
    "scan_advanced",
    "save_favorites",
    "dispensary_filters",
  ],
  grower: [
    "scan_basic",
    "scan_advanced",
    "save_favorites",
    "dispensary_filters",
    "grow_coach",
  ],
};
