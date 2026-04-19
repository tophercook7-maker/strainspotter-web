export type FeatureKey =
  | "scanner"
  | "strains"
  | "dispensaries"
  | "seedVendors"
  | "growCoach"
  | "history"
  | "favorites"
  | "ecosystem"
  | "settings"
  | "analytics"
  | "labData";

export const FEATURE_MAP: Record<
  FeatureKey,
  {
    label: string;
    route: string;
    icon: string;
    tier: "app" | "member" | "pro";
  }
> = {
  scanner: {
    label: "Scanner",
    route: "/garden/scanner",
    icon: "📷",
    tier: "app",
  },
  strains: {
    label: "Strains",
    route: "/garden/strains",
    icon: "🌿",
    tier: "member",
  },
  dispensaries: {
    label: "Dispensaries",
    route: "/garden/dispensaries",
    icon: "🏪",
    tier: "member",
  },
  seedVendors: {
    label: "Seed Vendors",
    route: "/garden/seed-vendors",
    icon: "🌱",
    tier: "member",
  },
  growCoach: {
    label: "Grow Coach",
    route: "/garden/grow-coach",
    icon: "🧠",
    tier: "member",
  },
  history: {
    label: "History",
    route: "/garden/history",
    icon: "🕓",
    tier: "member",
  },
  favorites: {
    label: "Favorites",
    route: "/garden/favorites",
    icon: "⭐",
    tier: "member",
  },
  ecosystem: {
    label: "Ecosystem",
    route: "/garden/ecosystem",
    icon: "🧬",
    tier: "pro",
  },
  settings: {
    label: "Settings",
    route: "/garden/settings",
    icon: "⚙️",
    tier: "app",
  },
  analytics: {
    label: "Analytics",
    route: "/garden/analytics",
    icon: "📊",
    tier: "pro",
  },
  labData: {
    label: "Lab Data",
    route: "/garden/lab-data",
    icon: "🔬",
    tier: "pro",
  },
};
