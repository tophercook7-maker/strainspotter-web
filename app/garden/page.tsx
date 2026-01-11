"use client";

import Image from "next/image";

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

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-8 py-24">
        {/* HERO IMAGE */}
        <div className="mb-24 flex flex-col items-center">
          <div className="
            relative
            w-48 h-48
            rounded-full
            overflow-hidden
            border border-green-400/40
            shadow-[0_0_90px_rgba(34,197,94,0.35)]
            mb-10
          ">
            <Image
              src="/hero.jpg"
              alt="Garden Hero"
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
          {[
            { label: "Strain Browser", icon: "🌿" },
            { label: "Scanner", icon: "📷" },
            { label: "Dispensaries", icon: "🏪" },
            { label: "Seed Vendors", icon: "🌱" },
            { label: "Grow Coach", icon: "🧠" },
            { label: "History", icon: "📜" },
            { label: "Lab Results", icon: "🧪" },
            { label: "Community", icon: "💬" },
            { label: "Settings", icon: "⚙️" },
          ].map((b) => (
            <button
              key={b.label}
              className="
                w-60 h-60
                rounded-[36px]
                bg-white/10
                backdrop-blur-2xl
                border border-white/25
                shadow-[0_25px_80px_rgba(0,0,0,0.7)]
                flex flex-col items-center justify-center
                transition-all duration-300 ease-out
                hover:bg-white/20
                hover:scale-105
                hover:shadow-[0_35px_120px_rgba(34,197,94,0.25)]
              "
            >
              <span className="text-7xl mb-6 drop-shadow-xl">
                {b.icon}
              </span>

              <span className="text-lg font-semibold tracking-wide text-white/90 text-center px-4">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
