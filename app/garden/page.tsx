"use client";

import { useRouter } from "next/navigation";

const ICONS = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", route: "/garden/grow-coach" },
  { label: "History", icon: "📜", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌐", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full bg-black text-white overflow-y-auto">
      
      {/* HEADER BLOCK — FIXED HEIGHT */}
      <div className="w-full flex flex-col items-center pt-10 pb-8">
        <img
          src="/brand/core/hero.png"
          alt="StrainSpotter"
          className="w-20 h-20 object-contain"
        />

        <h1 className="mt-4 text-5xl font-extrabold tracking-tight">
          StrainSpotter
        </h1>

        <p className="mt-2 text-white/60 text-center max-w-xl">
          Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
        </p>
      </div>

      {/* ICON GRID — NORMAL FLOW, NO FLEX CENTERING */}
      <div className="w-full px-20">
        <div className="grid grid-cols-3 gap-x-24 gap-y-20 justify-items-center">
          {ICONS.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.route)}
              className="
                w-32 h-32
                rounded-3xl
                bg-white/20
                backdrop-blur-xl
                border border-white/30
                shadow-xl
                flex flex-col items-center justify-center
                hover:bg-white/30
                transition
              "
            >
              <span className="text-5xl mb-3">{item.icon}</span>
              <span className="text-sm font-semibold tracking-wide">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-24" />
    </main>
  );
}
