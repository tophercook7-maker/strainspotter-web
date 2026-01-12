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
    <main className="relative min-h-screen w-full overflow-y-auto">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-8 py-16">
        {/* HERO */}
        <div className="mb-14">
          <Image
            src="/brand/core/hero.png"
            alt="StrainSpotter Hero"
            width={220}
            height={220}
            className="rounded-full bg-black shadow-[0_0_40px_rgba(0,255,120,0.45)]"
          />
        </div>

        {/* TITLE */}
        <h1 className="text-5xl font-bold text-white drop-shadow mb-3">
          The Garden
        </h1>
        <p className="text-white/85 text-xl mb-20 text-center max-w-xl">
          Your personal cannabis ecosystem
        </p>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 gap-16 max-w-6xl">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                w-52
                h-52
                rounded-[32px]
                bg-white/25
                backdrop-blur-2xl
                border border-white/30
                shadow-2xl
                flex
                flex-col
                items-center
                justify-center
                text-white
                hover:scale-110
                hover:bg-white/30
                transition-all
                duration-300
              "
            >
              <div className="text-6xl mb-4">{b.icon}</div>
              <div className="text-xl font-semibold tracking-wide">
                {b.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
