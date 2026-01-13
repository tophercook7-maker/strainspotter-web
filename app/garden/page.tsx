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
      <div className="mt-10 mb-4 flex justify-center">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-24 h-24 object-contain"
          draggable={false}
        />
      </div>

      {/* TITLE */}
      <h1 className="mt-4 text-5xl font-semibold text-white drop-shadow-lg text-center">
        StrainSpotter
      </h1>

      {/* APP GRID — IPAD STYLE */}
      <div className="mt-10 flex justify-center">
        <div className="grid grid-cols-3 gap-x-16 gap-y-14">
          {Object.entries(ROUTES).map(([key, route]) => (
            <button
              key={key}
              onClick={() => router.push(route.path)}
              className="group flex flex-col items-center"
            >
              <div className="
                w-24 h-24
                rounded-[22px]
                bg-white/70
                backdrop-blur-md
                shadow-[0_12px_30px_rgba(0,0,0,0.25)]
                border border-white/40
                flex items-center justify-center
                transition
                group-hover:scale-105
                group-active:scale-95
              ">
                <span className="text-3xl">{route.icon}</span>
              </div>

              <span className="
                mt-3
                text-sm
                font-medium
                text-white
                drop-shadow
              ">
                {route.label}
              </span>
            </button>
          ))}
        </div>
      </div>

    </main>
  );
}
