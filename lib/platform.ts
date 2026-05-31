// lib/platform.ts
//
// Platform detection — answers "what runtime are we in?"
//   - "ios"   → Capacitor wrapper on iOS (App Store binary)
//   - "android" → Capacitor wrapper on Android (Play Store binary, future)
//   - "web"   → Plain browser (mobile or desktop)
//
// Apple guideline 3.1.1 forbids Stripe checkout (or any non-IAP digital
// purchase) inside the iOS binary. Anywhere we expose a "Subscribe" /
// "Buy topup" affordance, the UI must check this and route through the
// correct purchase pathway:
//   - web    → Stripe Checkout (existing flow)
//   - ios    → Apple IAP via RevenueCat (new flow)
//   - android → Google Play Billing via RevenueCat (future)
//
// SSR safe — returns "web" on the server, narrows on the client.

import { Capacitor } from "@capacitor/core";

export type Platform = "ios" | "android" | "web";

/** Current runtime. Safe to call from SSR (returns "web" then narrows). */
export function getPlatform(): Platform {
  if (typeof window === "undefined") return "web";
  try {
    const native = Capacitor.getPlatform();
    if (native === "ios") return "ios";
    if (native === "android") return "android";
  } catch {
    /* Capacitor not loaded — must be a plain web build. */
  }
  return "web";
}

/** True if we're running inside the Capacitor iOS binary. */
export function isIOSApp(): boolean {
  return getPlatform() === "ios";
}

/** True if we're running inside the Capacitor Android binary. */
export function isAndroidApp(): boolean {
  return getPlatform() === "android";
}

/** True if we're running in any native Capacitor binary. */
export function isNativeApp(): boolean {
  const p = getPlatform();
  return p === "ios" || p === "android";
}

/** True if we're in a plain browser (mobile or desktop). */
export function isWeb(): boolean {
  return getPlatform() === "web";
}
