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
      <div className="absolute inset-0 bg-black/60" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-6 py-20">
        {/* HERO */}
        <div className="mb-14 flex flex-col items-center">
          <div className="relative w-44 h-44 rounded-full overflow-hidden border border-white/30 bg-black">
            <Image
              src="/hero.jpg"
              alt="StrainSpotter Hero"
              fill
              className="object-cover"
            />
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="mt-3 text-white/80 text-center max-w-xl">
            Your personal cannabis ecosystem — calm, grounded, and private.
          </p>
        </div>

        {/* BUTTON GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 w-full max-w-4xl">
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
              className="
                flex flex-col items-center justify-center
                min-h-[120px]
                rounded-2xl
                border border-white/20
                bg-white/10 backdrop-blur-md
                text-lg font-semibold
                hover:bg-white/20
                transition
              "
            >
              <span className="text-3xl">🌿</span>
              <span className="mt-3">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
