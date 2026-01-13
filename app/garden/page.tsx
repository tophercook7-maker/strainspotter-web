"use client";

import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Strains", icon: "🌿", href: "/strains" },
  { label: "Scanner", icon: "📸", href: "/scanner" },
  { label: "Dispensaries", icon: "📍", href: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", href: "/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", href: "/grow-coach" },
  { label: "History", icon: "🕘", href: "/history" },
  { label: "Favorites", icon: "⭐", href: "/favorites" },
  { label: "Ecosystem", icon: "🌐", href: "/ecosystem" },
  { label: "Settings", icon: "⚙️", href: "/settings" },
];

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
      <div className="fixed top-0 left-0 z-[9999] bg-red-600 text-white px-2 py-1">
        GARDEN PAGE ACTIVE
      </div>

      {/* HERO ICON (MASKED) */}
      <div className="mt-10 mb-6 flex justify-center">
        <div className="w-[180px] h-[180px] overflow-hidden rounded-full flex items-center justify-center">
          <img
            src="/hero.png"
            alt="StrainSpotter"
            className="w-[240px] h-[240px] object-cover translate-y-2"
            draggable={false}
          />
        </div>
      </div>

      <h1 className="mt-2 mb-10 text-[44px] font-semibold tracking-tight text-white text-center drop-shadow-sm">
        StrainSpotter
      </h1>

      {/* APP GRID — IPAD STYLE */}
      <div className="flex justify-center w-full">
        <div className="grid grid-cols-4 gap-x-14 gap-y-14 justify-center">
          {ROUTES.map((route) => (
            <button
              key={route.label}
              onClick={() => router.push(route.path)}
              className="
                w-[120px] h-[120px]
                rounded-[28px]
                bg-white/70
                backdrop-blur-xl
                shadow-[0_20px_40px_rgba(0,0,0,0.25)]
                flex flex-col items-center justify-center
                transition-transform duration-200
                hover:scale-105 active:scale-95
              "
            >
              <span className="text-3xl mb-2">{route.icon}</span>
              <span className="text-[13px] font-medium text-black/80">
                {route.label}
              </span>
            </button>
          ))}
        </div>
      </div>

    </main>
  );
}
