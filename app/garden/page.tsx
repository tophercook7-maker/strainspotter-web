"use client";

import Image from "next/image";

const BUTTONS = [
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌱" },
  { label: "Grow Coach", icon: "🧠" },
  { label: "Strains", icon: "🍃" },
  { label: "Journal", icon: "📓" },
  { label: "Learn", icon: "📚" },
  { label: "Community", icon: "💬" },
  { label: "Profile", icon: "👤" },
  { label: "Settings", icon: "⚙️" },
];

export default function GardenPage() {
  return (
    <main className="relative w-screen min-h-screen overflow-y-auto text-white">

      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center py-20">

        {/* HERO */}
        <div className="mb-10">
          <Image
            src="/brand/hero.png"
            alt="Hero"
            width={200}
            height={200}
            className="rounded-full"
          />
        </div>

        {/* TITLE */}
        <h1 className="text-6xl font-extrabold tracking-tight mb-14">
          The Garden
        </h1>

        {/* ICON GRID — ABSOLUTE SCALE */}
        <div
          className="
            grid
            grid-cols-3
            md:grid-cols-4
            lg:grid-cols-5
            gap-16
            w-full
            px-20
            justify-items-center
          "
        >
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                flex flex-col items-center justify-center
                w-44 h-44
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
