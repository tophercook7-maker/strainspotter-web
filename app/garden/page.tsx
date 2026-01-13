"use client";

import { useRouter } from "next/navigation";

const ROUTES = {
  strains: "/strains",
  scanner: "/scanner",
  dispensaries: "/garden/dispensaries",
  seedVendors: "/seed-vendors",
  growCoach: "/grow-coach",
  history: "/history",
  favorites: "/favorites",
  ecosystem: "/ecosystem",
  settings: "/settings",
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
          className="w-[220px] max-w-[70vw] object-contain"
          draggable={false}
        />
      </div>

      {/* TITLE */}
      <h1 className="mt-4 mb-10 text-5xl font-semibold text-white text-center tracking-tight">
        StrainSpotter
      </h1>

      {/* APP GRID — IPAD STYLE */}
      <div className="grid grid-cols-3 gap-x-20 gap-y-16 justify-items-center">
        {[
          ["Strains", "🌿", ROUTES.strains],
          ["Scanner", "📸", ROUTES.scanner],
          ["Dispensaries", "📍", ROUTES.dispensaries],
          ["Seed Vendors", "🌱", ROUTES.seedVendors],
          ["Grow Coach", "🧑‍🌾", ROUTES.growCoach],
          ["History", "🕘", ROUTES.history],
          ["Favorites", "⭐", ROUTES.favorites],
          ["Ecosystem", "🌐", ROUTES.ecosystem],
          ["Settings", "⚙️", ROUTES.settings],
        ].map(([label, icon, route]) => (
          <button
            key={label}
            type="button"
            onClick={() => router.push(route as string)}
            className="
              w-32 h-32
              rounded-[28px]
              bg-white/75
              backdrop-blur-xl
              shadow-[0_12px_30px_rgba(0,0,0,0.25)]
              flex flex-col items-center justify-center
              text-[15px] font-medium text-black
              hover:scale-105
              active:scale-100
              transition-transform duration-150
            "
          >
            {/* iPad-style icon tile */}
            <div
              className="
                w-24 h-24
                rounded-[26px]
                bg-white/80
                backdrop-blur-md
                ring-1 ring-white/40
                shadow-[0_18px_40px_rgba(0,0,0,0.35)]
                flex items-center justify-center
                transition-transform duration-200
                hover:scale-105
                active:scale-95
              "
            >
              <span className="mb-3 w-9 h-9">{icon}</span>
            </div>

            {/* label */}
            <span className="mt-3 text-sm font-medium text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.70)]">
              {label}
            </span>
          </button>
        ))}
      </div>

    </main>
  );
}
