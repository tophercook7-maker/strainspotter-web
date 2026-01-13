"use client";

import { useRouter } from "next/navigation";

const ICONS = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "History", icon: "🕓", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌐", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white px-8 pt-10">
      
      {/* HERO */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-24 h-24 rounded-3xl bg-green-500/20 flex items-center justify-center mb-4">
          <span className="text-4xl">🌿</span>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight mb-2">
          StrainSpotter
        </h1>

        <p className="text-white/60 text-sm">
          Your personal cannabis ecosystem
        </p>
      </div>

      {/* ICON GRID */}
      <div className="grid grid-cols-3 gap-14 max-w-4xl mx-auto place-items-center mt-16">
        {ICONS.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.route)}
            className="
              w-32 h-32
              rounded-3xl
              bg-white/15
              backdrop-blur-xl
              border border-white/25
              shadow-xl
              flex flex-col items-center justify-center
              hover:bg-white/25
              transition
            "
          >
            <div className="text-4xl mb-2">{item.icon}</div>
            <div className="text-sm font-semibold text-white/90">
              {item.label}
            </div>
          </button>
        ))}
      </div>

    </main>
  );
}
