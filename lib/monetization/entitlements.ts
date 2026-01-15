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
      "strain_browser",
      "dispensary_finder",
      "grow_coach",
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
      "strain_browser",
      "dispensary_finder",
      "grow_coach",
      "history",
      "favorites",
      "ecosystem",
      "analytics",
      "lab_data",
    ],
    limits: {
      scans: 1000,
      doctorScans: 250,
    },
  },
};
