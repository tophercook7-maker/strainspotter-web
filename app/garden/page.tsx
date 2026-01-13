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
    <main className="min-h-screen bg-black text-white flex flex-col items-center">
      
      {/* HERO */}
      <div className="mt-10 mb-4">
        <div className="w-20 h-20 rounded-full border border-green-400 flex items-center justify-center text-green-400 text-4xl">
          🌿
        </div>
      </div>

      {/* TITLE */}
      <h1 className="text-5xl font-extrabold tracking-tight mb-14">
        StrainSpotter
      </h1>

      {/* APP GRID */}
      <div className="grid grid-cols-3 gap-x-20 gap-y-16">
        {APPS.map(app => (
          <button
            key={app.label}
            onClick={() => router.push(app.route)}
            className="flex flex-col items-center focus:outline-none group"
            type="button"
          >
            <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md shadow-lg flex items-center justify-center text-4xl group-hover:scale-105 transition">
              {app.icon}
            </div>
            <span className="mt-3 text-sm text-white/80">
              {app.label}
            </span>
          </button>
        ))}
      </div>

    </main>
  );
}
