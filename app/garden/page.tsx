"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useMembership } from "@/lib/hooks/useMembership";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GardenPage() {
  const { user, loading: authLoading } = useAuth();
  const { membership, loading: membershipLoading } = useMembership();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || membershipLoading) return;
    
    if (!user) {
      router.replace("/auth/login");
      return;
    }

    if (!membership || membership.tier === 'free') {
      // Show upgrade panel instead of redirecting
      return;
    }
  }, [user, membership, authLoading, membershipLoading, router]);

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

  if (!user) {
    return null; // Redirecting
  }

  if (!membership || membership.tier === 'free') {
    return (
      <main style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
        <h1 className="text-3xl font-bold text-white mb-4">Join the Garden</h1>
        <p className="text-white/80 mb-6">
          Access the full Garden experience with an active membership.
        </p>
        <button
          onClick={() => router.push("/account")}
          className="px-6 py-3 bg-emerald-600 text-black font-semibold rounded-lg hover:bg-emerald-500 transition"
        >
          Upgrade Membership
        </button>
      </main>
    );
  }

  return (
    <main style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 className="text-3xl font-bold text-white mb-6">Garden</h1>

      <section style={{ marginTop: "24px" }}>
        <h2 className="text-2xl font-semibold text-white mb-3">Your Activity</h2>
        <p className="text-white/70">
          Recent scans, saved strains, and recommendations appear here.
        </p>
      </section>

      <section style={{ marginTop: "32px" }}>
        <h2 className="text-2xl font-semibold text-white mb-3">Scanner</h2>
        <p className="text-white/70 mb-4">
          Upload or scan a strain image to identify cannabis strains.
        </p>
        <button
          onClick={() => router.push("/scanner")}
          className="px-6 py-3 bg-emerald-600 text-black font-semibold rounded-lg hover:bg-emerald-500 transition"
        >
          Open Scanner
        </button>
      </section>

      <section style={{ marginTop: "32px" }}>
        <h2 className="text-2xl font-semibold text-white mb-3">Saved Strains</h2>
        <p className="text-white/70">
          Your library of identified strains and favorites.
        </p>
      </section>

      <section style={{ marginTop: "32px" }}>
        <h2 className="text-2xl font-semibold text-white mb-3">Community</h2>
        <p className="text-white/70 mb-4">
          Groups, posts, and discussions with other growers.
        </p>
        <button
          onClick={() => router.push("/community")}
          className="px-6 py-3 bg-emerald-600 text-black font-semibold rounded-lg hover:bg-emerald-500 transition"
        >
          Visit Community
        </button>
      </section>
    </main>
  );
}
