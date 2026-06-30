// lib/iap/products.ts
//
// Apple IAP / Google Play product IDs mapped to our internal SKU keys.
//
// IMPORTANT: these strings must EXACTLY match what's configured in:
//   • App Store Connect → My Apps → StrainSpotter → In-App Purchases
//   • Play Console      → Subscriptions / In-App Products (future)
//   • RevenueCat        → Products + Entitlements + Offerings
//
// Apple's product-ID rules:
//   • Lowercase, dots/underscores OK, no slashes, no spaces
//   • Conventionally bundleId-prefixed, e.g. com.mixedmakershop.strainspotter.member.monthly
//   • Once created and used in a sandbox purchase, the ID is frozen forever
//
// Auto-renewable subscriptions and consumables (topups) need DIFFERENT
// product types in App Store Connect. See app-store-connect-iap-setup.md.

/* ─── App Store Connect product IDs ─────────────────────────────── */

export const APPLE_PRODUCT_IDS = {
  // Auto-renewable subscriptions (monthly only)
  member_monthly: "com.mixedmakershop.strainspotter.member.monthly",
  pro_monthly:    "com.mixedmakershop.strainspotter.pro.monthly",

  // Consumables (top-up scan packs)
  topup_10:  "com.mixedmakershop.strainspotter.topup.10",
  topup_20:  "com.mixedmakershop.strainspotter.topup.20",
  topup_50:  "com.mixedmakershop.strainspotter.topup.50",
} as const;

export type AppleProductKey = keyof typeof APPLE_PRODUCT_IDS;

/* ─── RevenueCat entitlement identifiers ────────────────────────── */
//
// In RevenueCat, attach EACH product above to one of these entitlements.
// The client checks `customerInfo.entitlements.active[entitlementId]` to
// determine if a user is paid. Our backend mirrors that into Supabase
// `profiles.membership`.
//
// RevenueCat entitlement = "what does the user GET?"
// RevenueCat product = "what did they BUY to get it?"
//
// Many products can share one entitlement. Annual vs monthly of the
// same tier both grant the same entitlement.

export const REVENUECAT_ENTITLEMENTS = {
  member:  "member",   // → granted by member_monthly
  pro:     "pro",      // → granted by pro_monthly
  founder: "founder",  // → legacy: existing Founder customers only (restore path). Not sold.
} as const;

export type EntitlementId =
  (typeof REVENUECAT_ENTITLEMENTS)[keyof typeof REVENUECAT_ENTITLEMENTS];

/* ─── Internal SKU key ↔ Apple product ID mapping ───────────────── */
//
// The rest of the codebase uses our internal SKU keys ("member",
// "pro", "topup_10", etc). The IAP layer translates between
// those and the Apple product strings above.

export const SKU_TO_APPLE: Record<string, string> = {
  member:    APPLE_PRODUCT_IDS.member_monthly,
  pro:       APPLE_PRODUCT_IDS.pro_monthly,
  topup_10:  APPLE_PRODUCT_IDS.topup_10,
  topup_20:  APPLE_PRODUCT_IDS.topup_20,
  topup_50:  APPLE_PRODUCT_IDS.topup_50,
};

/** Reverse map for parsing webhook payloads. */
export const APPLE_TO_SKU: Record<string, string> = Object.fromEntries(
  Object.entries(SKU_TO_APPLE).map(([sku, apple]) => [apple, sku])
);

/* ─── Consumable scan grants (mirrors lib/stripe/config.ts) ─────── */

export const APPLE_TOPUP_GRANTS: Record<string, number> = {
  [APPLE_PRODUCT_IDS.topup_10]: 10,
  [APPLE_PRODUCT_IDS.topup_20]: 20,
  [APPLE_PRODUCT_IDS.topup_50]: 50,
};

/** True if the Apple product ID is a one-time topup (consumable). */
export function isTopupProductId(productId: string): boolean {
  return productId in APPLE_TOPUP_GRANTS;
}
