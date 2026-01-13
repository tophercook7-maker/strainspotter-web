"use client";

import { useRouter } from "next/navigation";

const ROUTES = {
  strains: { path: "/strains", label: "Strains", icon: "🌿" },
  scanner: { path: "/scanner", label: "Scanner", icon: "📸" },
  dispensaries: { path: "/garden/dispensaries", label: "Dispensaries", icon: "📍" },
  seedVendors: { path: "/seed-vendors", label: "Seed Vendors", icon: "🌱" },
  growCoach: { path: "/grow-coach", label: "Grow Coach", icon: "🧑‍🌾" },
  history: { path: "/history", label: "History", icon: "🕘" },
  favorites: { path: "/favorites", label: "Favorites", icon: "⭐" },
  ecosystem: { path: "/ecosystem", label: "Ecosystem", icon: "🌐" },
  settings: { path: "/settings", label: "Settings", icon: "⚙️" },
} as const;

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen flex flex-col items-center text-white"
      style={{
        backgroundImage: "url(/garden-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* HERO ICON */}
      <div className="mt-8 mb-3 flex justify-center">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-20 h-20 object-contain"
          draggable={false}
        />
      </div>

      <h1 className="mt-2 mb-10 text-center text-5xl font-extrabold tracking-tight text-white drop-shadow-lg">
        StrainSpotter
      </h1>

      {/* APP GRID — IPAD STYLE */}
      <div className="grid grid-cols-3 gap-x-14 gap-y-12 place-items-center">
        {Object.entries(ROUTES).map(([key, route]) => (
          <button
            key={key}
            onClick={() => router.push(route.path)}
            className="
              w-28 h-28
              rounded-[28px]
              bg-white/70
              backdrop-blur-md
              shadow-xl shadow-black/30
              flex flex-col items-center justify-center
              transition-all duration-200
              hover:scale-105 hover:bg-white/80
              active:scale-95
            "
          >
            <span className="text-3xl mb-2">{route.icon}</span>
            <span className="text-sm font-semibold text-black">{route.label}</span>
          </button>
        ))}
      </div>

    </main>
  );
}
