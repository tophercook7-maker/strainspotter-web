"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

const ICONS = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", route: "/garden/dispensaries" },

  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", route: "/garden/grow-coach" },
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
      <div className="mt-8 mb-4">
        <Image
          src="/hero.png"
          alt="StrainSpotter"
          width={80}
          height={80}
          priority
        />
      </div>

      {/* TITLE */}
      <h1 className="text-5xl font-extrabold tracking-tight mb-16">
        StrainSpotter
      </h1>

      {/* ICON GRID — IPAD STYLE */}
      <div
        className="
          grid
          grid-cols-3
          gap-x-32
          gap-y-24
          place-items-center
        "
      >
        {ICONS.map(({ label, icon, route }) => (
          <button
            key={label}
            onClick={() => router.push(route)}
            className="
              w-36 h-36
              rounded-[32px]
              bg-white/15
              backdrop-blur-xl
              border border-white/30
              shadow-2xl
              flex flex-col
              items-center
              justify-center
              hover:bg-white/25
              transition
              cursor-pointer
            "
          >
            <div className="text-5xl mb-3">{icon}</div>
            <div className="text-base font-semibold tracking-wide text-white/90">
              {label}
            </div>
          </button>
        ))}
      </div>

    </main>
  );
}
