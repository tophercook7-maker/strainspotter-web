"use client";

import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Strains", path: "/garden/strains", icon: "🌿" },
  { label: "Scanner", path: "/garden/scanner", icon: "📷" },
  { label: "Dispensaries", path: "/garden/dispensaries", icon: "🏪" },
  { label: "Seed Vendors", path: "/garden/seed-vendors", icon: "🌱" },
  { label: "Grow Coach", path: "/garden/grow-coach", icon: "🧠" },
  { label: "History", path: "/garden/history", icon: "📜" },
  { label: "Favorites", path: "/garden/favorites", icon: "⭐" },
  { label: "Ecosystem", path: "/garden/ecosystem", icon: "🧬" },
  { label: "Settings", path: "/garden/settings", icon: "⚙️" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full text-white">
      {/* HERO */}
      <div className="flex flex-col items-center pt-10">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-[120px] h-[120px] object-contain"
          draggable={false}
        />

        <h1 className="mt-4 mb-14 text-[56px] font-semibold tracking-tight text-center">
          StrainSpotter
        </h1>
      </div>

      {/* ICON GRID */}
      <div className="w-full flex justify-center">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-x-24 gap-y-24 pb-24">
          {ROUTES.map((route) => (
            <button
              key={route.label}
              type="button"
              onClick={() => router.push(route.path)}
              className="
                w-[150px] h-[150px]
                rounded-[36px]
                bg-white/75
                backdrop-blur-2xl
                shadow-[0_35px_70px_rgba(0,0,0,0.4)]
                flex flex-col items-center justify-center
                transition-all duration-200
                hover:scale-110 active:scale-95
              "
            >
              <div className="text-[40px] mb-3">{route.icon}</div>
              <div className="text-[15px] font-medium text-black/80">
                {route.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
