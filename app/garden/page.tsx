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

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/40" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-6 py-16">
        
        {/* HERO */}
        <div className="mb-14">
          <Image
            src="/brand/hero.png"
            alt="Hero"
            width={220}
            height={220}
            priority
            className="rounded-full"
          />
        </div>

        {/* ICON GRID */}
        <div
          className="
            grid
            grid-cols-3
            gap-10
            max-w-3xl
            w-full
          "
        >
          {BUTTONS.map((label) => (
            <button
              key={label}
              className="
                flex
                flex-col
                items-center
                justify-center
                h-40
                rounded-3xl
                bg-white/15
                backdrop-blur-xl
                border
                border-white/20
                shadow-xl
                text-lg
                font-semibold
                hover:bg-white/25
                transition
              "
            >
              🌿
              <span className="mt-3">{label}</span>
            </button>
          ))}
        </div>

      </div>
    </main>
  );
}
