"use client";

import { useRouter } from "next/navigation";

const ICONS = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🪴", route: "/garden/grow-coach" },
  { label: "History", icon: "📜", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌍", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full bg-black text-white flex flex-col items-center px-6 py-12">

      {/* HERO */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-28 h-28 mb-4 rounded-full overflow-hidden border border-white/20 shadow-xl">
          <img
            src="/brand/core/hero.png"
            alt="StrainSpotter"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight mb-2">
          StrainSpotter
        </h1>

        <p className="text-white/70 text-center max-w-xl">
          Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
        </p>
      </div>

      {/* ICON GRID */}
      <div className="
        grid
        grid-cols-3
        gap-x-16
        gap-y-14
        max-w-4xl
        w-full
        justify-items-center
      ">
        {ICONS.map(({ label, icon, route }) => (
          <button
            key={route}
            type="button"
            onClick={() => router.push(route)}
            className="
              w-36 h-36
              rounded-3xl
              bg-white/15
              backdrop-blur-xl
              border border-white/25
              shadow-xl
              flex flex-col items-center justify-center
              hover:bg-white/25
              transition
              cursor-pointer
            "
          >
            <span className="text-6xl mb-3">{icon}</span>
            <span className="text-base font-semibold tracking-wide">
              {label}
            </span>
          </button>
        ))}
      </div>

    </main>
  );
}
