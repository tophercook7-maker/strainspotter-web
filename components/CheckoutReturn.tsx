"use client";

import { apiUrl } from "@/lib/config/apiBase";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

/**
 * After Stripe redirects back with ?checkout=success&session_id=...
 * 1. Verify payment via our API
 * 2. Create a real Supabase user via server-side admin route
 * 3. Auto-sign in the user
 * 4. Set localStorage tier as fallback
 * 5. Celebrate and reload
 */
export default function CheckoutReturn() {
  const { refreshProfileByUserId } = useAuth();
  const [status, setStatus] = useState<
    "idle" | "verifying" | "creating" | "success" | "error"
  >("idle");
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
      // Step 1: Verify the Stripe session
      const res = await fetch(
        apiUrl(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`)
      );
      const data = await res.json();

      let tier = data.tier || null;
      let email = data.email || null;
      let name = data.name || null;

      // Fallback: check saved signup info
      const raw = localStorage.getItem("ss_signup_info");
      let password: string | null = null;
      if (raw) {
        try {
          const signup = JSON.parse(raw);
          if (!tier) tier = signup.plan || null;
          if (!email) email = signup.email || null;
          if (!name) name = signup.name || null;
          password = signup.password || null;
        } catch {
          /* ignore */
        }
      }

      // Step 2: Set localStorage tier immediately (fallback)
      if (tier === "member" || tier === "pro") {
        localStorage.setItem("ss_membership_tier", tier);
        localStorage.setItem(
          "ss_member_info",
          JSON.stringify({
            tier,
            email: email || "",
            name: name || "",
            activatedAt: Date.now(),
          })
        );

        setTierName(tier === "pro" ? "Pro" : "Member");
      }

      // Server may have updated `profiles` (verify-session). Refresh if already signed in.
      const supabase = getSupabase();
      const {
        data: { session: preSession },
      } = await supabase.auth.getSession();
      if (preSession?.user?.id) {
        await refreshProfileByUserId(preSession.user.id);
        if (process.env.NODE_ENV === "development") {
          console.debug("[checkout-return] verify-session ok, profile refresh", {
            userId: preSession.user.id,
            verifyTier: tier,
            refreshProfileByUserId: true,
          });
        }
      }

      // Step 3: Create real Supabase user via server route
      if (email && password) {
        setStatus("creating");

        try {
          const createRes = await fetch(apiUrl("/api/auth/create-user"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password,
              name,
              membership: tier,
            }),
          });

          const createData = await createRes.json();

          if (createData.success) {
            // Step 4: Auto-sign in with the credentials
            try {
              await supabase.auth.signInWithPassword({ email, password });
              const {
                data: { user: signedUser },
              } = await supabase.auth.getUser();
              if (signedUser?.id) {
                await refreshProfileByUserId(signedUser.id);
                if (process.env.NODE_ENV === "development") {
                  console.debug(
                    "[checkout-return] post-checkout sign-in, profile refresh",
                    {
                      userId: signedUser.id,
                      verifyTier: tier,
                      refreshProfileByUserId: true,
                    }
                  );
                }
              }
            } catch (signInErr) {
              // Sign-in failed — localStorage tier still works as fallback
              console.warn("Auto sign-in failed:", signInErr);
            }
          } else {
            console.warn("User creation returned:", createData.error);
          }
        } catch (createErr) {
          // Non-blocking — localStorage tier handles access
          console.warn("Create user failed:", createErr);
        }
      }

      // Clean up signup info
      localStorage.removeItem("ss_signup_info");

      setStatus("success");

      // Final pull so UI tier matches DB before full reload (covers any race with auth listener).
      const {
        data: { session: finalSession },
      } = await supabase.auth.getSession();
      if (finalSession?.user?.id) {
        await refreshProfileByUserId(finalSession.user.id);
      }
      if (process.env.NODE_ENV === "development") {
        console.debug("[checkout-return] success, final profile refresh", {
          userId: finalSession?.user?.id ?? null,
          verifyTier: tier,
          refreshProfileByUserIdRan: !!finalSession?.user?.id,
        });
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
        } catch {
          /* ignore */
        }
      }
      setStatus("error");
    }
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
      {(status === "verifying" || status === "creating") && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
              animation: "ssPulse 1.5s ease-in-out infinite",
            }}
          >
            <img src="/brand/cannabis-icon.png" width={72} height={72} alt="" style={{ display: 'inline-block', flexShrink: 0, borderRadius: '50%' }} />
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            {status === "verifying"
              ? "Verifying payment..."
              : "Setting up your account..."}
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
            Your account is ready. Let&apos;s grow. 🌱
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
