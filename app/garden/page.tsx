"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const BUTTONS = [
  { label: "Strains", icon: "🌿", path: "/garden/strains" },
  { label: "Scanner", icon: "📷", path: "/garden/scanner" },
  { label: "History", icon: "📜", path: "/garden/history" },
  { label: "Grow Coach", icon: "🌱", path: "/garden/grow" },
  { label: "Dispensaries", icon: "🏪", path: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌰", path: "/garden/seed-vendors" },
  { label: "Effects", icon: "✨", path: "/garden/effects" },
  { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
  { label: "Settings", icon: "⚙️", path: "/garden/settings" },
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
        className="object-cover"
      />

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center px-6 pt-20">
        {/* HERO */}
        <div className="mb-10 flex flex-col items-center">
          <Image
            src="/brand/core/hero.png"
            alt="StrainSpotter Hero"
            width={110}
            height={110}
            priority
          />

          <h1 className="mt-4 text-5xl font-extrabold tracking-tight">
            The Garden
          </h1>

          <p className="mt-3 max-w-xl text-center text-white/80">
            Your personal cannabis ecosystem — calm, grounded, and built on
            supported truth.
          </p>
        </div>

        {/* GLASS BUTTON GRID */}
        <div className="grid grid-cols-3 gap-x-14 gap-y-14">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              onClick={() => router.push(b.path)}
              className="
                h-32 w-32
                rounded-3xl
                bg-white/15
                backdrop-blur-xl
                border border-white/25
                shadow-xl
                transition-all
                hover:bg-white/25
                hover:scale-105
                flex flex-col
                items-center
                justify-center
                gap-3
              "
            >
              <span className="text-4xl">{b.icon}</span>
              <span className="text-sm font-semibold tracking-wide">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
