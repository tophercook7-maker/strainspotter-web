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
    <main className="relative min-h-screen text-white overflow-hidden">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-8 py-24">
        {/* HERO */}
        <div className="mb-20 flex flex-col items-center">
          <div className="w-36 h-36 rounded-full bg-green-500/20 backdrop-blur-xl flex items-center justify-center mb-6 border border-green-400/30 shadow-2xl">
            <span className="text-6xl">🍃</span>
          </div>

          <h1 className="text-5xl font-extrabold mb-3">The Garden</h1>
          <p className="text-white/70 text-center max-w-xl">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        {/* GLASS BUTTON GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                group
                w-44 h-44 md:w-48 md:h-48
                rounded-3xl
                bg-white/10 backdrop-blur-xl
                border border-white/20
                shadow-xl
                flex flex-col items-center justify-center
                transition-all duration-300
                hover:bg-white/20 hover:scale-105
              "
            >
              <span className="text-6xl mb-4 drop-shadow-lg">
                {b.icon}
              </span>

              <span className="text-sm font-semibold text-white/90 text-center px-3">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
