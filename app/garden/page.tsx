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
      <div className="mt-10 mb-6">
        <Image
          src="/hero.png"
          alt="StrainSpotter"
          width={72}
          height={72}
          priority
        />
      </div>

      {/* TITLE */}
      <h1 className="text-6xl font-extrabold tracking-tight mb-20">
        StrainSpotter
      </h1>

      {/* ICON GRID */}
      <div className="grid grid-cols-3 gap-x-40 gap-y-28">
        {ICONS.map(({ label, icon, route }) => (
          <button
            key={label}
            onClick={() => router.push(route)}
            className="
              w-36 h-36
              rounded-[32px]
              bg-white/20
              backdrop-blur-xl
              border border-white/30
              shadow-2xl
              flex flex-col items-center justify-center
              hover:bg-white/30
              transition
            "
          >
            <div className="text-5xl mb-3">{icon}</div>
            <div className="text-base font-semibold">{label}</div>
          </button>
        ))}
      </div>

    </main>
  );
}
