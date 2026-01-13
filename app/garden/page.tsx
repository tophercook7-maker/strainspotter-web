"use client";

import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Strains", icon: "🌿", path: "/garden/strains" },
  { label: "Scanner", icon: "📷", path: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", path: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", path: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", path: "/garden/grow-coach" },
  { label: "History", icon: "🕓", path: "/garden/history" },
  { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌐", path: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", path: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-black via-black/95 to-black text-white flex flex-col items-center">

      {/* HERO (SMALL, CONTROLLED, NOT BACKGROUND) */}
      <div className="mt-10 flex flex-col items-center">
        <div className="w-32 h-32 rounded-full bg-black/40 flex items-center justify-center">
          <img
            src="/brand/core/hero.png"
            alt="StrainSpotter"
            className="w-28 h-28 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>

        <h1 className="mt-6 text-5xl font-extrabold tracking-tight">
          StrainSpotter
        </h1>

        <p className="mt-2 text-white/70 text-center max-w-xl">
          Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
        </p>
      </div>

      {/* ICON GRID — IPAD STYLE, EVEN ROWS */}
      <div className="mt-16 grid grid-cols-3 gap-x-20 gap-y-16 place-items-center">
        {ROUTES.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => router.push(item.path)}
            className="
              flex flex-col items-center justify-center
              w-32 h-32
              rounded-3xl
              bg-white/15
              backdrop-blur-xl
              border border-white/25
              shadow-xl
              hover:bg-white/25
              transition
              cursor-pointer
            "
          >
            <span className="text-4xl mb-2">{item.icon}</span>
            <span className="text-sm font-semibold tracking-wide">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <div className="h-24" />
    </main>
  );
}
