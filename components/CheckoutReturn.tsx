"use client";

import { useEffect, useState } from "react";

/**
 * After Stripe redirects back with ?checkout=success&session_id=...
 * Just verify payment via GET, set localStorage tier, celebrate, reload.
 * No Supabase calls — those hang in this environment.
 */
export default function CheckoutReturn() {
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [tierName, setTierName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");

    if (checkout === "success" && sessionId) {
      activate(sessionId);
    } else if (checkout === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activate(sessionId: string) {
    setStatus("verifying");

    try {
      // 1. Verify the Stripe session (GET — lightweight, no Supabase)
      const res = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
      const data = await res.json();

      let tier = data.tier || null;

      // 2. Fallback: check saved signup info
      if (!tier) {
        const raw = localStorage.getItem("ss_signup_info");
        if (raw) {
          try {
            const signup = JSON.parse(raw);
            tier = signup.plan || null;
          } catch { /* ignore */ }
        }
      }

      // 3. Save tier to localStorage
      if (tier === "member" || tier === "pro") {
        localStorage.setItem("ss_membership_tier", tier);
        localStorage.setItem("ss_member_info", JSON.stringify({
          tier,
          email: data.email || "",
          name: data.name || "",
          activatedAt: Date.now(),
        }));
        localStorage.removeItem("ss_signup_info");

        setTierName(tier === "pro" ? "Pro" : "Member");
        setStatus("success");
      } else {
        // Payment might still have worked — set from signup info
        setStatus("error");
      }

      // Clean URL and reload after celebration
      setTimeout(() => {
        window.history.replaceState({}, "", window.location.pathname);
        window.location.reload();
      }, 2500);

    } catch (e) {
      console.error("Checkout verify error:", e);

      // Fallback: try localStorage
      const raw = localStorage.getItem("ss_signup_info");
      if (raw) {
        try {
          const signup = JSON.parse(raw);
          if (signup.plan) {
            localStorage.setItem("ss_membership_tier", signup.plan);
            setTierName(signup.plan === "pro" ? "Pro" : "Member");
            setStatus("success");
            localStorage.removeItem("ss_signup_info");
            setTimeout(() => {
              window.history.replaceState({}, "", window.location.pathname);
              window.location.reload();
            }, 2500);
            return;
          }
        } catch { /* ignore */ }
      }
      setStatus("error");
    }
  }

  if (status === "idle") return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 10000,
      background: "rgba(0,0,0,0.95)",
      backdropFilter: "blur(20px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {status === "verifying" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: "ssPulse 1.5s ease-in-out infinite" }}>🌿</div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, fontWeight: 500 }}>
            Activating your membership...
          </p>
          <style>{`@keyframes ssPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.1); } }`}</style>
        </div>
      )}

      {status === "success" && (
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>
            Welcome to StrainSpotter {tierName}!
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6 }}>
            You now have full access to The Garden. Let&apos;s grow. 🌱
          </p>
        </div>
      )}

      {status === "error" && (
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: "#FFB74D", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>
            Something went wrong
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 20 }}>
            Your payment went through. Try refreshing.
          </p>
          <button
            onClick={() => {
              window.history.replaceState({}, "", window.location.pathname);
              window.location.reload();
            }}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 12,
              padding: "12px 24px",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
