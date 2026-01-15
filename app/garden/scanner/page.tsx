"use client";

import { canUseFeature } from "@/lib/monetization/guard";

export default function Page() {
  const handleScan = () => {
    if (!canUseFeature("scanner")) {
      alert("Scanner not available on your plan.");
      return;
    }

    alert("Scan started");
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <button
        onClick={handleScan}
        className="px-6 py-3 rounded-xl bg-green-600 text-white"
      >
        Start Scan
      </button>
    </main>
  );
}
