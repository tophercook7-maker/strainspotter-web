"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function GardenPaywall() {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push("/settings/membership");
  };

  return (
    <div className="min-h-screen bg-black text-white" style={{ padding: 20, maxWidth: 520, margin: "0 auto" }}>
      <Link href="/garden" className="text-emerald-400 mb-4 inline-block text-sm">
        ← Back to Garden
      </Link>

      <h1 className="text-3xl font-bold mb-2">Unlock the Garden</h1>
      <p className="opacity-85 mb-6">
        The Garden is members-only. Your membership is mainly for:
      </p>

      <div className="border border-neutral-700 rounded-xl p-4 mb-3 bg-neutral-900">
        <strong className="text-lg block mb-2">🌱 Grow Logbook</strong>
        <div className="opacity-85 text-sm">
          Track every grow, stage changes, daily notes, and photos — your grow memory.
        </div>
      </div>

      <div className="border border-neutral-700 rounded-xl p-4 mb-6 bg-neutral-900">
        <strong className="text-lg block mb-2">🧠 Grow Coach</strong>
        <div className="opacity-85 text-sm">
          Guidance based on your logs: what to do next, what to watch for, what to improve.
        </div>
      </div>

      <div className="opacity-75 mb-6 text-sm">
        Members also get better scanner benefits, but the Garden is where your grow improves over time.
      </div>

      <button
        onClick={handleUpgrade}
        className="w-full py-3 px-4 bg-emerald-600 text-black rounded-xl font-bold hover:opacity-90 transition"
      >
        Upgrade Membership
      </button>

      <div className="mt-4 opacity-70 text-xs text-center">
        $9.99/month — Grow Logbook + Grow Coach
      </div>
    </div>
  );
}
