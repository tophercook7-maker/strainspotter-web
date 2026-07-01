"use client";

// components/UpgradeNudge.tsx
//
// Contextual upgrade prompt for Member-tier users approaching their
// monthly scan cap. Three states:
//
//   1. "Approaching" — Member with ≤20% scans left (~20/100 by default).
//      Soft inline banner: "Running low. Upgrade to Pro for 300 scans/mo."
//
//   2. "At limit" — Member with 0 remaining and no topups.
//      Modal overlay with two clear paths:
//        a) Upgrade to Pro ($9.99/mo) — switches subscription tier
//        b) Buy a top-up pack — keeps current plan, adds credits
//
//   3. Otherwise — renders nothing.
//
// Why this exists:
//   • Member→Pro expansion is the single most direct revenue lever.
//   • Without a nudge, a Member who hits 100 scans just gets a hard
//     wall and is likely to bounce. The nudge converts that frustration
//     into a purchase decision.
//
// Usage:
//   <UpgradeNudge accessToken={auth?.session?.access_token ?? null}
//                 userId={auth?.user?.id ?? null} />
//
// Place this somewhere visible on the scanner page (above the Pick
// Photos button is the canonical spot). It's a no-op for Free users
// (the regular paywall handles them) and Pro users (no cap).

import { useEffect, useState } from "react";
import { startPurchase } from "@/lib/iap/purchaseRouter";

interface UsageState {
  tier: "free" | "member" | "pro";
  monthlyCap: number | null;
  monthlyUsed: number;
  monthlyRemaining: number | null;
  topupRemaining: number;
  approachingLimit: boolean;
  atLimit: boolean;
}

interface Props {
  accessToken: string | null;
  userId: string | null;
  /** Optional override — set true when the parent already knows the user
   *  hit the wall (e.g. caught a 429 from /api/scan). */
  forceAtLimit?: boolean;
}

export default function UpgradeNudge({
  accessToken,
  userId,
  forceAtLimit,
}: Props) {
  const [state, setState] = useState<UsageState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Fetch usage on mount + when token changes.
  useEffect(() => {
    if (!accessToken) {
      setState(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/scan/usage", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as UsageState;
        if (!cancelled) setState(data);
      } catch {
        /* Non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // Reset dismissed state when usage moves past or away from the threshold,
  // so a user who dismisses at 80% used will see the nudge again at 100%.
  useEffect(() => {
    setDismissed(false);
  }, [state?.atLimit, state?.approachingLimit]);

  if (!state || !accessToken || !userId) return null;
  if (state.tier !== "member") return null;

  const atLimit = !!(state.atLimit || forceAtLimit);
  const approaching = state.approachingLimit && !atLimit;

  if (!atLimit && !approaching) return null;
  if (approaching && dismissed) return null;

  const handlePurchase = async (priceKey: string) => {
    setPurchasing(priceKey);
    const result = await startPurchase({ priceKey, userId });
    if (result.ok && result.via === "stripe") {
      window.location.href = result.redirectUrl;
      return;
    }
    setPurchasing(null);
    if (result.ok === false) {
      // eslint-disable-next-line no-alert
      alert(result.error);
    }
    // Apple IAP success → webhook updates Supabase; next /api/scan/usage
    // poll will reflect the change.
  };

  /* ── At-limit modal ─────────────────────────────────────────────── */
  if (atLimit) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9990,
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          overflow: "auto",
        }}
      >
        <div
          style={{
            background: "linear-gradient(160deg, #151a16, #1a2120)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 20,
            padding: "26px 22px",
            maxWidth: 380,
            width: "100%",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 38, marginBottom: 10 }}>⚡</div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              margin: "0 0 10px",
              color: "#FFB74D",
            }}
          >
            You've used all 100 scans this month
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.6,
              margin: "0 0 18px",
            }}
          >
            Your Member tier resets at the start of next month. Two ways to
            keep scanning today:
          </p>

          {/* Pro upsell */}
          <button
            disabled={purchasing !== null}
            onClick={() => handlePurchase("pro")}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 12,
              background:
                purchasing === "pro"
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(135deg, #FFB74D, #F57C00)",
              color: purchasing === "pro" ? "rgba(255,255,255,0.7)" : "#0a0f0a",
              border: "none",
              fontSize: 14,
              fontWeight: 900,
              cursor: purchasing ? "not-allowed" : "pointer",
              marginBottom: 10,
              letterSpacing: 0.3,
            }}
          >
            {purchasing === "pro"
              ? "Loading…"
              : "⭐ Upgrade to Pro — $9.99/mo · 300 scans/month"}
          </button>

          {/* Top-up alternative */}
          <button
            disabled={purchasing !== null}
            onClick={() => handlePurchase("topup_20")}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 13,
              fontWeight: 700,
              cursor: purchasing ? "not-allowed" : "pointer",
              marginBottom: 10,
            }}
          >
            {purchasing === "topup_20"
              ? "Loading…"
              : "Or: 20 scans for $4.99 — keep my Member plan"}
          </button>

          {/* Best-value top-up alternative */}
          <button
            disabled={purchasing !== null}
            onClick={() => handlePurchase("topup_50")}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 12,
              background: "transparent",
              color: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(255,255,255,0.10)",
              fontSize: 12,
              fontWeight: 600,
              cursor: purchasing ? "not-allowed" : "pointer",
              marginBottom: 12,
            }}
          >
            {purchasing === "topup_50"
              ? "Loading…"
              : "50 scans for $9.99 (best value)"}
          </button>

          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.40)",
              lineHeight: 1.5,
            }}
          >
            Topups stack with your Member plan — credits never expire.
          </div>
        </div>
      </div>
    );
  }

  /* ── Approaching-limit inline banner ────────────────────────────── */
  return (
    <div
      style={{
        background: "rgba(255,183,77,0.10)",
        border: "1px solid rgba(255,183,77,0.30)",
        borderRadius: 14,
        padding: "12px 14px",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 22 }}>⚡</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "#FFB74D",
            fontSize: 13,
            fontWeight: 800,
            marginBottom: 2,
          }}
        >
          {state.monthlyRemaining} scan
          {state.monthlyRemaining === 1 ? "" : "s"} left this month
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 11,
            lineHeight: 1.4,
          }}
        >
          Upgrade to Pro — 300 scans/month for $9.99/mo.
        </div>
      </div>
      <button
        disabled={purchasing !== null}
        onClick={() => handlePurchase("pro")}
        style={{
          padding: "7px 14px",
          borderRadius: 99,
          background: "linear-gradient(135deg, #FFB74D, #F57C00)",
          color: "#0a0f0a",
          border: "none",
          fontSize: 12,
          fontWeight: 800,
          cursor: purchasing ? "not-allowed" : "pointer",
          flexShrink: 0,
        }}
      >
        {purchasing === "pro" ? "…" : "Upgrade"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.45)",
          fontSize: 16,
          cursor: "pointer",
          padding: 4,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
