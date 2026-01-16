"use client";

import Image from "next/image";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "History", icon: "📜", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  return (
    <main
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-between py-16"
      style={{ backgroundImage: "url('/strainspotter-bg.jpeg')" }}
    >
      {/* HERO */}
      <div className="flex justify-center">
        <Image
          src="/hero.png"
          alt="StrainSpotter hero"
          width={190}
          height={190}
          priority
          className="select-none"
        />
      </div>

      {/* TITLE */}
      <div className="flex flex-col items-center mt-6">
        <h1 className="text-7xl md:text-8xl font-extrabold tracking-tight text-green-400 drop-shadow-xl">
          StrainSpotter AI
        </h1>
      </div>

      {/* GRID */}
      <div className="w-full max-w-5xl flex justify-center">
        <div className="grid grid-cols-3 gap-x-28 gap-y-24">
          {ROUTES.map((r) => (
            <GardenIcon key={r.route} label={r.label} icon={r.icon} route={r.route} />
          ))}
        </div>
      </div>
    </main>
  );
}
