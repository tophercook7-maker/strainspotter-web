import { ENTITLEMENTS } from "./entitlements";
import { TierKey } from "./tiers";
import { FeatureKey } from "./features";

export function hasFeature(tier: TierKey, feature: FeatureKey) {
  return ENTITLEMENTS[tier].features.includes(feature);
}

export function getLimits(tier: TierKey) {
  return ENTITLEMENTS[tier].limits ?? {};
}
