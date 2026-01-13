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
          className="w-20 h-20 object-contain"
          draggable={false}
        />
      </div>

      {/* TITLE */}
      <h1 className="mt-4 mb-8 text-6xl font-semibold text-white text-center drop-shadow-lg">
        StrainSpotter
      </h1>

      {/* APP GRID — IPAD STYLE */}
      <div className="flex justify-center">
        <div className="grid grid-cols-3 gap-x-20 gap-y-16">
          {Object.entries(ROUTES).map(([key, route]) => (
            <button
              key={key}
              onClick={() => router.push(route.path)}
              className="group flex flex-col items-center"
            >
              <div
                className="
                  w-28 h-28
                  rounded-[26px]
                  bg-white/80
                  backdrop-blur-xl
                  shadow-[0_18px_40px_rgba(0,0,0,0.35)]
                  border border-white/50
                  flex items-center justify-center
                  transition-transform duration-200
                  group-hover:scale-110
                  group-active:scale-95
                "
              >
                <span className="text-4xl">{route.icon}</span>
              </div>

              <span className="mt-4 text-base font-medium text-white drop-shadow">
                {route.label}
              </span>
            </button>
          ))}
        </div>
      </div>

    </main>
  );
}
