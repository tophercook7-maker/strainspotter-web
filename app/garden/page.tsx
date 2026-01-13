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
    <main
      className="min-h-screen w-full text-white bg-cover bg-center"
      style={{ backgroundImage: "url('/background.jpg')" }}
    >
      {/* HERO */}
      <div className="flex flex-col items-center pt-10">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-[120px] h-[120px] object-contain"
          draggable={false}
        />

        <h1 className="mt-2 mb-10 text-4xl font-semibold text-green-400 text-center tracking-tight">
          StrainSpotter
        </h1>
      </div>

      {/* ICON GRID */}
      <div className="w-full flex justify-center">
        <div className="grid grid-cols-3 gap-x-16 gap-y-14 justify-items-center mt-8">
          {ROUTES.map((route) => (
            <button
              key={route.label}
              type="button"
              onClick={() => router.push(route.path)}
              className="
                w-32 h-32
                rounded-[32px]
                bg-white/85
                backdrop-blur-xl
                shadow-[0_18px_40px_rgba(0,0,0,0.28)]
                hover:scale-105
                active:scale-95
                transition-all
                duration-200
                flex
                flex-col
                items-center
                justify-center
                cursor-pointer
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
