export type FeatureKey =
  | "scanner"
  | "strain_browser"
  | "dispensary_finder"
  | "grow_coach"
  | "history"
  | "favorites"
  | "ecosystem"
  | "analytics"
  | "lab_data";

export const FEATURES: Record<FeatureKey, { label: string }> = {
  scanner: { label: "Scanner" },
  strain_browser: { label: "Strains" },
  dispensary_finder: { label: "Dispensaries" },
  grow_coach: { label: "Grow Coach" },
  history: { label: "History" },
  favorites: { label: "Favorites" },
  ecosystem: { label: "Ecosystem" },
  analytics: { label: "Analytics" },
  lab_data: { label: "Lab Data" },
};
