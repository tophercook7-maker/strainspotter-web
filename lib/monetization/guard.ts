import { incrementUsage, loadUsage, type FeatureKey } from "./usage";

export type TierKey = "app_buyer" | "member_1" | "pro";

/**
 * SAFEST DEFAULT (until auth/billing is wired):
 * - Everyone is treated as app_buyer
 * - You can later swap getTier() to read Supabase user + subscription
 */
export function getTier(): TierKey {
  return "app_buyer";
}

export type Entitlements = {
  monthlyLimits: Record<FeatureKey, number>; // 0 means not allowed
};

export function getEntitlements(tier: TierKey): Entitlements {
  // Monthly, no rollover (handled in usage.ts)
  switch (tier) {
    case "member_1":
      return { monthlyLimits: { id_scan: 250, doctor_scan: 50 } };
    case "pro":
      // "everything" tier for now; adjust later as you define
      return { monthlyLimits: { id_scan: 2000, doctor_scan: 500 } };
    case "app_buyer":
    default:
      // App buyer gets scanner only, but limited usage (safe starting point)
      return { monthlyLimits: { id_scan: 25, doctor_scan: 0 } };
  }
}

export function canUseFeature(feature: FeatureKey) {
  const tier = getTier();
  const ent = getEntitlements(tier);
  const usage = loadUsage();

  const limit = ent.monthlyLimits[feature] ?? 0;
  const used = usage.used[feature] ?? 0;

  const allowed = limit > 0 && used < limit;

  return {
    allowed,
    tier,
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}

export function consumeFeature(feature: FeatureKey) {
  const check = canUseFeature(feature);
  if (!check.allowed) return check;

  const next = incrementUsage(feature, 1);
  const used = next.used[feature] ?? 0;
  return {
    ...check,
    used,
    remaining: Math.max(0, check.limit - used),
  };
}
