"use client";

import Image from "next/image";

const BUTTONS = [
  { label: "Strains", icon: "🌿" },
  { label: "Scanner", icon: "📷" },
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌱" },
  { label: "Grow Coach", icon: "🧑‍🌾" },
  { label: "History", icon: "📜" },
  { label: "Favorites", icon: "⭐" },
  { label: "Settings", icon: "⚙️" },
  { label: "About", icon: "ℹ️" },
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
      <div className="absolute inset-0 bg-black/55" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-6 py-12">
        {/* HERO */}
        <div className="mb-12">
          <Image
            src="/brand/hero.png"
            alt="StrainSpotter Hero"
            width={160}
            height={160}
            className="rounded-full"
            priority
          />
        </div>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 gap-10 max-w-xl">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                flex flex-col items-center justify-center
                w-32 h-32
                rounded-2xl
                bg-white/10
                backdrop-blur-xl
                border border-white/20
                shadow-lg
                hover:bg-white/20
                transition
              "
            >
              <div className="text-4xl mb-2">{b.icon}</div>
              <div className="text-sm font-semibold tracking-wide">
                {b.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
