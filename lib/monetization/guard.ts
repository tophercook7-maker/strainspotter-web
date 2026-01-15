import { FeatureKey, FEATURE_MAP } from "./featureMap";

export type UserTier = "app" | "member" | "pro";

export function canAccess(feature: FeatureKey, tier: UserTier) {
  const required = FEATURE_MAP[feature].tier;

  if (required === "app") return true;
  if (required === "member") return tier === "member" || tier === "pro";
  if (required === "pro") return tier === "pro";

  return false;
}
