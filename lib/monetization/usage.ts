import { TIERS, type Tier } from "./tiers";

export type Usage = {
  idScansUsed: number;
  doctorScansUsed: number;
};

export function canUseIdScan(tier: Tier, usage: Usage) {
  return usage.idScansUsed < TIERS[tier].monthlyLimits.idScans;
}

export function canUseDoctorScan(tier: Tier, usage: Usage) {
  return usage.doctorScansUsed < TIERS[tier].monthlyLimits.doctorScans;
}

export function canTopUp(tier: Tier) {
  return TIERS[tier].allowTopUps;
}
