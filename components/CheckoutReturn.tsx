"use client";

import { useEffect, useState } from "react";

/**
 * Detects ?checkout=success&session_id=... in the URL after Stripe redirect.
 * Verifies the session, sets localStorage tier, shows a celebration, then cleans URL.
 */
export default function CheckoutReturn() {
  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >("idle");
  const [tierName, setTierName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");

    if (checkout === "success" && sessionId) {
      verifySession(sessionId);
    } else if (checkout === "cancelled") {
      // User cancelled — just clean the URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifySession(sessionId: string) {
    setStatus("verifying");
    try {
      const res = await fetch(
        `/api/stripe/verify-session?session_id=${sessionId}`
      );
      const data = await res.json();

      if (data.tier) {
        activateMembership(data.tier, data.email, data.name);
        return;
      }
    } catch {
      // Network error — fall through to localStorage fallback
    }

    // Fallback: if verify fails, check localStorage for saved signup info
    try {
      const raw = localStorage.getItem("ss_signup_info");
      if (raw) {
        const signup = JSON.parse(raw);
        if (signup.plan === "member" || signup.plan === "pro") {
          activateMembership(signup.plan, signup.email, signup.name);
          return;
        }
      }
    } catch {
      // ignore
    }

    setStatus("error");
  }

  function activateMembership(
    tier: "member" | "pro",
    email?: string,
    name?: string
  ) {
    // Set tier
    localStorage.setItem("ss_membership_tier", tier);

    // Store full membership info
    localStorage.setItem(
      "ss_member_info",
      JSON.stringify({
        tier,
        email: email || "",
        name: name || "",
        activatedAt: Date.now(),
      })
    );

    // Preserve moderator interest if it was set during signup
    try {
      const raw = localStorage.getItem("ss_signup_info");
      if (raw) {
        const signup = JSON.parse(raw);
        if (signup.moderatorInterest) {
          localStorage.setItem("ss_moderator_interest", "true");
        }
      }
    } catch {
      // ignore
    }

    // Clean up signup temp data
    localStorage.removeItem("ss_signup_info");

    setTierName(tier === "pro" ? "Pro" : "Member");
    setStatus("success");

    // After celebration, clean URL and refresh page so gating re-evaluates
    setTimeout(() => {
      window.history.replaceState({}, "", window.location.pathname);
      window.location.reload();
    }, 2500);
  }

  if (status === "idle") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.95)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {status === "verifying" && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
              animation: "ssPulse 1.5s ease-in-out infinite",
            }}
          >
            🌿
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            Setting up your membership...
          </p>
          <style>{`@keyframes ssPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.1); } }`}</style>
        </div>
      )}

      {status === "success" && (
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2
            style={{
              color: "#fff",
              fontSize: 24,
              fontWeight: 800,
              margin: "0 0 8px",
            }}
          >
            Welcome to StrainSpotter {tierName}!
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            You now have full access to The Garden. Let&apos;s grow. 🌱
          </p>
        </div>
      )}

      {status === "error" && (
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2
            style={{
              color: "#FFB74D",
              fontSize: 20,
              fontWeight: 800,
              margin: "0 0 8px",
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 14,
              marginBottom: 20,
            }}
          >
            Your payment may have gone through. Check your email for
            confirmation.
          </p>
          <button
            onClick={() => {
              setStatus("idle");
              window.history.replaceState({}, "", window.location.pathname);
            }}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: "12px 24px",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Continue to Scanner
          </button>
        </div>
      )}
    </div>
  );
}
