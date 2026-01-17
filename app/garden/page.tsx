"use client";

import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = [
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "History", icon: "🕒", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌍", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

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

      {/* ICON GRID */}
      <div className="mt-20 grid grid-cols-3 gap-x-24 gap-y-20 place-items-center">
        {ROUTES.map((item) => (
          <GardenIcon
            key={item.label}
            label={item.label}
            icon={item.icon}
            onClick={() => router.push(item.route)}
          />
        ))}
      </div>
    </div>
  );
}
