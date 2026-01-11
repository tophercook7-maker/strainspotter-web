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

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-8">
        {/* HERO */}
        <div className="mb-14 text-center">
          <div className="mx-auto mb-6 h-32 w-32 rounded-full bg-white/20 backdrop-blur-2xl border border-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex items-center justify-center">
            <Image
              src="/hero.png"
              alt="Hero"
              width={80}
              height={80}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="mt-4 text-white/80 text-lg">
            Your personal cannabis ecosystem
          </p>
        </div>

        {/* BUTTON GRID */}
        <div className="grid grid-cols-3 gap-x-16 gap-y-14">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                h-40 w-40 rounded-3xl
                bg-white/20 backdrop-blur-2xl
                border border-white/30
                shadow-[0_30px_80px_rgba(0,0,0,0.6)]
                flex flex-col items-center justify-center
                hover:bg-white/30 hover:-translate-y-1 hover:shadow-[0_40px_100px_rgba(0,0,0,0.8)]
                transition-all duration-300
              "
            >
              <span className="text-5xl mb-4">{b.icon}</span>
              <span className="text-sm font-semibold tracking-wide text-white/95 text-center">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
