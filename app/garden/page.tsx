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
      {/* HERO ICON — CLEAN, NO BACKGROUND */}
      <div className="mt-12 mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl">
          🌿
        </div>
      </div>

      {/* TITLE */}
      <h1 className="text-5xl font-extrabold tracking-tight mb-16 drop-shadow">
        StrainSpotter
      </h1>

      {/* APP GRID — IPAD STYLE */}
      <div className="grid grid-cols-3 gap-x-24 gap-y-20">
        {APPS.map(app => (
          <button
            key={app.label}
            onClick={() => router.push(app.route)}
            type="button"
            className="flex flex-col items-center focus:outline-none"
          >
            <div className="w-28 h-28 rounded-3xl bg-white/80 backdrop-blur shadow-xl flex items-center justify-center text-4xl hover:scale-105 transition">
              {app.icon}
            </div>
            <span className="mt-4 text-sm text-white drop-shadow">
              {app.label}
            </span>
          </button>
        ))}
      </div>

    </main>
  );
}
