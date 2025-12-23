"use client";

import Link from "next/link";

export default function EnvironmentPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden safe-area-bottom" style={{ padding: 16, maxWidth: 640, margin: "0 auto" }}>
      <Link href="/garden" className="text-emerald-400 mb-4 inline-block text-sm hover:text-emerald-300 transition">
        ← Back to Garden
      </Link>

      <h1 className="text-3xl font-bold mb-2">Grow Environment</h1>
      <p className="opacity-85 mb-6">
        Environment tracking is coming soon. You'll be able to monitor temperature, humidity, pH, and other environmental factors for your grow.
      </p>

      <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700">
        <p className="text-sm text-neutral-400">
          This feature will help you track and optimize your growing conditions for better yields.
        </p>
      </div>
    </div>
  );
}
