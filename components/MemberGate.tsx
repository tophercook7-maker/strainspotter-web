"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MembershipSignup from "@/components/MembershipSignup";
import AuthScreen from "@/components/AuthScreen";

/* ── try to use real auth, fall back to localStorage ── */
let useOptionalAuth: () => any;
try {
  useOptionalAuth = require("@/lib/auth/AuthProvider").useOptionalAuth;
} catch {
  useOptionalAuth = () => null;
}

const MEMBER_KEY = "ss_membership_tier";

function getLocalTier(): "free" | "member" | "pro" {
  if (typeof window === "undefined") return "free";
  try {
    const raw = localStorage.getItem(MEMBER_KEY);
    if (raw === "member" || raw === "pro") return raw;
    return "free";
  } catch {
    return "free";
  }
}

interface MemberGateProps {
  children: React.ReactNode;
  featureName: string;
  featureIcon?: string;
}

/**
 * Wraps a feature page. If the user is not a member, shows a lock screen
 * with options to sign up OR sign in (for returning members).
 */
export default function MemberGate({
  children,
  featureName,
  featureIcon = "🔒",
}: MemberGateProps) {
  const router = useRouter();
  const auth = useOptionalAuth();
  const [localTier, setLocalTier] = useState<"free" | "member" | "pro" | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    setLocalTier(getLocalTier());
  }, []);

  // Check auth context tier (from Supabase profile)
  const authTier = auth?.tier;
  const authLoading = auth?.loading ?? false;

  // Still loading
  if (localTier === null || authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  // Grant access if EITHER auth context OR localStorage says member/pro
  const hasMembership =
    authTier === "member" || authTier === "pro" ||
    localTier === "member" || localTier === "pro";

  if (hasMembership) {
    return <>{children}</>;
  }

  // Free user — show lock screen with BOTH signup and login options
  return (
    <>
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px", textAlign: "center",
      }}>
        {/* Feature icon */}
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20, position: "relative",
        }}>
          <span style={{ fontSize: 36 }}>{featureIcon}</span>
          <div style={{
            position: "absolute", bottom: -4, right: -4,
            width: 24, height: 24, borderRadius: "50%",
            background: "rgba(255,215,0,0.15)",
            border: "1px solid rgba(255,215,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11,
          }}>🔒</div>
        </div>

        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
          {featureName}
        </h2>
        <p style={{
          color: "rgba(255,255,255,0.45)", fontSize: 14,
          lineHeight: 1.6, maxWidth: 300, margin: "0 0 24px",
        }}>
          This feature is available to StrainSpotter members. Join to unlock{" "}
          {featureName.toLowerCase()} and everything in The Garden.
        </p>

        {/* Become a Member */}
        <button
          onClick={() => setShowSignup(true)}
          style={{
            background: "linear-gradient(135deg, #43A047, #2E7D32)",
            border: "none", borderRadius: 14,
            padding: "14px 32px", color: "#fff",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            marginBottom: 12, width: 260,
          }}
        >
          Become a Member
        </button>

        {/* Already a member? Sign In */}
        <button
          onClick={() => setShowLogin(true)}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: "14px 32px", color: "#fff",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            marginBottom: 12, width: 260,
          }}
        >
          Already a member? Sign In
        </button>

        {/* Back */}
        <button
          onClick={() => router.push("/garden/scanner")}
          style={{
            background: "none", border: "none",
            color: "rgba(255,255,255,0.35)", fontSize: 13,
            cursor: "pointer", padding: "8px 16px",
          }}
        >
          ← Back to Scanner
        </button>
      </div>

      {/* Signup / Payment overlay */}
      {showSignup && (
        <MembershipSignup onClose={() => setShowSignup(false)} />
      )}

      {/* Login overlay */}
      {showLogin && (
        <AuthScreen
          defaultMode="signin"
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            // Reload to pick up auth state + tier
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
