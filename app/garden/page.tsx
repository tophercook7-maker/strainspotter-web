"use client";

import Image from "next/image";

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
      <div className="absolute inset-0 bg-black/55" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-24 pb-16">
        {/* HERO */}
        <div className="flex flex-col items-center mb-16">
          <div className="relative w-40 h-40 rounded-full overflow-hidden border border-white/30">
            <Image
              src="/hero.jpg"
              alt="Hero"
              fill
              className="object-cover"
            />
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="mt-3 text-white/75 text-center max-w-lg">
            Your personal cannabis ecosystem.
          </p>
        </div>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 gap-8">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              className="
                group
                w-28 h-28
                rounded-3xl
                bg-white/10
                backdrop-blur-xl
                border border-white/20
                flex flex-col items-center justify-center
                hover:bg-white/20
                transition
              "
            >
              <span className="text-4xl">{b.icon}</span>
              <span className="mt-2 text-sm font-semibold text-white/90">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
