"use client";

import { useRouter } from "next/navigation";

const APPS = [
  { label: "Strains", icon: "🌿", route: "/strains" },
  { label: "Scanner", icon: "📷", route: "/scanner" },
  { label: "Dispensaries", icon: "📍", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", route: "/grow-coach" },
  { label: "History", icon: "🕘", route: "/history" },
  { label: "Favorites", icon: "⭐", route: "/favorites" },
  { label: "Ecosystem", icon: "🌐", route: "/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/settings" },
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
      {/* HERO ICON */}
      <div className="mt-10 mb-4 flex justify-center">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-14 h-14 object-contain"
          draggable={false}
        />
      </div>

      {/* TITLE */}
      <h1 className="text-5xl font-semibold tracking-tight mb-16 text-center text-white drop-shadow-sm">
        StrainSpotter
      </h1>

      {/* APP GRID — IPAD STYLE */}
      <div className="grid grid-cols-3 gap-x-28 gap-y-24 place-items-center">
        {APPS.map(app => (
          <button
            key={app.label}
            onClick={() => router.push(app.route)}
            type="button"
            className="flex flex-col items-center select-none"
          >
            <div
              className="
                w-28 h-28
                rounded-[28px]
                bg-white/85
                backdrop-blur-md
                ring-1 ring-white/40
                shadow-[0_16px_36px_rgba(0,0,0,0.35)]
                flex items-center justify-center
                text-4xl
                transition-transform duration-200
                hover:scale-105
                active:scale-95
              "
            >
              {app.icon}
            </div>

            <span className="mt-4 text-sm font-medium text-white drop-shadow">
              {app.label}
            </span>
          </button>
        ))}
      </div>

    </main>
  );
}
