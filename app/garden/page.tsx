"use client";

import { useRouter } from "next/navigation";

const ICONS = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", route: "/garden/grow-coach" },
  { label: "History", icon: "📜", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌐", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full bg-black text-white flex flex-col items-center overflow-y-auto">
      
      {/* HERO */}
      <div className="mt-10 flex flex-col items-center">
        <div className="w-28 h-28 rounded-full bg-black flex items-center justify-center ring-4 ring-green-400">
          <img
            src="/brand/core/hero.png"
            alt="StrainSpotter"
            className="w-20 h-20 object-contain"
          />
        </div>

        <h1 className="mt-6 text-5xl font-extrabold tracking-tight">
          StrainSpotter
        </h1>

        <p className="mt-2 text-white/70 text-center max-w-xl">
          Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
        </p>
      </div>

      {/* ICON GRID */}
      <div className="mt-16 grid grid-cols-3 gap-x-20 gap-y-16">
        {ICONS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => router.push(item.route)}
            className="
              flex flex-col items-center justify-center
              w-32 h-32
              rounded-3xl
              bg-white/20
              backdrop-blur-xl
              border border-white/30
              shadow-xl
              hover:bg-white/30
              transition
            "
          >
            <span className="text-5xl mb-3">{item.icon}</span>
            <span className="text-sm font-semibold tracking-wide">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <div className="h-24" />
    </main>
  );
}
