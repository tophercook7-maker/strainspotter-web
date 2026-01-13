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
      <div className="mt-4 mb-2 flex justify-center">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-20 h-20 object-contain"
          draggable={false}
        />
      </div>

      <h1 className="mt-2 mb-8 text-center text-4xl font-semibold tracking-tight text-white drop-shadow">
        StrainSpotter
      </h1>

      {/* APP GRID — IPAD STYLE */}
      <div className="grid grid-cols-3 gap-x-12 gap-y-12 justify-items-center">
        {ROUTES.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className="
              w-32 h-32
              rounded-[30px]
              bg-white/75
              backdrop-blur-2xl
              shadow-[0_18px_40px_rgba(0,0,0,0.35)]
              flex flex-col items-center justify-center
              transition-all duration-200 ease-out
              hover:scale-[1.06]
              active:scale-[0.94]
            "
          >
            <div className="text-4xl mb-2">{item.icon}</div>
            <div className="text-sm font-medium text-black/80 text-center px-2">
              {item.label}
            </div>
          </button>
        ))}
      </div>

    </main>
  );
}
