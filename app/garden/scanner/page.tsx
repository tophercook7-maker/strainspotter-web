"use client";

import { canUseFeature } from "@/lib/monetization/guard";

export default function Page() {
  const handleScan = () => {
    const userId = "TEMP_USER_ID"; // replace later with real auth

    const gate = canUseFeature(userId, "scan");

    if (!gate.allowed) {
      alert(gate.reason);
      return;
    }

    // existing scan logic continues below
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <h1 className="text-2xl opacity-70">Coming soon</h1>
    </main>
  );
}
