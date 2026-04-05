"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/**
 * After Stripe redirects back with ?checkout=success&session_id=...
 * 1. Sends credentials to verify-session POST (creates Supabase account server-side)
 * 2. Signs the user in
 * 3. Shows celebration, then reloads
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
      activateAccount(sessionId);
    } else if (checkout === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activateAccount(sessionId: string) {
    setStatus("verifying");

    try {
      // 1. Get saved signup info
      const raw = localStorage.getItem("ss_signup_info");
      const signup = raw ? JSON.parse(raw) : null;

      if (!signup?.email || !signup?.password) {
        // No saved credentials — just verify payment and set tier from GET
        const res = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
        const data = await res.json();
        if (data.tier) {
          localStorage.setItem("ss_membership_tier", data.tier);
          setTierName(data.tier === "pro" ? "Pro" : "Member");
          setStatus("success");
        } else {
          setStatus("error");
        }
        cleanup(3000);
        return;
      }

      // 2. Create account server-side via POST (uses admin API, skips email confirm)
      const res = await fetch("/api/stripe/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          email: signup.email,
          password: signup.password,
          name: signup.name || "",
        }),
      });

      const data = await res.json();

      // 3. Sign in the user client-side
      if (signup.email && signup.password) {
        const supabase = getSupabase();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: signup.email,
          password: signup.password,
        });
        if (signInError) {
          console.warn("Auto sign-in failed:", signInError.message);
          // Not critical — user can sign in manually
        }
      }

      // 4. Save tier to localStorage
      const tier = data.tier || signup.plan || null;
      if (tier) {
        localStorage.setItem("ss_membership_tier", tier);
        localStorage.setItem("ss_member_info", JSON.stringify({
          tier,
          email: signup.email,
          name: signup.name || "",
          userId: data.userId || "",
          activatedAt: Date.now(),
        }));
        setTierName(tier === "pro" ? "Pro" : "Member");
        setStatus("success");
      } else {
        setStatus("error");
      }

      // Clean up saved credentials
      localStorage.removeItem("ss_signup_info");
      cleanup(3000);

    } catch (e) {
      console.error("Activation error:", e);
      // Try localStorage fallback
      const raw = localStorage.getItem("ss_signup_info");
      if (raw) {
        try {
          const signup = JSON.parse(raw);
          if (signup.plan) {
            localStorage.setItem("ss_membership_tier", signup.plan);
            setTierName(signup.plan === "pro" ? "Pro" : "Member");
            setStatus("success");
            localStorage.removeItem("ss_signup_info");
            cleanup(3000);
            return;
          }
        } catch { /* ignore */ }
      }
      setStatus("error");
      cleanup(5000);
    }
  }

  function cleanup(delayMs: number) {
    setTimeout(() => {
      window.history.replaceState({}, "", window.location.pathname);
      window.location.reload();
    }, delayMs);
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
            Your payment went through. Try refreshing the page.
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
