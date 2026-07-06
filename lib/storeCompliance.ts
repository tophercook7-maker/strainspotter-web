// lib/storeCompliance.ts — single source of truth for app-store policy gating.
//
// Apple & Google restrict cannabis apps that facilitate the sale or use of
// cannabis. The web/PWA has no such constraint, so the strategy is:
//   • Web / PWA (default)  → every feature on, Stripe web payments on.
//   • iOS / Android builds → hide the surfaces that read as "facilitating
//     sale/use" (dispensary finder, seed-vendor directory, consumption diary)
//     and defer digital payments to the store's own billing.
//
// Flip per build with NEXT_PUBLIC_STORE_BUILD = "web" | "ios" | "android".
// It is a NEXT_PUBLIC_* var so both server and client read the same value, and
// it DEFAULTS TO "web" — so production (web/PWA) behavior is unchanged until a
// native build explicitly sets it. Nothing here affects the live site.

export type StoreBuild = "web" | "ios" | "android";

export const STORE_BUILD: StoreBuild = ((): StoreBuild => {
  const v = (process.env.NEXT_PUBLIC_STORE_BUILD || "web").toLowerCase();
  return v === "ios" || v === "android" ? v : "web";
})();

export const isNativeStore = STORE_BUILD !== "web";

/**
 * Feature switches. `true` = show/allow. On web everything is on; native builds
 * hide the policy-sensitive surfaces. Keep all gating decisions in this ONE
 * object so a policy change is a one-file edit, not an app-wide hunt.
 */
export const compliance = {
  /** Dispensary finder — maps users to places selling cannabis. */
  dispensaryFinder: !isNativeStore,
  /** Seed-vendor directory — links out to buy seeds. */
  seedVendors: !isNativeStore,
  /** Consumption diary / "Partake" session logging (dose, method, effects). */
  consumptionDiary: !isNativeStore,
  /** In-app Stripe/web purchases (native stores force their own billing). */
  webPayments: !isNativeStore,
} as const;

export type ComplianceFeature = keyof typeof compliance;

/** Convenience: is a given feature available in this build? */
export function isFeatureAllowed(feature: ComplianceFeature): boolean {
  return compliance[feature];
}
