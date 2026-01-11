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

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-6 py-20">
        {/* HERO */}
        <div className="mb-16 flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-green-500/20 backdrop-blur-md flex items-center justify-center mb-6 border border-green-400/30">
            <span className="text-5xl">🍃</span>
          </div>

          <h1 className="text-5xl font-extrabold mb-3">The Garden</h1>
          <p className="text-white/70 text-center max-w-xl">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        {/* BUTTON GRID */}
        <div className="grid grid-cols-3 gap-10 max-w-3xl">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                flex flex-col items-center justify-center
                w-32 h-32 rounded-2xl
                bg-white/10 backdrop-blur-md
                border border-white/20
                hover:bg-white/20 transition
              "
            >
              <span className="text-4xl mb-2">{b.icon}</span>
              <span className="text-sm font-medium text-white/90 text-center">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
