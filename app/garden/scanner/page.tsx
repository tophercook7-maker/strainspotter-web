"use client";

import Image from "next/image";
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
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover -z-10"
      />

      <div className="min-h-screen flex items-center justify-center">
        <button
          onClick={handleScan}
          className="
            w-48 h-48
            rounded-3xl
            bg-white/25
            backdrop-blur-xl
            shadow-2xl
            border border-white/30
            text-xl font-semibold
            hover:bg-white/35
            transition
          "
        >
          Start Scan
        </button>
      </div>
    </main>
  );
}
