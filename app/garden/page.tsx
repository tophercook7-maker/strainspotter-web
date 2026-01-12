"use client";

import Image from "next/image";

const BUTTONS = [
  { label: "Strain Browser", icon: "🌿" },
  { label: "Scanner", icon: "📸" },
  { label: "History", icon: "🧾" },
  { label: "Grow Coach", icon: "🪴" },
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌱" },
  { label: "Favorites", icon: "⭐" },
  { label: "Learn", icon: "📚" },
  { label: "Settings", icon: "⚙️" },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen w-full overflow-y-auto text-white">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/garden-bg.jpg"
          alt="Garden background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* CONTENT */}
      <div className="flex flex-col items-center px-6 pt-16 pb-24">

        {/* HERO */}
        <div className="mb-14">
          <div className="relative w-36 h-36 rounded-full overflow-hidden ring-4 ring-green-400/60 bg-black/30 backdrop-blur-md">
            <Image
              src="/brand/hero.png"
              alt="StrainSpotter Hero"
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 gap-12 max-w-5xl">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                flex flex-col items-center justify-center
                w-40 h-40
                rounded-3xl
                bg-white/10
                backdrop-blur-xl
                border border-white/20
                shadow-xl
                transition
                hover:scale-105 hover:bg-white/20
                active:scale-95
              "
            >
              <span className="text-5xl mb-4">{b.icon}</span>
              <span className="text-lg font-semibold text-white/90 text-center">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
