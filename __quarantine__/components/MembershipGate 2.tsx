"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMembership } from "@/lib/hooks/useMembership";

export default function MembershipGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { membership, loading: membershipLoading } = useMembership();

  useEffect(() => {
    // If loading, wait
    if (authLoading || membershipLoading) {
      return;
    }

    // If no user, AuthWall will handle redirect
    if (!user) {
      return;
    }

    // If user but no membership (tier === 'free'), redirect to account
    if (membership && membership.tier === 'free') {
      router.replace("/account");
    }
  }, [user, membership, authLoading, membershipLoading, router]);

  // Show loading while checking
  if (authLoading || membershipLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  // If no user, AuthWall will handle
  if (!user) {
    return null;
  }

  // If no membership or tier === 'free', redirect (handled by useEffect)
  if (!membership || membership.tier === 'free') {
    return null;
  }

  // User has membership (tier >= 1) → show content
  return <>{children}</>;
}

