"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const BUTTONS = [
  { label: "Strains", icon: "🌿", href: "/garden/strains" },
  { label: "Scanner", icon: "📷", href: "/garden/scanner" },
  { label: "History", icon: "📜", href: "/garden/history" },
  { label: "Grow Coach", icon: "🌱", href: "/garden/grow" },
  { label: "Dispensaries", icon: "🏪", href: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌰", href: "/garden/seed-vendors" },
  { label: "Effects", icon: "✨", href: "/garden/effects" },
  { label: "Favorites", icon: "⭐", href: "/garden/favorites" },
  { label: "Settings", icon: "⚙️", href: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        unoptimized
        className="object-cover"
      />

      {/* SOFT DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/35" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-10 py-28">
        {/* HERO */}
        <div className="mb-16 flex flex-col items-center">
          <div className="mb-6 h-36 w-36 rounded-full overflow-hidden shadow-2xl ring-4 ring-green-500/70">
            <Image
              src="/brand/core/hero.png"
              alt="StrainSpotter Hero"
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="mt-4 max-w-xl text-center text-white/85 text-lg">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        {/* APP ICON GRID — iPad STYLE */}
        <div className="grid grid-cols-3 gap-x-24 gap-y-24">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              onClick={() => router.push(b.href)}
              className="
                h-48
                w-48
                rounded-[2.5rem]
                bg-white/20
                backdrop-blur-2xl
                border
                border-white/30
                shadow-[0_20px_60px_rgba(0,0,0,0.6)]
                flex
                flex-col
                items-center
                justify-center
                transition
                duration-200
                hover:scale-110
                hover:bg-white/30
                active:scale-100
              "
            >
              <div className="text-7xl mb-5">{b.icon}</div>
              <span className="text-lg font-bold tracking-wide text-white">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
