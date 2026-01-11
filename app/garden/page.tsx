"use client";

import Image from "next/image";

const BUTTONS = [
  "Dispensaries",
  "Seed Vendors",
  "Strains",
  "Grow Help",
  "My Garden",
  "Journal",
  "Learn",
  "Tools",
  "Settings",
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen text-white overflow-hidden flex items-center justify-center">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover -z-10"
      />

      {/* CONTENT WRAPPER */}
      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-5xl">

        {/* HERO */}
        <div className="mb-12">
          <Image
            src="/hero.png"
            alt="Garden Hero"
            width={160}
            height={160}
            className="rounded-full shadow-xl"
          />
        </div>

        {/* BUTTON GRID */}
        <div className="grid grid-cols-3 gap-8 w-full max-w-3xl">
          {BUTTONS.map((label) => (
            <button
              key={label}
              className="
                flex flex-col items-center justify-center
                h-28 w-full
                rounded-2xl
                bg-white/10
                backdrop-blur-md
                border border-white/20
                shadow-lg
                hover:bg-white/20
                hover:scale-[1.03]
                transition-all
                text-sm font-semibold
              "
            >
              <span className="text-lg">🌿</span>
              <span className="mt-2">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
