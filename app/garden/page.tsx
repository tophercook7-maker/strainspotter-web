"use client";

import { GardenIcon } from "./_components/GardenIcon";

const gardenItems = [
  { key: "scanner", label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { key: "dispensaries", label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { key: "strains", label: "Strains", icon: "🌿", route: "/garden/strains" },
  { key: "seed-vendors", label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { key: "grow-coach", label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { key: "history", label: "History", icon: "🕒", route: "/garden/history" },
  { key: "favorites", label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { key: "ecosystem", label: "Ecosystem", icon: "🌍", route: "/garden/ecosystem" },
  { key: "settings", label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  return (
    <div className="flex flex-col items-center">
      {/* HERO */}
      <div className="mt-10 mb-6 flex justify-center">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-[88px] h-[88px] object-contain select-none"
          draggable={false}
        />
      </div>

      {/* TITLE */}
      <h1 className="text-4xl font-semibold tracking-wide text-green-400">
        StrainSpotter AI
      </h1>

      {/* GARDEN ICON FIELD */}
      <div
        className="
          mt-10
          w-full
          max-w-6xl
          mx-auto
          grid
          grid-cols-2
          sm:grid-cols-3
          md:grid-cols-4
          lg:grid-cols-5
          gap-x-10
          gap-y-10
          place-items-center
        "
      >
        {gardenItems.map((item) => (
          <GardenIcon
            key={item.key}
            label={item.label}
            icon={item.icon}
            href={item.route}
          />
        ))}
      </div>
    </div>
  );
}
