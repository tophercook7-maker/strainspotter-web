import { getTier } from "./tiers";
import { getEntitlements } from "./entitlements";
import { getUsage } from "./usage";

export function canUseScanner(userId: string) {
  const tier = getTier(userId);
  const entitlements = getEntitlements(tier);
  const usage = getUsage(userId);

  return usage.scansUsed < entitlements.scans;
}

export function canUseDoctor(userId: string) {
  const tier = getTier(userId);
  const entitlements = getEntitlements(tier);
  const usage = getUsage(userId);

  return usage.doctorScansUsed < entitlements.doctorScans;
}
