"use client";

import Image from "next/image";

const BUTTONS = [
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌱" },
  { label: "Grow Coach", icon: "🧠" },
  { label: "Strains", icon: "🍃" },
  { label: "Journal", icon: "📓" },
  { label: "Settings", icon: "⚙️" },
  { label: "Community", icon: "💬" },
  { label: "Learn", icon: "📚" },
  { label: "Profile", icon: "👤" },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen w-full overflow-y-auto text-white">

      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden Background"
        fill
        priority
        className="object-cover"
      />

      {/* OVERLAY */}
      <div className="relative z-10 flex flex-col items-center px-6 py-16">

        {/* HERO */}
        <div className="mb-12">
          <Image
            src="/brand/hero.png"
            alt="Hero"
            width={180}
            height={180}
            className="rounded-full"
          />
        </div>

        {/* TITLE */}
        <h1 className="text-5xl font-extrabold mb-12 tracking-tight">
          The Garden
        </h1>

        {/* ICON GRID — UNCONSTRAINED, IPAD SCALE */}
        <div
          className="
            grid
            grid-cols-3
            gap-12
            sm:grid-cols-3
            md:grid-cols-4
            lg:grid-cols-5
            w-full
            max-w-none
            justify-items-center
          "
        >
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                flex flex-col items-center justify-center
                w-40 h-40
                rounded-3xl
                bg-white/25
                backdrop-blur-2xl
                shadow-2xl
                border border-white/30
                hover:bg-white/35
                transition
              "
            >
              <div className="text-6xl mb-4">{b.icon}</div>
              <div className="text-lg font-semibold tracking-wide">
                {b.label}
              </div>
            </button>
          ))}
        </div>

      </div>
    </main>
  );
}
