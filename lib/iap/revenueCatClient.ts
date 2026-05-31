// lib/iap/revenueCatClient.ts
//
// RevenueCat purchase client for the Capacitor iOS app.
//
// Why RevenueCat (vs. raw StoreKit 2):
//   • Handles receipt validation server-side (no x5c chain code to maintain)
//   • Sandbox + production toggle is automatic by build configuration
//   • Restore-purchases UX is one function call
//   • Webhooks into our backend mirror Stripe webhook patterns
//   • Cross-platform — same code works on Android when we ship there
//
// This module is iOS/native-only. Importing it on web is harmless (the
// Capacitor plugin returns null on web; methods throw a useful error).
//
// Lifecycle:
//   1. App boots → initRevenueCat(userId) once user is authenticated
//   2. Show paywall → fetchOfferings() returns the current Stripe-style price set
//   3. User taps "Buy" → purchasePackage(pkg)
//   4. RevenueCat verifies receipt and POSTs to our webhook
//   5. Webhook updates profiles.membership / scan_credits
//   6. Client re-reads getCustomerInfo() and updates the UI
//
// Reference: https://www.revenuecat.com/docs/getting-started/installation/capacitor

import { isIOSApp, isNativeApp } from "@/lib/platform";

/* ─── Lazy import the plugin so web builds don't bundle it ──────── */

type PurchasesPlugin = {
  configure: (params: { apiKey: string; appUserID?: string | null }) => Promise<void>;
  logIn: (params: { appUserID: string }) => Promise<{ customerInfo: any }>;
  logOut: () => Promise<{ customerInfo: any }>;
  getOfferings: () => Promise<{ current: any | null; all: Record<string, any> }>;
  getCustomerInfo: () => Promise<{ customerInfo: any }>;
  purchasePackage: (params: { aPackage: any }) => Promise<{
    customerInfo: any;
    productIdentifier: string;
  }>;
  restorePurchases: () => Promise<{ customerInfo: any }>;
  addCustomerInfoUpdateListener: (
    listener: (info: any) => void
  ) => Promise<{ id: string }>;
};

let cachedPlugin: PurchasesPlugin | null = null;

async function getPlugin(): Promise<PurchasesPlugin | null> {
  if (!isNativeApp()) return null;
  if (cachedPlugin) return cachedPlugin;
  try {
    // Dynamic import — the plugin only resolves on native; on web it
    // throws and we return null, which the callers handle gracefully.
    const mod = await import("@revenuecat/purchases-capacitor");
    cachedPlugin = mod.Purchases as unknown as PurchasesPlugin;
    return cachedPlugin;
  } catch (err) {
    console.warn("[IAP] @revenuecat/purchases-capacitor not installed:", err);
    return null;
  }
}

/* ─── Public surface ────────────────────────────────────────────── */

let initialized = false;

/**
 * Initialize the SDK with the current user. Safe to call multiple times.
 * No-op on web. Should be called once after the user signs in.
 */
export async function initRevenueCat(userId: string | null): Promise<void> {
  if (!isNativeApp()) return;
  const plugin = await getPlugin();
  if (!plugin) return;

  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY || "";
  if (!apiKey) {
    console.warn(
      "[IAP] NEXT_PUBLIC_REVENUECAT_IOS_API_KEY not set — IAP disabled."
    );
    return;
  }

  if (!initialized) {
    await plugin.configure({ apiKey, appUserID: userId ?? null });
    initialized = true;
  } else if (userId) {
    await plugin.logIn({ appUserID: userId });
  }
}

/** Pull current logged-out / disconnected state. Mostly used on signout. */
export async function revenueCatLogOut(): Promise<void> {
  if (!isNativeApp() || !initialized) return;
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.logOut();
  } catch (err) {
    console.warn("[IAP] logOut failed:", err);
  }
}

/**
 * Fetch the configured offerings (the "menu" of available products).
 * Returns null on web or if RevenueCat isn't reachable.
 */
export async function fetchOfferings(): Promise<any | null> {
  if (!isNativeApp()) return null;
  const plugin = await getPlugin();
  if (!plugin) return null;
  try {
    const result = await plugin.getOfferings();
    return result.current ?? null;
  } catch (err) {
    console.error("[IAP] fetchOfferings failed:", err);
    return null;
  }
}

/**
 * Get the user's current entitlements + purchase history.
 * Returns null if not available (web / not initialized).
 */
export async function getCustomerInfo(): Promise<any | null> {
  if (!isNativeApp()) return null;
  const plugin = await getPlugin();
  if (!plugin) return null;
  try {
    const result = await plugin.getCustomerInfo();
    return result.customerInfo;
  } catch (err) {
    console.error("[IAP] getCustomerInfo failed:", err);
    return null;
  }
}

/**
 * Purchase a package. Returns the updated customerInfo on success.
 * Throws on error. UI should catch and show a user-friendly message.
 */
export async function purchasePackage(pkg: any): Promise<any> {
  if (!isIOSApp()) {
    throw new Error("In-app purchases are only available in the iOS app.");
  }
  const plugin = await getPlugin();
  if (!plugin) throw new Error("Apple IAP isn't available — try again later.");
  const result = await plugin.purchasePackage({ aPackage: pkg });
  return result.customerInfo;
}

/**
 * Restore purchases — required by Apple for any app that sells IAPs.
 * Returns the updated customerInfo. Shows the "this works as expected"
 * even when there's nothing to restore.
 */
export async function restorePurchases(): Promise<any> {
  if (!isIOSApp()) {
    throw new Error("Restore is only available in the iOS app.");
  }
  const plugin = await getPlugin();
  if (!plugin) throw new Error("Apple IAP isn't available — try again later.");
  const result = await plugin.restorePurchases();
  return result.customerInfo;
}

/**
 * Subscribe to entitlement-changed events (renewals, expirations, etc.).
 * Pass a callback that re-reads the user's tier from your backend.
 * Returns an "unsubscribe" function (currently no-op for RC; reserved).
 */
export async function onCustomerInfoUpdate(
  cb: (info: any) => void
): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;
  const plugin = await getPlugin();
  if (!plugin) return () => undefined;
  try {
    await plugin.addCustomerInfoUpdateListener(cb);
  } catch (err) {
    console.warn("[IAP] addCustomerInfoUpdateListener failed:", err);
  }
  // RevenueCat's Capacitor plugin doesn't currently return a removal
  // handle — keep the API forward-compatible.
  return () => undefined;
}

/* ─── Entitlement helpers ───────────────────────────────────────── */

/**
 * Resolve the user's StrainSpotter tier from a RevenueCat customerInfo.
 * Mirrors the server-side logic in /api/iap/apple-webhook.
 */
export function tierFromCustomerInfo(
  customerInfo: any
): "free" | "member" | "pro" | "elite" {
  const active = customerInfo?.entitlements?.active ?? {};
  if (active.founder) return "elite"; // founder is a flavor of pro/unlimited
  if (active.pro) return "pro";
  if (active.member) return "member";
  return "free";
}
