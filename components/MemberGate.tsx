"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MembershipSignup from "@/components/MembershipSignup";
import LockIcon from "@mui/icons-material/Lock";

const MEMBER_KEY = "ss_membership_tier";

function getMembershipTier(): "free" | "member" | "pro" {
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
 * with a "Become a Member" button that opens the MembershipSignup form.
 */
export default function MemberGate({
  children,
  featureName,
  featureIcon = "🔒",
}: MemberGateProps) {
  const router = useRouter();
  const [tier, setTier] = useState<"free" | "member" | "pro" | null>(null);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    setTier(getMembershipTier());
  }, []);

  // Loading state
  if (tier === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
          Loading...
        </div>
      </div>
    );
  }

  // Member or Pro — show content
  if (tier === "member" || tier === "pro") {
    return <>{children}</>;
  }

  // Free user — show lock screen with signup form
  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        {/* Feature icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            position: "relative",
          }}
        >
          <span style={{ fontSize: 36 }}>{featureIcon}</span>
          <div
            style={{
              position: "absolute",
              bottom: -4,
              right: -4,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "rgba(255,215,0,0.15)",
              border: "1px solid rgba(255,215,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LockIcon sx={{ fontSize: 12, color: "#FFD54F" }} />
          </div>
        </div>

        <h2
          style={{
            color: "#fff",
            fontSize: 22,
            fontWeight: 800,
            margin: "0 0 8px",
          }}
        >
          {featureName}
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 14,
            lineHeight: 1.6,
            maxWidth: 300,
            margin: "0 0 24px",
          }}
        >
          This feature is available to StrainSpotter members. Join to unlock{" "}
          {featureName.toLowerCase()} and everything in The Garden.
        </p>

        <button
          onClick={() => setShowSignup(true)}
          style={{
            background: "linear-gradient(135deg, #43A047, #2E7D32)",
            border: "none",
            borderRadius: 14,
            padding: "14px 32px",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          Become a Member
        </button>

        <button
          onClick={() => router.push("/garden/scanner")}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            fontSize: 13,
            cursor: "pointer",
            padding: "8px 16px",
          }}
        >
          ← Back to Scanner
        </button>
      </div>

      {showSignup && (
        <MembershipSignup onClose={() => setShowSignup(false)} />
      )}
    </>
  );
}
