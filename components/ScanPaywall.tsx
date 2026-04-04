"use client";

import { useState } from "react";
import {
  getScansRemaining,
  MEMBERSHIP_TIERS,
  TOPUP_PACKS,
  FREE_SCAN_TOTAL,
} from "@/lib/scanGating";

interface ScanPaywallProps {
  onClose: () => void;
  mode: "warning" | "locked";
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
    alert("Something went wrong. Please try again.");
  }
}

export default function ScanPaywall({ onClose, mode }: ScanPaywallProps) {
  const remaining = getScansRemaining();
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [showTopups, setShowTopups] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleEmailSubmit = () => {
    if (email && email.includes("@")) {
      if (typeof window !== "undefined") {
        localStorage.setItem("ss_email_collected", JSON.stringify({ email, ts: Date.now() }));
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
        padding: "20px",
        overflow: "auto",
      }}
      onClick={mode === "warning" ? onClose : undefined}
    >
      <div
        style={{
          background: "linear-gradient(160deg, #151a16, #1a2120)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "32px 24px",
          maxWidth: "400px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {mode === "locked" ? (
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>🔒</div>
            <h2 style={{ color: "#fff", fontSize: "22px", fontWeight: 800, margin: "0 0 8px" }}>
              You&apos;ve Used All {FREE_SCAN_TOTAL} Free Scans
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              Your free trial is over — but the best is just getting started. 
              Become a member to unlock unlimited AI-powered strain identification 
              and every feature StrainSpotter has to offer.
            </p>
          </div>
        ) : (
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>⚠️</div>
            <h2 style={{ color: "#FFB74D", fontSize: "20px", fontWeight: 800, margin: "0 0 8px" }}>
              {remaining === 1 ? "Last Scan Remaining!" : `Only ${remaining} Scans Left`}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              You started with {FREE_SCAN_TOTAL} free scans. Once they&apos;re gone, you&apos;ll need 
              a membership or top-up pack to keep scanning.
            </p>
          </div>
        )}

        {/* Membership Tiers */}
        <div style={{ marginBottom: "16px" }}>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px", textAlign: "center" }}>
            Membership Plans
          </p>

          {/* Member Tier */}
          <div
            style={{
              background: "rgba(76,175,80,0.08)",
              border: "1px solid rgba(76,175,80,0.25)",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div>
                <span style={{ color: "#66BB6A", fontSize: "16px", fontWeight: 800 }}>
                  🌿 {MEMBERSHIP_TIERS.member.name}
                </span>
              </div>
              <span style={{ color: "#66BB6A", fontSize: "20px", fontWeight: 800 }}>
                {MEMBERSHIP_TIERS.member.price}
              </span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {MEMBERSHIP_TIERS.member.features.map((f) => (
                <li key={f} style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", padding: "3px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#66BB6A" }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout("member")}
              disabled={loading === "member"}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: loading === "member" ? "#555" : "linear-gradient(135deg, #43A047, #2E7D32)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: loading === "member" ? "wait" : "pointer",
              }}
            >
              {loading === "member" ? "Loading..." : `Join as Member — ${MEMBERSHIP_TIERS.member.price}`}
            </button>
          </div>

          {/* Pro Tier */}
          <div
            style={{
              background: "rgba(255,215,0,0.05)",
              border: "1px solid rgba(255,215,0,0.2)",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "10px",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-8px",
                right: "16px",
                background: "linear-gradient(135deg, #FFD54F, #FF8F00)",
                color: "#000",
                fontSize: "9px",
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: "99px",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Best Value
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ color: "#FFD54F", fontSize: "16px", fontWeight: 800 }}>
                ⭐ {MEMBERSHIP_TIERS.pro.name}
              </span>
              <span style={{ color: "#FFD54F", fontSize: "20px", fontWeight: 800 }}>
                {MEMBERSHIP_TIERS.pro.price}
              </span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {MEMBERSHIP_TIERS.pro.features.map((f) => (
                <li key={f} style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", padding: "3px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#FFD54F" }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout("pro")}
              disabled={loading === "pro"}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: loading === "pro" ? "#555" : "linear-gradient(135deg, #FFD54F, #FF8F00)",
                color: "#000",
                fontSize: "14px",
                fontWeight: 700,
                cursor: loading === "pro" ? "wait" : "pointer",
              }}
            >
              {loading === "pro" ? "Loading..." : `Go Pro — ${MEMBERSHIP_TIERS.pro.price}`}
            </button>
          </div>
        </div>

        {/* Top-up section */}
        <div style={{ marginBottom: "16px" }}>
          <button
            onClick={() => setShowTopups(!showTopups)}
            style={{
              width: "100%",
              background: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              padding: "12px",
              color: "rgba(255,255,255,0.5)",
              fontSize: "13px",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            {showTopups ? "Hide" : "Just need a few more scans?"} {showTopups ? "▲" : "▼"}
          </button>

          {showTopups && (
            <div style={{ marginTop: "10px" }}>
              {/* Email gate for top-ups */}
              {!emailSubmitted && (
                <div
                  style={{
                    background: "rgba(79,195,247,0.06)",
                    border: "1px solid rgba(79,195,247,0.15)",
                    borderRadius: "12px",
                    padding: "14px",
                    marginBottom: "10px",
                  }}
                >
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", margin: "0 0 8px", lineHeight: 1.5 }}>
                    Enter your email to unlock scan top-up packs and get strain spotting tips, new feature alerts, and exclusive deals.
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                      style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "10px",
                        padding: "10px 12px",
                        color: "#fff",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={handleEmailSubmit}
                      style={{
                        background: "rgba(79,195,247,0.2)",
                        border: "1px solid rgba(79,195,247,0.3)",
                        borderRadius: "10px",
                        padding: "10px 16px",
                        color: "#4FC3F7",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Unlock
                    </button>
                  </div>
                </div>
              )}

              {emailSubmitted && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {TOPUP_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => handleCheckout(pack.id)}
                      disabled={loading === pack.id}
                      style={{
                        background: loading === pack.id ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        padding: "14px 16px",
                        color: "#fff",
                        fontSize: "14px",
                        cursor: loading === pack.id ? "wait" : "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>📷 {pack.scans} Scans</span>
                      <span style={{ color: "#4FC3F7", fontWeight: 700 }}>
                        {loading === pack.id ? "Loading..." : pack.price}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Why join section */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px", textAlign: "center" }}>
            Why Members Love StrainSpotter
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { emoji: "🎯", text: "Know exactly what you're smoking — AI identifies strains from a photo" },
              { emoji: "🌱", text: "Grow like a pro — step-by-step coaching from seed to harvest" },
              { emoji: "📍", text: "Find dispensaries near you — always know where to go" },
              { emoji: "🧬", text: "Explore strain genetics — family trees, terpenes, effects" },
              { emoji: "📊", text: "Track your journey — scan history, favorites, grow logs" },
            ].map((item) => (
              <div key={item.text} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.emoji}</span>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", lineHeight: 1.5, margin: 0 }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Dismiss for warnings */}
        {mode === "warning" && (
          <button
            onClick={onClose}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.3)",
              fontSize: "13px",
              cursor: "pointer",
              padding: "8px",
            }}
          >
            Continue with free scan →
          </button>
        )}
      </div>
    </div>
  );
}
