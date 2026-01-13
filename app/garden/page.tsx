"use client";

import { useRouter } from "next/navigation";

const ICONS = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", route: "/garden/grow-coach" },
  { label: "History", icon: "📖", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌍", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen flex flex-col items-center text-white">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: "url('/garden-bg.jpg')" }}
      />

      {/* HERO */}
      <div className="mt-10 flex flex-col items-center">
        <img
          src="/brand/core/hero.png"
          alt="StrainSpotter"
          className="w-32 h-32 object-contain"
        />
        <h1 className="mt-4 text-5xl font-extrabold tracking-tight">
          StrainSpotter
        </h1>
        <p className="mt-2 text-white/70">
          Your personal cannabis ecosystem
        </p>
      </div>

      {/* ICON GRID */}
      <div className="mt-16 grid grid-cols-3 gap-x-16 gap-y-12">
        {ICONS.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.route)}
            className="w-28 h-28 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 flex flex-col items-center justify-center hover:bg-white/25 transition"
          >
            <div className="text-4xl">{item.icon}</div>
            <div className="mt-2 text-sm font-semibold">{item.label}</div>
          </button>
        ))}
      </div>
    </main>
  );
}
