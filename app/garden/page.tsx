"use client";

import Image from "next/image";

const BUTTONS = [
  { label: "Strain Browser", icon: "🌿" },
  { label: "Scanner", icon: "📷" },
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌱" },
  { label: "Grow Coach", icon: "🧠" },
  { label: "History", icon: "📜" },
  { label: "Lab Results", icon: "🧪" },
  { label: "Community", icon: "💬" },
  { label: "Settings", icon: "⚙️" },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-8 py-24">
        {/* HERO */}
        <div className="mb-20 flex flex-col items-center">
          <div className="relative w-48 h-48 rounded-full overflow-hidden border border-green-400/40 shadow-[0_0_80px_rgba(34,197,94,0.35)] mb-10">
            <Image
              src="/hero.jpg"
              alt="Hero"
              fill
              className="object-cover"
            />
          </div>

          <h1 className="text-6xl font-extrabold tracking-tight mb-4">
            The Garden
          </h1>

          <p className="text-white/70 text-center max-w-xl text-lg">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        {/* GLASS ICON GRID */}
        <div className="grid grid-cols-3 gap-x-32 gap-y-32 mt-24">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                w-56 h-56
                rounded-[32px]
                bg-white/15
                backdrop-blur-2xl
                border border-white/30
                shadow-[0_40px_120px_rgba(0,0,0,0.7)]
                flex flex-col items-center justify-center
                transition-all duration-300 ease-out
                hover:bg-white/25
                hover:scale-105
                hover:shadow-[0_60px_160px_rgba(34,197,94,0.35)]
              "
            >
              <span className="text-7xl mb-8">
                {b.icon}
              </span>

              <span className="text-lg font-semibold tracking-wide text-white/90 text-center px-6">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
