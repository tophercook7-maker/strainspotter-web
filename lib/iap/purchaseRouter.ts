// lib/iap/purchaseRouter.ts
//
// Single entry point for "start a purchase" that handles both platforms:
//   • web  → Stripe Checkout (existing behavior)
//   • ios  → Apple IAP via RevenueCat
//   • android → (future) Google Play Billing via RevenueCat
//
// This is the ONLY place that should decide which payment rail to use.
// All UI components (ScanPaywall, MembershipCTA, settings, etc.) call
// startPurchase() and let this module route correctly. Apple guideline
// 3.1.1 violations always come from missing this routing somewhere — so
// keep the surface small.

import { isIOSApp, isWeb } from "@/lib/platform";
import { SKU_TO_APPLE } from "@/lib/iap/products";
import {
  fetchOfferings,
  initRevenueCat,
  purchasePackage,
} from "@/lib/iap/revenueCatClient";

export type PurchaseOutcome =
  | { ok: true; via: "stripe"; redirectUrl: string }
  | { ok: true; via: "apple_iap"; customerInfo: any }
  | { ok: false; via: "stripe" | "apple_iap"; error: string };

interface StartPurchaseArgs {
  /** Internal SKU key — "member" | "pro" |
   *  "topup_10" | "topup_20" | "topup_50" */
  priceKey: string;
  /** Supabase auth user id. Required on iOS for RevenueCat aliasing. */
  userId?: string | null;
  /** Email for Stripe checkout pre-fill. Ignored on iOS. */
  email?: string | null;
}

/**
 * Route a purchase to the correct rail based on runtime platform.
 *
 * Web → POSTs to /api/stripe/checkout, returns the Stripe URL for redirect.
 *       Caller should set window.location.href = result.redirectUrl.
 *
 * iOS → Initializes RevenueCat with the user, finds the matching package
 *       in the current offering, and triggers Apple's native purchase
 *       sheet. The webhook updates Supabase asynchronously — caller
 *       should refresh profile state after the promise resolves.
 */
export async function startPurchase(
  args: StartPurchaseArgs
): Promise<PurchaseOutcome> {
  if (isIOSApp()) {
    return startApplePurchase(args);
  }
  // Default — web (or Android until we plumb that rail in too).
  return startStripePurchase(args);
}

/* ─── Stripe (web) ─────────────────────────────────────────────── */

async function startStripePurchase(
  args: StartPurchaseArgs
): Promise<PurchaseOutcome> {
  try {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceKey: args.priceKey,
        email: args.email ?? undefined,
        userId: args.userId ?? undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.url) {
      return {
        ok: false,
        via: "stripe",
        error: data?.error || "Couldn't start checkout.",
      };
    }
    return { ok: true, via: "stripe", redirectUrl: data.url as string };
  } catch (err) {
    return {
      ok: false,
      via: "stripe",
      error: err instanceof Error ? err.message : "Network error.",
    };
  }
}

/* ─── Apple IAP (iOS via RevenueCat) ───────────────────────────── */

async function startApplePurchase(
  args: StartPurchaseArgs
): Promise<PurchaseOutcome> {
  try {
    await initRevenueCat(args.userId ?? null);

    const offering = await fetchOfferings();
    if (!offering) {
      return {
        ok: false,
        via: "apple_iap",
        error:
          "The App Store offering isn't available right now. Check your connection and try again.",
      };
    }

    const appleProductId = SKU_TO_APPLE[args.priceKey];
    if (!appleProductId) {
      return {
        ok: false,
        via: "apple_iap",
        error: `Unknown product: ${args.priceKey}`,
      };
    }

    // Find the package within the offering. RevenueCat structures things
    // as `offering.availablePackages: [{ identifier, product, ... }]`.
    // We match by the underlying Apple product identifier so the mapping
    // works regardless of how packages are named in the RC dashboard.
    const pkg = (offering.availablePackages || []).find(
      (p: any) =>
        p?.product?.identifier === appleProductId ||
        p?.identifier === appleProductId
    );
    if (!pkg) {
      return {
        ok: false,
        via: "apple_iap",
        error:
          "This plan isn't available in the App Store offering. Pick a different plan.",
      };
    }

    const customerInfo = await purchasePackage(pkg);
    return { ok: true, via: "apple_iap", customerInfo };
  } catch (err: any) {
    // RevenueCat throws with `userCancelled: true` when the user dismissed
    // the system purchase sheet. Surface that as a clean cancel, not an
    // error toast.
    if (err?.userCancelled === true || /cancel/i.test(err?.message || "")) {
      return { ok: false, via: "apple_iap", error: "Purchase cancelled." };
    }
    return {
      ok: false,
      via: "apple_iap",
      error:
        err instanceof Error
          ? err.message
          : "Apple In-App Purchase failed. Try again.",
    };
  }
}

/**
 * "Restore Purchases" — Apple requires this button somewhere in the app
 * for any IAP-enabled binary. Hooks into RevenueCat and triggers a
 * webhook fire if anything was restored.
 *
 * Returns true if any active entitlement was found, false if nothing
 * to restore. Throws on hard error.
 */
export async function restorePurchasesIfNeeded(): Promise<boolean> {
  if (!isIOSApp()) return false;
  const { restorePurchases, tierFromCustomerInfo } = await import(
    "@/lib/iap/revenueCatClient"
  );
  const customerInfo = await restorePurchases();
  const tier = tierFromCustomerInfo(customerInfo);
  return tier !== "free";
}

/* ─── UX helpers — what should the paywall show? ───────────────── */

/** True if the current platform sells via Apple IAP, not Stripe. */
export function isApplePurchaseRail(): boolean {
  return isIOSApp();
}

/** Copy variant: "Subscribe via App Store" vs "Subscribe". */
export function purchaseButtonSuffix(): string {
  return isIOSApp() ? " · via App Store" : "";
}
