export type Tier = "APP" | "MEMBER" | "PRO";

export const TIERS = {
  APP: {
    name: "App Purchase",
    includes: {
      scanner: true,
      doctor: false,
      analytics: false,
    },
    monthlyLimits: {
      idScans: 25,
      doctorScans: 0,
    },
    allowTopUps: true,
  },

  MEMBER: {
    name: "Garden Membership",
    includes: {
      scanner: true,
      doctor: true,
      analytics: false,
    },
    monthlyLimits: {
      idScans: 250,
      doctorScans: 50,
    },
    allowTopUps: true,
  },

  PRO: {
    name: "Pro / Business",
    includes: {
      scanner: true,
      doctor: true,
      analytics: true,
    },
    monthlyLimits: {
      idScans: Infinity,
      doctorScans: Infinity,
    },
    allowTopUps: false,
  },
} as const;

export function getTier(userId: string) {
  return "free";
}
