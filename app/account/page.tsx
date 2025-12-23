"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { getQuotaStatus } from "@/app/api/_utils/scanQuota";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [quotaStatus, setQuotaStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);

        if (session?.user) {
          // Load quota status
          try {
            const res = await fetch("/api/scan/quota/status");
            if (res.ok) {
              const data = await res.json();
              setQuotaStatus(data);
            }
          } catch (err) {
            console.error("Error loading quota status:", err);
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="text-white/70">Please sign in to view your account.</p>
          <Link
            href="/login"
            className="block w-full px-4 py-3 bg-emerald-600 text-white rounded-lg text-center hover:bg-emerald-700 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8 safe-area-bottom overflow-x-hidden">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold mb-2">Account</h1>
          <p className="text-white/70 text-sm">{user.email}</p>
        </div>

        {/* Membership Status */}
        <section className="rounded-xl bg-white/10 backdrop-blur-lg p-4 border border-white/20">
          <h2 className="text-lg font-semibold mb-3">Membership</h2>
          {quotaStatus ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Tier</span>
                <span className="font-medium capitalize">{quotaStatus.tier}</span>
              </div>
              {quotaStatus.tier !== 'pro' && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">ID Scans</span>
                    <span className="font-medium">
                      {quotaStatus.id_scans_used} / {quotaStatus.id_scans_limit ?? '∞'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Doctor Scans</span>
                    <span className="font-medium">
                      {quotaStatus.doctor_scans_used} / {quotaStatus.doctor_scans_limit ?? '∞'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-white/60 mt-2 pt-2 border-t border-white/10">
                    <span>Resets</span>
                    <span>{new Date(quotaStatus.quota_reset_at).toLocaleDateString()}</span>
                  </div>
                </>
              )}
              {quotaStatus.tier === 'pro' && (
                <p className="text-sm text-emerald-400">Unlimited scans</p>
              )}
            </div>
          ) : (
            <p className="text-white/70 text-sm">Loading quota status...</p>
          )}
        </section>

        {/* Settings Links */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold mb-3">Settings</h2>
          
          <Link
            href="/settings/membership"
            className="block rounded-xl bg-white/10 backdrop-blur-lg p-4 border border-white/20 hover:bg-white/15 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Membership</div>
                <div className="text-sm text-white/70">Manage your plan</div>
              </div>
              <span>→</span>
            </div>
          </Link>

          <Link
            href="/settings/community-intelligence"
            className="block rounded-xl bg-white/10 backdrop-blur-lg p-4 border border-white/20 hover:bg-white/15 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Community Intelligence</div>
                <div className="text-sm text-white/70">Control insights</div>
              </div>
              <span>→</span>
            </div>
          </Link>
        </section>

        {/* About */}
        <section className="space-y-2">
          <Link
            href="/about"
            className="block rounded-xl bg-white/10 backdrop-blur-lg p-4 border border-white/20 hover:bg-white/15 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">About StrainSpotter</div>
                <div className="text-sm text-white/70">What we are / aren't</div>
              </div>
              <span>→</span>
            </div>
          </Link>
        </section>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full px-4 py-3 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition border border-red-500/30"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
