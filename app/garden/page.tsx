"use client";

import { useRouter } from "next/navigation";

const ICONS = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "History", icon: "🕘", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌐", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full bg-black text-white flex flex-col items-center">
      
      {/* HERO */}
      <div className="mt-8 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-black/70 flex items-center justify-center">
          <span className="text-3xl">🌿</span>
        </div>

        <h1 className="mt-4 text-6xl font-extrabold tracking-tight">
          StrainSpotter
        </h1>

        <p className="mt-2 text-white/60">
          Your personal cannabis ecosystem
        </p>
      </div>

      {/* ICON GRID */}
      <div className="mt-20 grid grid-cols-3 gap-x-24 gap-y-20">
        {ICONS.map(({ label, icon, route }) => (
          <button
            key={label}
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
            "
          >
            <span className="text-5xl mb-3">{icon}</span>
            <span className="text-base font-semibold tracking-wide">
              {label}
            </span>
          </button>
        ))}
      </div>

    </main>
  );
}
