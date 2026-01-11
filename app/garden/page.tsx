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
      {/* BACKGROUND IMAGE */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        {/* HERO */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <Image
              src="/hero.png"
              alt="Hero"
              width={64}
              height={64}
              className="opacity-90"
            />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="mt-2 text-white/80">
            Your personal cannabis ecosystem
          </p>
        </div>

        {/* GLASS BUTTON GRID */}
        <div className="grid grid-cols-3 gap-8">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                flex flex-col items-center justify-center
                h-28 w-28
                rounded-2xl
                bg-white/15
                backdrop-blur-xl
                border border-white/20
                shadow-lg
                hover:bg-white/25
                transition
              "
            >
              <span className="text-3xl mb-2">{b.icon}</span>
              <span className="text-sm font-medium text-white/90">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
"use client";
import Image from "next/image";

const BUTTONS = [
  { label: "Dispensaries", icon: "🏪" },
  { label: "Seed Vendors", icon: "🌱" },
  { label: "Strains", icon: "🧬" },

  { label: "My Garden", icon: "🌿" },
  { label: "Grow Tools", icon: "🧪" },
  { label: "Scanner", icon: "📸" },

  { label: "Journal", icon: "📓" },
  { label: "Learn", icon: "📚" },
  { label: "Settings", icon: "⚙️" },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white">
      {/* BACKGROUND (already in your project) */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden Background"
        fill
        priority
        className="object-cover"
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/40" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center pt-20 px-6">
        {/* HERO */}
        <div className="mb-12 flex flex-col items-center">
          <Image
            src="/hero.png"
            alt="Hero"
            width={120}
            height={120}
            className="mb-4"
          />
          <h1 className="text-5xl font-extrabold mb-2">The Garden</h1>
          <p className="text-white/80 text-center max-w-md">
            Your personal cannabis ecosystem.
          </p>
        </div>

        {/* GLASS ICON GRID */}
        <div className="grid grid-cols-3 gap-10">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                w-32 h-32
                rounded-2xl
                backdrop-blur-xl
                bg-white/15
                border border-white/25
                shadow-lg
                flex flex-col items-center justify-center
                hover:bg-white/25
                hover:scale-105
                transition-all
              "
            >
              <span className="text-4xl mb-2">{b.icon}</span>
              <span className="text-sm font-medium">{b.label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
