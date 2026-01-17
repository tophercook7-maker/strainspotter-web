"use client";

import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const gardenItems = [
  { title: "Scanner", href: "/garden/scanner", icon: "📷" },
  { title: "Dispensaries", href: "/garden/dispensaries", icon: "🏪" },
  { title: "Strains", href: "/garden/strains", icon: "🌿" },
  { title: "Seed Vendors", href: "/garden/seed-vendors", icon: "🌱" },
  { title: "Grow Coach", href: "/garden/grow-coach", icon: "🧠" },
  { title: "History", href: "/garden/history", icon: "🕒" },
  { title: "Favorites", href: "/garden/favorites", icon: "⭐" },
  { title: "Ecosystem", href: "/garden/ecosystem", icon: "🌍" },
  { title: "Settings", href: "/garden/settings", icon: "⚙️" },
];

export default function GardenPage() {
  const router = useRouter();
  return (
    <section className="relative w-full flex items-center justify-center text-white">
      
      {/* ATMOSPHERIC BACKGROUND IS HANDLED BY garden/layout.tsx */}

      {/* GARDEN SURFACE */}
      <div className="relative z-10 w-full max-w-5xl px-8 py-16">
        
        {/* TITLE */}
        <div className="pt-12 pb-6 flex flex-col items-center">
          <img
            src="/hero.png"
            alt="StrainSpotter"
            className="w-20 h-20 object-contain mb-4"
            draggable={false}
          />
          <h1 className="text-4xl font-bold tracking-wide text-green-400">
            StrainSpotter
          </h1>
        </div>

        {/* ICON GRID — APPLE STYLE */}
        <div className="mt-16 grid grid-cols-3 gap-x-24 gap-y-20 place-items-center">
          {gardenItems.map((item) => (
            <GardenIcon
              key={item.title}
              label={item.title}
              icon={item.icon}
              onClick={() => router.push(item.href)}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
