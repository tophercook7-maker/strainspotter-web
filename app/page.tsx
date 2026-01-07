"use client";

import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMembership } from "@/lib/hooks/useMembership";

export default function Page() {
  const { membership, loading } = useMembership();
  const router = useRouter();
  const [showGate, setShowGate] = useState(false);

  const gardenAllowed = useMemo(() => {
    if (loading) return false;
    return membership?.tier === "garden" || membership?.tier === "pro";
  }, [loading, membership]);

  const handleGardenClick = useCallback(async () => {
    if (gardenAllowed) {
      router.push("/garden");
      return;
    }
    const fetched = await refresh();
    const nextTier = fetched?.tier ?? membership?.tier ?? "free";
    if (nextTier === "garden" || nextTier === "pro") {
      router.push("/garden");
      return;
    }
    setShowGate(true);
  }, [gardenAllowed, router, refresh, membership?.tier]);

  return (
    <main className="relative min-h-screen w-full bg-[url('/backgrounds/garden-field.jpg')] bg-cover bg-center text-white flex flex-col items-center px-4 py-16">
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center gap-6">
        {/* Hero */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center bg-transparent">
            <img
              src="/brand/core/hero.png"
              alt="StrainSpotter Hero"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="text-white/85 max-w-xl text-base sm:text-lg">
            Choose where to start: scan now, or step into the Garden.
          </p>
        </div>

        {/* Primary actions */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/scanner"
            className="h-28 rounded-xl bg-white/15 border border-white/25 backdrop-blur-md px-6 flex flex-col items-center justify-center text-center text-lg font-semibold text-white transition hover:bg-white/20 hover:border-white/35 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-300/70 focus:ring-offset-2 focus:ring-offset-transparent active:translate-y-0"
          >
            Scan
            <span className="mt-1 text-sm text-white/80 font-normal">
              Use your scan pack to identify strains
            </span>
          </Link>

          <button
            type="button"
            onClick={handleGardenClick}
            className={`h-28 rounded-xl px-6 flex flex-col items-center justify-center text-center text-lg font-semibold transition backdrop-blur-md ${
              gardenAllowed
                ? "bg-white/15 border border-white/25 text-white hover:bg-white/20 hover:border-white/35 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-300/70 focus:ring-offset-2 focus:ring-offset-transparent active:translate-y-0"
                : "bg-white/10 border border-white/20 text-white/60 hover:bg-white/15 hover:border-white/30"
            }`}
          >
            Enter the Garden
            <span className="mt-1 text-sm font-normal">
              {gardenAllowed
                ? "Full grow experience"
                : "Requires Garden membership ($9.99+)"}
            </span>
          </button>
        </div>
      </div>

      {showGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="relative max-w-md w-full bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl text-white">
            <div className="flex flex-col items-center gap-4 text-center">
              <img
                src="/brand/core/hero.png"
                alt="StrainSpotter"
                className="w-20 h-20 drop-shadow-lg"
              />
              <div className="text-2xl font-semibold">The Garden</div>
              <p className="text-white/80 text-sm text-center">
                The Garden is your personal space for grows, logs, and long-term insight.
                It’s available with a Garden membership.
              </p>
              <div className="flex flex-col gap-3 w-full">
                <button
                  type="button"
                  onClick={() => router.push("/pricing/professional")}
                  className="w-full px-4 py-3 rounded-xl bg-emerald-400 text-black font-semibold hover:bg-emerald-300 transition"
                >
                  Join the Garden – $9.99 / month
                </button>
                <button
                  type="button"
                  onClick={() => setShowGate(false)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/25 text-white hover:bg-white/15 transition"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
