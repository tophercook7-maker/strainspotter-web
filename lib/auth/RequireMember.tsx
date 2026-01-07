"use client";
import RequireAuth from "@/lib/auth/RequireAuth";
import { useMembership } from "@/lib/membership/useMembership";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RequireMember({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <MemberGate>{children}</MemberGate>
    </RequireAuth>
  );
}

function MemberGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, isMember } = useMembership();
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

  if (isTauri) {
    // In desktop, do not block on membership; render content.
    return <>{children}</>;
  }

  useEffect(() => {
    if (!loading && !isMember) {
      router.replace("/garden/paywall");
    }
  }, [loading, isMember, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Checking membership…</p>
        </div>
      </div>
    );
  }

  if (!isMember) {
    return null;
  }

  return <>{children}</>;
}
