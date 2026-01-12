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

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/40" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-8 py-24">
        {/* HERO */}
        <div className="mb-12 flex flex-col items-center">
          <div className="mb-6 h-32 w-32 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center shadow-2xl">
            <Image
              src="/brand/core/hero.png"
              alt="StrainSpotter Hero"
              width={110}
              height={110}
              unoptimized
            />
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="mt-4 max-w-xl text-center text-white/80">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        {/* APP ICON GRID */}
        <div className="grid grid-cols-3 gap-x-20 gap-y-20">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              onClick={() => router.push(b.href)}
              className="
                h-44
                w-44
                rounded-[2.25rem]
                bg-white/15
                backdrop-blur-2xl
                border
                border-white/25
                shadow-2xl
                flex
                flex-col
                items-center
                justify-center
                transition
                hover:scale-105
                hover:bg-white/25
                active:scale-100
              "
            >
              <div className="text-6xl mb-4">{b.icon}</div>
              <span className="text-sm font-semibold tracking-wide text-white">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
