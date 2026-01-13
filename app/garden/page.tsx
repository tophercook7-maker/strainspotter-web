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
    <main className="relative min-h-screen bg-black text-white overflow-hidden">

      {/* BACKGROUND ONLY */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/garden-hero.png')" }}
      />
      <div className="absolute inset-0 bg-black/70" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center">

        {/* SMALL HERO MARK */}
        <div className="mt-10 mb-4 h-20 w-20 rounded-full bg-black/60 flex items-center justify-center">
          <span className="text-3xl">🌿</span>
        </div>

        {/* TITLE */}
        <h1 className="text-5xl font-extrabold tracking-wide mb-16">
          StrainSpotter
        </h1>

        {/* ICON GRID */}
        <section className="grid grid-cols-3 gap-x-24 gap-y-16 pb-24">
          {ROUTES.map(({ label, icon, path }) => (
            <button
              key={label}
              type="button"
              onClick={() => router.push(path)}
              className="
                flex flex-col items-center justify-center
                w-32 h-32
                rounded-3xl
                bg-white/20
                backdrop-blur-xl
                border border-white/30
                shadow-xl
                hover:bg-white/30
                transition
              "
            >
              <span className="text-4xl mb-2">{icon}</span>
              <span className="text-sm font-semibold tracking-wide text-white/90">
                {label}
              </span>
            </button>
          ))}
        </section>

      </div>
    </main>
  );
}
