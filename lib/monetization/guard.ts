import { getTier } from "./tiers";
import { getEntitlements } from "./entitlements";
import { getUsage } from "./usage";

type GuardResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export function canUseFeature(
  userId: string,
  feature: "scan" | "doctor_scan" | "analytics" | "business_tools"
): GuardResult {
  const tier = getTier(userId);
  const entitlements = getEntitlements(tier);
  const usage = getUsage(userId);

  if (!entitlements[feature]) {
    return { allowed: false, reason: "Upgrade required" };
  }

  if (feature === "scan" && usage.scansUsed >= entitlements.scans) {
    return { allowed: false, reason: "Scan limit reached" };
  }

  if (feature === "doctor_scan" && usage.doctorScansUsed >= entitlements.doctorScans) {
    return { allowed: false, reason: "Doctor scan limit reached" };
  }

  return { allowed: true };
}
