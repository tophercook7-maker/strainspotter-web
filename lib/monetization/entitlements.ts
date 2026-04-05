import { TierKey } from "./tiers";
import { FeatureKey } from "./features";

export const ENTITLEMENTS: Record<
  TierKey,
  {
    features: FeatureKey[];
    limits?: {
      scans?: number;
      doctorScans?: number;
    };
  }
> = {
  app: {
    features: ["scanner"],
    limits: {
      scans: 0,
    },
  },

  member: {
    features: [
      "scanner",
      "strains",
      "dispensaries",
      "growCoach",
      "history",
      "favorites",
      "ecosystem",
    ],
    limits: {
      scans: 250,
      doctorScans: 50,
    },
  },

  pro: {
    features: [
      "scanner",
      "strains",
      "dispensaries",
      "growCoach",
      "history",
      "favorites",
      "ecosystem",
      "analytics",
      "labData",
    ],
    limits: {
      scans: 1000,
      doctorScans: 250,
    },
  },
};
