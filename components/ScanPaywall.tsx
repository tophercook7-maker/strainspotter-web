"use client";

import { apiUrl } from "@/lib/config/apiBase";
import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMembershipPlan } from "@/lib/auth/useMembershipPlan";
import {
  getScansRemaining,
  MEMBERSHIP_TIERS,
  TOPUP_PACKS,
  FREE_SCAN_TOTAL,
} from "@/lib/scanGating";
import { WEB_VS_MOBILE_PAYWALL_FOOTNOTE } from "@/lib/scanner/webVsMobileMessaging";
import MobileAppCtaLink from "@/components/MobileAppCtaLink";
import SSBadge from "@/components/ui/SSBadge";
import SSButton from "@/components/ui/SSButton";
import SSCard from "@/components/ui/SSCard";

interface ScanPaywallProps {
  onClose: () => void;
  mode: "warning" | "locked";
}

async function startCheckout(
  priceKey: string,
  opts?: { email?: string; userId?: string }
) {
  const res = await fetch(apiUrl("/api/stripe/checkout"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      priceKey,
      ...(opts?.email ? { email: opts.email } : {}),
      ...(opts?.userId ? { userId: opts.userId } : {}),
    }),
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    alert("Something went wrong. Please try again.");
  }
}

function planChipLabel(tier: string) {
  if (tier === "pro") return "Pro";
  if (tier === "member") return "Member";
  return "Free";
}

export default function ScanPaywall({ onClose, mode }: ScanPaywallProps) {
  const { user } = useAuth();
  const mp = useMembershipPlan();
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
    const emailForStripe = savedEmail || user?.email || undefined;
    await startCheckout(priceKey, {
      email: emailForStripe,
      userId: user?.id,
    });
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
        {user && (
          <SSCard padding="10px 12px" style={{ textAlign: "center", marginBottom: 16, boxShadow: "none" }}>
            <div
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                marginBottom: 4,
              }}
            >
              Your account
            </div>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>
              {mp.entitlementsStatus === "loading" || mp.entitlementsStatus === "idle"
                ? "Updating plan…"
                : mp.entitlementsStatus === "error"
                  ? "Plan unavailable (offline?)"
                  : `Plan: ${planChipLabel(mp.membershipPlanTier)}`}
            </div>
          </SSCard>
        )}

        {/* Header */}
        {mode === "locked" ? (
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>🔒</div>
            <h2 style={{ color: "#fff", fontSize: "22px", fontWeight: 800, margin: "0 0 8px" }}>
              You&apos;ve Used All {FREE_SCAN_TOTAL} Free Scans
            </h2>
            <p style={{ color: "rgba(255,255,255,0.58)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              Your free scans are used. Upgrade to keep scanning, save results, and unlock the Garden tools tied to your account.
            </p>
          </div>
        ) : (
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>⚠️</div>
            <h2 style={{ color: "#FFB74D", fontSize: "20px", fontWeight: 800, margin: "0 0 8px" }}>
              {remaining === 1 ? "Last Scan Remaining!" : `Only ${remaining} Scans Left`}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.58)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              You started with {FREE_SCAN_TOTAL} free scans. Upgrade or add a top-up when you need more.
            </p>
          </div>
        )}

        <div
          style={{
            textAlign: "center",
            margin: "0 0 18px",
            padding: "0 10px",
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.38)",
              fontSize: 12,
              lineHeight: 1.55,
              margin: "0 0 8px",
            }}
          >
            {WEB_VS_MOBILE_PAYWALL_FOOTNOTE}
          </p>
          <MobileAppCtaLink fontSize={12} marginTop={0} />
        </div>

        {/* Membership Tiers */}
        <div style={{ marginBottom: "16px" }}>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px", textAlign: "center" }}>
            Membership Plans
          </p>

          {/* Member Tier */}
          <SSCard tone="success" style={{ marginBottom: 10 }}>
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
            <SSButton
              variant="primary"
              fullWidth
              onClick={() => handleCheckout("member")}
              disabled={loading === "member"}
              style={{ marginTop: 12, padding: 12, borderRadius: 12 }}
            >
              {loading === "member" ? "Loading..." : `Join as Member — ${MEMBERSHIP_TIERS.member.price}`}
            </SSButton>
          </SSCard>

          {/* Pro Tier */}
          <SSCard
            tone="warning"
            style={{
              marginBottom: "10px",
              position: "relative",
            }}
          >
            <SSBadge
              tone="gold"
              style={{
                position: "absolute",
                top: "-8px",
                right: "16px",
                background: "linear-gradient(135deg, #FFD54F, #FF8F00)",
                color: "#000",
                fontSize: "9px",
                padding: "3px 10px",
                letterSpacing: "1px",
              }}
            >
              Best Value
            </SSBadge>
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
            <SSButton
              fullWidth
              onClick={() => handleCheckout("pro")}
              disabled={loading === "pro"}
              style={{
                marginTop: "12px",
                padding: "12px",
                borderRadius: "12px",
                background: loading === "pro" ? "#555" : "linear-gradient(135deg, #FFD54F, #FF8F00)",
                color: "#000",
              }}
            >
              {loading === "pro" ? "Loading..." : `Go Pro — ${MEMBERSHIP_TIERS.pro.price}`}
            </SSButton>
          </SSCard>
        </div>

        {/* Top-up section */}
        <div style={{ marginBottom: "16px" }}>
          <SSButton
            variant="secondary"
            fullWidth
            onClick={() => setShowTopups(!showTopups)}
            style={{
              background: "none",
              borderRadius: "12px",
              padding: "12px",
              color: "rgba(255,255,255,0.5)",
              fontSize: "13px",
              textAlign: "center",
            }}
          >
            {showTopups ? "Hide" : "Just need a few more scans?"} {showTopups ? "▲" : "▼"}
          </SSButton>

          {showTopups && (
            <div style={{ marginTop: "10px" }}>
              {/* Email gate for top-ups */}
              {!emailSubmitted && (
                <SSCard tone="info" padding={14} style={{ marginBottom: 10 }}>
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
                    <SSButton
                      variant="info"
                      onClick={handleEmailSubmit}
                      style={{ borderRadius: 10, padding: "10px 16px", fontSize: 13, whiteSpace: "nowrap" }}
                    >
                      Unlock
                    </SSButton>
                  </div>
                </SSCard>
              )}

              {emailSubmitted && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {TOPUP_PACKS.map((pack) => (
                    <SSButton
                      variant="secondary"
                      key={pack.id}
                      onClick={() => handleCheckout(pack.id)}
                      disabled={loading === pack.id}
                      style={{
                        borderRadius: "12px",
                        padding: "14px 16px",
                        color: "#fff",
                        fontSize: "14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>📷 {pack.scans} Scans</span>
                      <span style={{ color: "#4FC3F7", fontWeight: 700 }}>
                        {loading === pack.id ? "Loading..." : pack.price}
                      </span>
                    </SSButton>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Why join section */}
        <SSCard padding={16} style={{ marginBottom: "16px", boxShadow: "none" }}>
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
        </SSCard>

        {/* Dismiss for warnings */}
        {mode === "warning" && (
          <SSButton
            variant="ghost"
            fullWidth
            onClick={onClose}
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: "13px",
              padding: "8px",
            }}
          >
            Continue with free scan →
          </SSButton>
        )}
      </div>
    </div>
  );
}
