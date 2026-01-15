export type TierKey = "app" | "member" | "pro";

export const TIERS: Record<TierKey, { label: string }> = {
  app: { label: "App Owner" },
  member: { label: "Member" },
  pro: { label: "Pro" },
};
