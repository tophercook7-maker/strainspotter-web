export function getScanLimits(tier: string | null) {
  if (tier === "grower") {
    return { scans: 100, doctor: 20 };
  }
  if (tier === "pro") {
    return { scans: 300, doctor: 50 };
  }
  return { scans: 25, doctor: 0 };
}
