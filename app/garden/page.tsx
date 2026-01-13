"use client";

import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Strains", icon: "🌿", path: "/garden/strains" },
  { label: "Scanner", icon: "📷", path: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", path: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", path: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", path: "/garden/grow-coach" },
  { label: "History", icon: "📜", path: "/garden/history" },
  { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌐", path: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", path: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen w-full bg-black text-white"
      style={{
        backgroundImage: "url('/hero.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="min-h-screen w-full backdrop-blur-sm bg-black/60 flex flex-col items-center">
        
        {/* HERO */}
        <div className="mt-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-black/70 flex items-center justify-center mb-4">
            <span className="text-4xl">🌿</span>
          </div>

          <h1 className="text-5xl font-extrabold tracking-wide">
            StrainSpotter
          </h1>

          <p className="mt-2 text-white/70">
            Your personal cannabis ecosystem
          </p>
        </div>

        {/* ICON GRID */}
        <div className="mt-16 grid grid-cols-3 gap-16">
          {ROUTES.map(({ label, icon, path }) => (
            <button
              key={label}
              onClick={() => router.push(path)}
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
              <span className="text-4xl mb-2">{icon}</span>
              <span className="text-sm font-semibold tracking-wide">
                {label}
              </span>
            </button>
          ))}
        </div>

      </div>
    </main>
  );
}
