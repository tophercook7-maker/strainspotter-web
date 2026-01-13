"use client";

import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", path: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", path: "/garden/strains" },
  { label: "Scanner", icon: "📷", path: "/garden/scanner" },
  { label: "Grow Coach", icon: "🧑‍🌾", path: "/garden/grow-coach" },
  { label: "History", icon: "🕓", path: "/garden/history" },
  { label: "Seed Vendors", icon: "🌱", path: "/garden/seed-vendors" },
  { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧠", path: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", path: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen w-full text-white"
      style={{
        backgroundImage: "url(/garden-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* CONTENT COLUMN */}
      <div className="flex flex-col items-center px-6 pt-10 pb-20">
        {/* HERO */}
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-16 h-16 object-contain"
          draggable={false}
        />

        {/* TITLE */}
        <h1 className="mt-4 mb-12 text-4xl font-extrabold tracking-wide text-green-400">
          StrainSpotter
        </h1>

        {/* ICON GRID */}
        <div
          className="
            grid
            grid-cols-3
            gap-x-14
            gap-y-16
          "
        >
          {ROUTES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.path)}
              className="
                w-36 h-36
                rounded-[28px]
                flex flex-col items-center justify-center
                bg-white/20
                backdrop-blur-xl
                border border-white/30
                shadow-[0_20px_40px_rgba(0,0,0,0.35)]
                hover:bg-white/30
                active:scale-95
                transition
              "
            >
              <div className="text-5xl mb-3">{item.icon}</div>
              <div className="text-sm font-semibold tracking-wide text-white/90">
                {item.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
