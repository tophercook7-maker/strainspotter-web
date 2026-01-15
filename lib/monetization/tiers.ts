export type Plan = "free" | "pro" | "grower";

export const PLANS: Record<
  Plan,
  {
    label: string;
    monthly: number;
    features: string[];
  }
> = {
  free: {
    label: "Free",
    monthly: 0,
    features: [
      "Basic strain browsing",
      "Limited dispensary lookup",
      "Basic scan results",
    ],
  },
  pro: {
    label: "Pro",
    monthly: 9,
    features: [
      "Unlimited scans",
      "Advanced strain insights",
      "Save favorites",
      "History tracking",
    ],
  },
  grower: {
    label: "Grower",
    monthly: 29,
    features: [
      "Grow coach access",
      "Environmental diagnostics",
      "Yield optimization insights",
    ],
  },
};
