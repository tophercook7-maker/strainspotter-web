"use client";

import { useRouter } from "next/navigation";

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold text-green-400">🌱 The Garden</h1>

      <p className="text-white/70">Garden shell online.</p>

      <div className="grid grid-cols-2 gap-4 mt-8">
        <button onClick={() => router.push("/garden/strains")} className="btn">
          🌿 Strain Browser
        </button>

        <button onClick={() => router.push("/garden/scanner")} className="btn">
          📸 Scanner
        </button>

        <button onClick={() => router.push("/garden/history")} className="btn">
          🕓 History
        </button>

        <button onClick={() => router.push("/garden/grow-coach")} className="btn">
          🌞 Grow Coach
        </button>

        <button
          onClick={() => router.push("/garden/dispensaries")}
          className="btn opacity-50 cursor-not-allowed"
        >
          🏪 Dispensary Finder (Disabled)
        </button>

        <button
          onClick={() => router.push("/garden/seed-vendors")}
          className="btn opacity-50 cursor-not-allowed"
        >
          🌰 Seed Vendors (Disabled)
        </button>
      </div>
    </main>
  );
}
