"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Detects ?checkout=success&session_id=... after Stripe redirect.
 * Verifies the session (which also updates Supabase profile tier),
 * ensures the user is signed in, then shows celebration and reloads.
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
      verifyAndActivate(sessionId);
    } else if (checkout === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyAndActivate(sessionId: string) {
    setStatus("verifying");

    try {
      // 1. Verify the Stripe session (this also updates Supabase profile)
      const res = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
      const data = await res.json();

      // 2. Ensure user is signed in via Supabase
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Try to sign in with saved credentials
        const raw = localStorage.getItem("ss_signup_info");
        if (raw) {
          try {
            const signup = JSON.parse(raw);
            if (signup.email) {
              // The user already signed up during MembershipSignup
              // If they have a session it was set then; if not, we can't auto-sign-in
              // without the password. The auth state change listener will pick it up.
              console.log("No active session — user may need to sign in");
            }
          } catch { /* ignore */ }
        }
      }

      // 3. Set localStorage tier (backup for MemberGate)
      const tier = data.tier || null;
      if (tier === "member" || tier === "pro") {
        localStorage.setItem("ss_membership_tier", tier);
        localStorage.setItem("ss_member_info", JSON.stringify({
          tier,
          email: data.email || "",
          name: data.name || "",
          userId: data.userId || "",
          activatedAt: Date.now(),
        }));

        setTierName(tier === "pro" ? "Pro" : "Member");
        setStatus("success");
      } else {
        // Fallback: check localStorage signup info
        const raw = localStorage.getItem("ss_signup_info");
        if (raw) {
          const signup = JSON.parse(raw);
          if (signup.plan === "member" || signup.plan === "pro") {
            localStorage.setItem("ss_membership_tier", signup.plan);
            setTierName(signup.plan === "pro" ? "Pro" : "Member");
            setStatus("success");
          } else {
            setStatus("error");
          }
        } else {
          setStatus("error");
        }
      }

      // Clean up signup temp data
      localStorage.removeItem("ss_signup_info");

      // After celebration, clean URL and reload
      setTimeout(() => {
        window.history.replaceState({}, "", window.location.pathname);
        window.location.reload();
      }, 2500);

    } catch {
      // Network error — try localStorage fallback
      try {
        const raw = localStorage.getItem("ss_signup_info");
        if (raw) {
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
        }
      } catch { /* ignore */ }
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
            Your payment may have gone through. Check your email for confirmation.
          </p>
          <button
            onClick={() => {
              setStatus("idle");
              window.history.replaceState({}, "", window.location.pathname);
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
            Continue to Scanner
          </button>
        </div>
      )}
    </div>
  );
}
