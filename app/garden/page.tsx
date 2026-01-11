"use client";

import Image from "next/image";

export default function GardenPage() {
  return (
    <main className="relative min-h-screen text-white">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/55" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-6 py-16">
        {/* HERO */}
        <div className="mb-12 flex flex-col items-center">
          <div className="relative w-40 h-40 mb-6">
            <Image
              src="/hero.jpg"
              alt="StrainSpotter Hero"
              fill
              className="object-contain rounded-full"
            />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="mt-3 text-white/80 text-center max-w-xl">
            Your personal cannabis ecosystem — calm, grounded, and private.
          </p>
        </div>

        {/* BUTTON GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 w-full max-w-3xl">
          {[
            "Dispensaries",
            "Seed Vendors",
            "Strains",
            "My Collection",
            "Grow Tools",
            "Education",
            "Journal",
            "Settings",
          ].map((label) => (
            <button
              key={label}
              className="flex flex-col items-center justify-center
                         rounded-2xl border border-white/20
                         bg-white/10 backdrop-blur-md
                         py-6 text-lg font-semibold
                         hover:bg-white/20 transition"
            >
              🌿
              <span className="mt-2">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
