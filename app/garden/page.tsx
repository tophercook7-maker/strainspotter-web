"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

const ICONS = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", route: "/garden/dispensaries" },

  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "History", icon: "🕘", route: "/garden/history" },

  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌐", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center">
      
      {/* HERO */}
      <div className="mt-10 mb-4">
        <Image
          src="/hero.png"
          alt="StrainSpotter"
          width={96}
          height={96}
          priority
        />
      </div>

      {/* TITLE */}
      <h1 className="text-4xl font-extrabold tracking-tight mb-12">
        StrainSpotter
      </h1>

      {/* ICON GRID */}
      <div
        className="
          grid
          grid-cols-3
          gap-x-24
          gap-y-20
          place-items-center
        "
      >
        {ICONS.map(({ label, icon, route }) => (
          <button
            key={label}
            type="button"
            onClick={() => router.push(route)}
            className="
              w-28 h-28
              rounded-3xl
              bg-white/15
              backdrop-blur-xl
              border border-white/25
              shadow-xl
              flex flex-col
              items-center
              justify-center
              hover:bg-white/25
              transition
              focus:outline-none
              focus:ring-2
              focus:ring-white/40
            "
          >
            <div className="text-4xl mb-2">{icon}</div>
            <div className="text-sm font-semibold tracking-wide">
              {label}
            </div>
          </button>
        ))}
      </div>

    </main>
  );
}
