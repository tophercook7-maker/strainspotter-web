"use client";

// components/ManageSubscriptionButton.tsx
//
// Single button that opens the right subscription-management surface
// for the user's current rail:
//   • Web (Stripe)   → POST /api/stripe/portal, redirect to Stripe Customer Portal
//   • iOS (Apple)    → opens itms-apps://apps.apple.com/account/subscriptions,
//                      which deep-links into the App Store's manage subscriptions UI
//
// REQUIRED for App Store compliance:
//   • Guideline 3.1.2 — subscription apps must provide a way to manage and
//     cancel the subscription. Apple links work; Stripe portal does NOT
//     satisfy this on iOS (digital good = must use Apple's plumbing).
//
// REQUIRED for Stripe compliance:
//   • Stripe requires users to be able to cancel through a self-serve flow.
//     Customer Portal satisfies this for web checkouts.
//
// Use this in the settings page and anywhere else "Manage Subscription"
// might live (account dropdown, tier badge tap, etc.).

import { useState } from "react";
import { isIOSApp, isAndroidApp } from "@/lib/platform";

interface Props {
  /** Supabase auth token (auth.session?.access_token). */
  accessToken: string | null;
  /** Stripe customer id, if known. We don't gate the button on it — the
   *  Stripe portal call itself will tell us if the user has no customer. */
  hasStripeCustomer?: boolean;
  /** Variant — full-width button, or compact inline link. */
  variant?: "button" | "link";
  /** Optional override label. */
  label?: string;
}

const APPLE_SUBSCRIPTIONS_URL =
  "itms-apps://apps.apple.com/account/subscriptions";
const ANDROID_SUBSCRIPTIONS_URL =
  "https://play.google.com/store/account/subscriptions";

export default function ManageSubscriptionButton({
  accessToken,
  hasStripeCustomer = true,
  variant = "button",
  label,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ios = isIOSApp();
  const android = isAndroidApp();

  const onClick = async () => {
    setError(null);

    // ── iOS path: deep-link into App Store subscriptions ────────
    if (ios) {
      // Capacitor WebView treats itms-apps:// as a system handler.
      // window.location works in practice; Browser.open would also work
      // but adds a dependency we don't need.
      window.location.href = APPLE_SUBSCRIPTIONS_URL;
      return;
    }

    // ── Android path (when we ship): Play Store subscriptions ───
    if (android) {
      window.location.href = ANDROID_SUBSCRIPTIONS_URL;
      return;
    }

    // ── Web path: Stripe Customer Portal ────────────────────────
    if (!accessToken) {
      setError("Sign in to manage your subscription.");
      return;
    }
    if (!hasStripeCustomer) {
      setError(
        "We don't have a billing record on file. Contact support to manage your subscription."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setError(data?.error || "Couldn't open the billing portal.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  };

  const buttonLabel =
    label ??
    (ios
      ? "Manage subscription in App Store"
      : android
        ? "Manage subscription in Play Store"
        : "Manage subscription");

  if (variant === "link") {
    return (
      <div>
        <button
          onClick={onClick}
          disabled={loading}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.75)",
            fontSize: 13,
            textDecoration: "underline",
            cursor: loading ? "wait" : "pointer",
            padding: 0,
          }}
        >
          {loading ? "Opening…" : buttonLabel}
        </button>
        {error && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#EF9A9A" }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onClick}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px 16px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12,
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          cursor: loading ? "wait" : "pointer",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{loading ? "Opening…" : buttonLabel}</span>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 18 }}>›</span>
      </button>
      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#EF9A9A" }}>
          {error}
        </div>
      )}
    </div>
  );
}
