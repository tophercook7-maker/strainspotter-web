"use client";

import Image from "next/image";

const BUTTONS = [
  "Strain Browser",
  "Scanner",
  "Dispensary Finder",
  "Seed Vendors",
  "Grow Coach",
  "History",
  "Favorites",
  "Settings",
  "Profile",
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen w-full overflow-y-auto text-white">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-black/35" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-10 py-20">
        
        {/* HERO (FIXED) */}
        <div className="mb-20">
          <div className="w-56 h-56 rounded-full overflow-hidden bg-black">
            <Image
              src="/brand/core/hero.png"
              alt="StrainSpotter Hero"
              width={224}
              height={224}
              priority
              className="object-cover"
            />
          </div>
        </div>

        {/* APP ICON GRID */}
        <div
          className="
            grid
            grid-cols-3
            gap-16
            w-full
            max-w-6xl
          "
        >
          {BUTTONS.map((label) => (
            <button
              key={label}
              className="
                aspect-square
                rounded-3xl
                bg-white/20
                backdrop-blur-2xl
                border
                border-white/25
                shadow-2xl
                flex
                flex-col
                items-center
                justify-center
                text-xl
                font-semibold
                hover:bg-white/30
                transition
              "
            >
              <span className="text-4xl mb-4">🌿</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
