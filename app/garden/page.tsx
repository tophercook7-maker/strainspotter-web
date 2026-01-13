"use client";

import { useRouter } from "next/navigation";

export default function GardenPage() {
  const router = useRouter();

  const items = [
    { label: "Strains", icon: "🌿", path: "/garden/strains" },
    { label: "Scanner", icon: "📷", path: "/garden/scanner" },
    { label: "Dispensaries", icon: "📍", path: "/garden/dispensaries" },
    { label: "Seed Vendors", icon: "🌱", path: "/garden/seed-vendors" },
    { label: "Grow Coach", icon: "🧑‍🌾", path: "/garden/grow-coach" },
    { label: "History", icon: "📖", path: "/garden/history" },
    { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
    { label: "Ecosystem", icon: "🌍", path: "/garden/ecosystem" },
    { label: "Settings", icon: "⚙️", path: "/garden/settings" },
  ];

  return (
    <main className="min-h-screen w-full bg-black text-white overflow-y-auto">
      
      {/* HERO */}
      <img
        src="/brand/core/hero.png"
        alt="StrainSpotter"
        className="w-28 h-28 mb-4"
      />

      <h1 className="text-5xl font-extrabold mb-12">StrainSpotter</h1>

      {/* ICON GRID */}
      <div className="grid grid-cols-3 gap-x-20 gap-y-16">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.path)}
            className="w-32 h-32 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-xl flex flex-col items-center justify-center hover:bg-white/30 transition"
          >
            <div className="text-4xl mb-2">{item.icon}</div>
            <div className="text-sm font-semibold">{item.label}</div>
          </button>
        ))}
      </div>
    </main>
  );
}
