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

      {/* HERO ICON */}
      <div className="mt-6 mb-3 flex justify-center">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-24 h-24 object-contain"
          draggable={false}
        />
      </div>

      <h1 className="mt-2 mb-8 text-center text-5xl font-extrabold tracking-tight text-white drop-shadow-lg">
        StrainSpotter
      </h1>

      {/* APP GRID — IPAD STYLE */}
      <div className="mt-6 grid grid-cols-3 gap-x-10 gap-y-10 justify-items-center">
        {ROUTES.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className="
              w-28 h-28
              rounded-[28px]
              bg-white/70
              backdrop-blur-xl
              shadow-[0_12px_30px_rgba(0,0,0,0.25)]
              flex flex-col items-center justify-center
              transition-transform duration-200
              hover:scale-105
              active:scale-95
            "
          >
            <div className="text-3xl mb-1">{item.icon}</div>
            <div className="text-sm font-medium text-black/80 text-center px-2">
              {item.label}
            </div>
          </button>
        ))}
      </div>

    </main>
  );
}
