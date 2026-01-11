"use client";

import Image from "next/image";

const BUTTONS = [
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌱" },
  { label: "Strains", icon: "🧬" },
  { label: "My Garden", icon: "🌿" },
  { label: "Grow Tools", icon: "🛠️" },
  { label: "Scanner", icon: "📷" },
  { label: "Journal", icon: "📓" },
  { label: "Learn", icon: "📚" },
  { label: "Settings", icon: "⚙️" },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white">
      
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        {/* HERO */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 h-28 w-28 rounded-full bg-white/15 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl">
            <Image
              src="/hero.png"
              alt="Hero"
              width={72}
              height={72}
            />
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="mt-3 text-white/80 text-lg">
            Your personal cannabis ecosystem
          </p>
        </div>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 gap-12">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                h-36 w-36 rounded-3xl
                bg-white/15 backdrop-blur-xl
                border border-white/20
                shadow-2xl
                flex flex-col items-center justify-center
                hover:bg-white/25 hover:scale-105
                transition
              "
            >
              <span className="text-4xl mb-3">{b.icon}</span>
              <span className="text-sm font-semibold text-white/90 text-center">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
