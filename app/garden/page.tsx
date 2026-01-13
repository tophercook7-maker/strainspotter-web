"use client";

import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

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
    <main className="min-h-screen w-full flex flex-col items-center justify-start pt-10">
      {/* HERO */}
      <div className="flex flex-col items-center mt-8 mb-6">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-20 h-20 object-contain"
        />
        <h1 className="mt-4 text-5xl font-bold tracking-tight">
          StrainSpotter
        </h1>
      </div>

      {/* ICON GRID */}
      <div className="mt-10 grid grid-cols-3 gap-x-16 gap-y-12 place-items-center">
        {ICONS.map(({ label, icon, route }) => (
          <GardenIcon
            key={label}
            label={label}
            icon={icon}
            onClick={() => router.push(route)}
          />
        ))}
      </div>
    </main>
  );
}
