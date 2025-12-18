// ==============================================
// File: components/LockedOverlay.tsx
// ==============================================

"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

export default function LockedOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center 
        backdrop-blur-md bg-black/60 rounded-2xl border border-green-400/30 z-10">
      
      <Lock className="w-12 h-12 text-gold mb-4 opacity-80" />

      <p className="text-gold text-center font-medium text-lg mb-4 px-4">
        Members Only Feature
      </p>

      <Link
        href="/signup"
        className="px-6 py-2 bg-gold text-black rounded-lg font-semibold 
          hover:bg-yellow-300 transition"
      >
        Join the Garden
      </Link>
    </div>
  );
}
