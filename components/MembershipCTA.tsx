"use client";

// components/MembershipCTA.tsx
//
// Subscription nudge component used in:
//   - "banner" variant — top of pages for unsubscribed users
//   - "inline" variant — embedded callout
//   - "scanner-status" variant — slim status row above the scan button
//
// May 2026 pivot: free-tier UI removed. The component now only checks
// "are you subscribed" and either renders nothing (subscribed) or a
// subscribe nudge (not subscribed).

import { useEffect, useState } from "react";
import { isSubscribed, MEMBERSHIP_TIERS } from "@/lib/scanGating";
import ScanPaywall from "@/components/ScanPaywall";

interface MembershipCTAProps {
  variant?: "banner" | "inline" | "scanner-status";
}

export default function MembershipCTA({ variant = "banner" }: MembershipCTAProps) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    setSubscribed(isSubscribed());
  }, []);

  // SSR / pre-mount: render nothing
  if (subscribed === null) return null;

  // Subscribed: nothing to nudge
  if (subscribed) return null;

  /* ─── scanner-status: slim row above scan button ─── */
  if (variant === "scanner-status") {
    return (
      <>
        <div
          onClick={() => setShowPaywall(true)}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "12px 16px",
            marginBottom: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 18 }}>🔒</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 2,
              }}
            >
              Subscribe to scan
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 13,
              }}
            >
              From {MEMBERSHIP_TIERS.member.price} · Cancel anytime
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#81C784",
              padding: "4px 10px",
              background: "rgba(76,175,80,0.15)",
              borderRadius: 99,
            }}
          >
            View plans
          </span>
        </div>
        {showPaywall && (
          <ScanPaywall onClose={() => setShowPaywall(false)} reason="scan" />
        )}
      </>
    );
  }

  /* ─── inline: small embedded callout ─── */
  if (variant === "inline") {
    return (
      <>
        <div
          onClick={() => setShowPaywall(true)}
          style={{
            background: "rgba(76,175,80,0.06)",
            border: "1px solid rgba(76,175,80,0.20)",
            borderRadius: 14,
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22 }}>🌿</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
              Become a StrainSpotter Member
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 12,
                marginTop: 2,
                lineHeight: 1.4,
              }}
            >
              Unlock AI scanning, Grow Doctor, and the full strain library.
              Starting at {MEMBERSHIP_TIERS.member.price}.
            </div>
          </div>
        </div>
        {showPaywall && (
          <ScanPaywall onClose={() => setShowPaywall(false)} reason="feature" />
        )}
      </>
    );
  }

  /* ─── default banner ─── */
  return (
    <>
      <div
        onClick={() => setShowPaywall(true)}
        style={{
          background: "linear-gradient(135deg, rgba(76,175,80,0.10), rgba(46,125,50,0.18))",
          border: "1px solid rgba(76,175,80,0.30)",
          borderRadius: 16,
          padding: "20px 22px",
          cursor: "pointer",
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>🌿</div>
        <p
          style={{
            color: "#66BB6A",
            fontSize: 13,
            fontWeight: 800,
            margin: "0 0 4px",
          }}
        >
          Become a StrainSpotter Member
        </p>
        <p
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 12,
            lineHeight: 1.55,
            margin: "0 0 12px",
          }}
        >
          AI Scan &amp; Analyze, Grow Doctor diagnostics, full strain library, and more — from {MEMBERSHIP_TIERS.member.price}.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {["📷 AI Scanner", "🩺 Grow Doctor", "📍 Dispensaries", "🧬 Library"].map((tag) => (
            <span
              key={tag}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 99,
                padding: "4px 10px",
                fontSize: 12,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      {showPaywall && (
        <ScanPaywall onClose={() => setShowPaywall(false)} reason="feature" />
      )}
    </>
  );
}
