"use client";

import Image from "next/image";

const BUTTONS = [
  { label: "Strain Browser", icon: "🌿" },
  { label: "Scanner", icon: "📷" },
  { label: "History", icon: "📜" },
  { label: "Grow Coach", icon: "🌱" },
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌰" },
  { label: "Favorites", icon: "⭐" },
  { label: "Learn", icon: "📚" },
  { label: "Settings", icon: "⚙️" },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen w-full overflow-auto">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center pt-12 pb-24">
        {/* HERO */}
        <div className="mb-10">
          <Image
            src="/brand/core/hero.png"
            alt="StrainSpotter Hero"
            width={180}
            height={180}
            className="rounded-full shadow-2xl"
          />
        </div>

        {/* TITLE */}
        <h1 className="text-5xl font-bold text-white drop-shadow mb-2">
          The Garden
        </h1>
        <p className="text-white/80 mb-12 text-lg">
          Your personal cannabis ecosystem
        </p>

        {/* ICON GRID */}
        <div
          className="
            grid
            grid-cols-3
            gap-12
            px-16
            max-w-5xl
          "
        >
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                w-40
                h-40
                rounded-3xl
                bg-white/20
                backdrop-blur-xl
                border border-white/30
                shadow-xl
                flex
                flex-col
                items-center
                justify-center
                text-white
                hover:scale-105
                transition
              "
            >
              <div className="text-5xl mb-3">{b.icon}</div>
              <div className="text-lg font-semibold">{b.label}</div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
