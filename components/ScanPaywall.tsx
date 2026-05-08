"use client";

// components/ScanPaywall.tsx
//
// Subscribe-only paywall (May 2026 — no free tier).
//
// Shown when an unsubscribed user tries to scan, run a diagnostic, or
// access any AI-powered feature. There is no "warning mode" anymore —
// every unsubscribed scan attempt opens this dialog.

import { useState } from "react";
import { MEMBERSHIP_TIERS, TOPUP_PACKS } from "@/lib/scanGating";

interface ScanPaywallProps {
  onClose: () => void;
  /** Optional context — what they were trying to do when the wall hit */
  reason?: "scan" | "diagnose" | "feature";
  /** When true (default), the modal can be dismissed by tapping the backdrop. */
  dismissible?: boolean;
}

async function startCheckout(priceKey: string, email?: string) {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceKey, email }),
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    alert("Couldn't start checkout. Please try again.");
  }
}

const REASON_COPY = {
  scan: {
    emoji: "📷",
    title: "Subscribe to start scanning",
    body: "StrainSpotter is subscriber-only. Pick a plan to unlock AI scanning, the full strain library, and Grow Doctor.",
  },
  diagnose: {
    emoji: "🩺",
    title: "Subscribe to use Grow Doctor",
    body: "Photo-based plant diagnostics are part of the StrainSpotter subscription. Pick a plan to start.",
  },
  feature: {
    emoji: "🌿",
    title: "Subscribe to unlock this feature",
    body: "This is a subscriber feature. Pick a plan to get full access to everything StrainSpotter does.",
  },
};

export default function ScanPaywall({
  onClose,
  reason = "scan",
  dismissible = true,
}: ScanPaywallProps) {
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [showTopups, setShowTopups] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const copy = REASON_COPY[reason];

  const handleEmailSubmit = () => {
    if (email && email.includes("@")) {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "ss_email_collected",
          JSON.stringify({ email, ts: Date.now() })
        );
      }
      setEmailSubmitted(true);
    }
  };

  const handleCheckout = async (priceKey: string) => {
    setLoading(priceKey);
    const savedEmail = emailSubmitted ? email : undefined;
    await startCheckout(priceKey, savedEmail);
    setLoading(null);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflow: "auto",
      }}
      onClick={dismissible ? onClose : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #151a16, #1a2120)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: "32px 24px",
          maxWidth: 420,
          width: "100%",
          maxHeight: "92vh",
          overflow: "auto",
          color: "#fff",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>{copy.emoji}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
            {copy.title}
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {copy.body}
          </p>
        </div>

        {/* Email capture (only if not submitted) */}
        {!emailSubmitted && (
          <div style={{ marginBottom: 18 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com (optional, prefills checkout)"
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "rgba(0,0,0,0.30)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 10,
                color: "#fff",
                fontSize: 14,
                outline: "none",
              }}
            />
            {email && email.includes("@") && (
              <button
                onClick={handleEmailSubmit}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "8px 0",
                  background: "rgba(76,175,80,0.15)",
                  border: "1px solid rgba(76,175,80,0.30)",
                  color: "#81C784",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Save email
              </button>
            )}
          </div>
        )}

        {/* Plans */}
        <div style={{ marginBottom: 16 }}>
          <p
            style={{
              color: "rgba(255,255,255,0.68)",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 2,
              margin: "0 0 10px",
              textAlign: "center",
            }}
          >
            Pick a plan
          </p>

          {/* Member */}
          <PlanCard
            highlight={false}
            badge="🌿"
            name={MEMBERSHIP_TIERS.member.name}
            price={MEMBERSHIP_TIERS.member.price}
            scans={MEMBERSHIP_TIERS.member.scans}
            features={MEMBERSHIP_TIERS.member.features as readonly string[]}
            ctaLabel={`Join — ${MEMBERSHIP_TIERS.member.price}`}
            loading={loading === "member"}
            onClick={() => handleCheckout("member")}
            color="#66BB6A"
          />

          {/* Pro */}
          <PlanCard
            highlight={true}
            badge="⭐"
            name={MEMBERSHIP_TIERS.pro.name}
            price={MEMBERSHIP_TIERS.pro.price}
            scans={MEMBERSHIP_TIERS.pro.scans}
            features={MEMBERSHIP_TIERS.pro.features as readonly string[]}
            ctaLabel={`Go Pro — ${MEMBERSHIP_TIERS.pro.price}`}
            loading={loading === "pro"}
            onClick={() => handleCheckout("pro")}
            color="#FFB74D"
          />
        </div>

        {/* Top-ups link */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <button
            onClick={() => setShowTopups((s) => !s)}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.75)",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Already a member? Buy a top-up pack
          </button>
        </div>

        {showTopups && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {TOPUP_PACKS.map((p) => (
              <button
                key={p.id}
                disabled={loading !== null}
                onClick={() => handleCheckout(p.id)}
                style={{
                  padding: "12px 10px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 700 }}>{p.label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", marginTop: 2 }}>
                  {p.price}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <p
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 12,
            textAlign: "center",
            margin: "12px 0 0",
            lineHeight: 1.6,
          }}
        >
          Cancel anytime. By subscribing you agree to our Terms and Privacy Policy.
        </p>

        {dismissible && (
          <button
            onClick={onClose}
            style={{
              width: "100%",
              marginTop: 14,
              padding: "10px 0",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10,
              color: "rgba(255,255,255,0.55)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Maybe later
          </button>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  highlight,
  badge,
  name,
  price,
  scans,
  features,
  ctaLabel,
  loading,
  onClick,
  color,
}: {
  highlight: boolean;
  badge: string;
  name: string;
  price: string;
  scans: string;
  features: readonly string[];
  ctaLabel: string;
  loading: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <div
      style={{
        background: highlight ? `${color}14` : "rgba(255,255,255,0.04)",
        border: highlight ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color, fontSize: 16, fontWeight: 800 }}>
          {badge} {name}
        </span>
        <span style={{ color, fontSize: 20, fontWeight: 800 }}>{price}</span>
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>
        {scans}
      </div>
      <ul
        style={{
          margin: 0,
          padding: "0 0 0 16px",
          fontSize: 12,
          color: "rgba(255,255,255,0.75)",
          lineHeight: 1.6,
        }}
      >
        {features.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
      <button
        disabled={loading}
        onClick={onClick}
        style={{
          width: "100%",
          marginTop: 12,
          padding: "11px 0",
          background: loading
            ? "rgba(255,255,255,0.08)"
            : `linear-gradient(135deg, ${color}, ${color}dd)`,
          color: loading ? "rgba(255,255,255,0.78)" : "#0a0f0a",
          border: "none",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 800,
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: 0.3,
        }}
      >
        {loading ? "Loading…" : ctaLabel}
      </button>
    </div>
  );
}
