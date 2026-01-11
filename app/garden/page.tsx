"use client";

import Image from "next/image";

export default function GardenPage() {
  return (
    <main className="relative min-h-screen text-white overflow-hidden">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/40" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        {/* HERO */}
        <div className="flex flex-col items-center mb-14">
          <div className="relative w-36 h-36 mb-6">
            <Image
              src="/hero.png"
              alt="StrainSpotter Hero"
              fill
              className="object-contain drop-shadow-2xl"
            />
          </div>

          <h1 className="text-5xl font-extrabold drop-shadow-lg mb-3">
            The Garden
          </h1>

          <p className="text-white/80 text-center max-w-xl">
            Your personal cannabis ecosystem.
          </p>
        </div>

        {/* GLASS BUTTON GRID */}
        <div className="grid grid-cols-3 gap-10">
          {[
            "Dispensaries",
            "Seed Vendors",
            "Strains",
            "My Garden",
            "Grow Tools",
            "Scanner",
            "Journal",
            "Learn",
            "Settings",
          ].map((label) => (
            <button
              key={label}
              className="
                w-32 h-32 rounded-2xl
                bg-white/15 backdrop-blur-xl
                border border-white/20
                shadow-lg
                flex items-center justify-center
                text-sm font-semibold
                hover:bg-white/25 hover:scale-105
                transition-all
              "
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
