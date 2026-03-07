/** Slim app: only 3 features (Scanner, Log Book, Grow Coach). */
export type FeatureKey = "scanner" | "history" | "growCoach";

export const FEATURE_MAP: Record<
  FeatureKey,
  { label: string; route: string; icon: string; tier: "app" | "member" | "pro" }
> = {
  scanner: {
    label: "Scanner",
    route: "/garden/scanner",
    icon: "📷",
    tier: "app",
  },
  history: {
    label: "Log Book",
    route: "/garden/history",
    icon: "🕓",
    tier: "member",
  },
  growCoach: {
    label: "Grow Coach",
    route: "/garden/grow-coach",
    icon: "🧠",
    tier: "member",
  },
};
