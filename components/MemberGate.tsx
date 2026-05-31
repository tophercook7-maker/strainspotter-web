"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MembershipSignup from "@/components/MembershipSignup";
import AuthScreen from "@/components/AuthScreen";
import { useMembershipPlan } from "@/lib/auth/useMembershipPlan";
import SSButton from "@/components/ui/SSButton";
import SSCard from "@/components/ui/SSCard";
import SSEmptyState from "@/components/ui/SSEmptyState";
import SSNotice from "@/components/ui/SSNotice";

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
  const mp = useMembershipPlan();
  const [showSignup, setShowSignup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const authLoading = mp.authLoading;
  const tier = mp.membershipPlanTier;
  const hasMembership = tier === "member" || tier === "pro";
  const es = mp.entitlementsStatus;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!mp.user || hasMembership) return;
    if (es !== "error" && es !== "loading") return;
    if (es === "loading" && mp.effectiveMembershipTier !== "free") return;
    console.debug("[MemberGate] transitional / verify state", {
      entitlementsStatus: es,
      membershipPlanTier: tier,
      effectiveMembershipTier: mp.effectiveMembershipTier,
    });
  }, [
    mp.user?.id,
    mp.effectiveMembershipTier,
    es,
    hasMembership,
    tier,
  ]);

  if (authLoading && !mp.user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <SSEmptyState title="Loading..." style={{ width: "min(320px, 100%)" }} />
      </div>
    );
  }

  if (mp.user && !hasMembership && (es === "loading" || es === "idle")) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <SSEmptyState
          title="Updating your access..."
          description="Checking your plan with the server."
          style={{ width: "min(340px, 100%)" }}
        />
      </div>
    );
  }

  if (hasMembership) {
    return <>{children}</>;
  }

  const signedIn = !!mp.user;
  const verifyFailed = signedIn && es === "error";

  const headline = signedIn
    ? `${featureName} is a member perk`
    : featureName;
  const body = signedIn
    ? `You’re signed in, but this account is on the free plan. Upgrade to unlock ${featureName.toLowerCase()} and the rest of The Garden.`
    : `Sign in if you already joined, or become a member to unlock ${featureName.toLowerCase()} and everything in The Garden.`;

  return (
    <>
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px", textAlign: "center",
      }}>
        <SSCard padding="28px 24px" style={{ width: "min(390px, 100%)", textAlign: "center" }}>
        {verifyFailed && (
          <SSNotice tone="warning" style={{ maxWidth: 360, marginBottom: 20 }}>
            We couldn&apos;t verify your plan from the server. Check your connection and refresh the page, then try again.
          </SSNotice>
        )}

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
          {headline}
        </h2>
        <p style={{
          color: "rgba(255,255,255,0.58)", fontSize: 14,
          lineHeight: 1.6, maxWidth: 340, margin: "0 0 24px",
        }}>
          {body}
        </p>

        {signedIn ? (
          <SSButton
            fullWidth
            onClick={() => setShowSignup(true)}
            style={{ marginBottom: 12, width: 260 }}
          >
            Upgrade to unlock
          </SSButton>
        ) : (
          <SSButton
            fullWidth
            onClick={() => setShowSignup(true)}
            style={{ marginBottom: 12, width: 260 }}
          >
            Become a Member
          </SSButton>
        )}

        <SSButton
          variant="secondary"
          fullWidth
          onClick={() => setShowLogin(true)}
          style={{ marginBottom: 12, width: 260 }}
        >
          {signedIn ? "Switch account" : "Already a member? Sign In"}
        </SSButton>

        {/* Back */}
        <SSButton
          variant="ghost"
          onClick={() => router.push("/garden/scanner")}
          style={{ padding: "8px 16px", fontSize: 13 }}
        >
          ← Back to Scanner
        </SSButton>
        </SSCard>
      </div>

      {showSignup && (
        <MembershipSignup onClose={() => setShowSignup(false)} />
      )}

      {showLogin && (
        <AuthScreen
          defaultMode="signin"
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
