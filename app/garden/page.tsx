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
      className="relative min-h-screen w-full text-white bg-cover bg-center flex flex-col items-center justify-between py-16"
      style={{ backgroundImage: "url('/strainspotter-bg.jpeg')" }}
    >
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      {/* HERO */}
      <div className="relative flex justify-center">
        <div className="absolute inset-0 rounded-full blur-3xl bg-green-500/30" />
        <Image
          src="/hero.png"
          alt="StrainSpotter leaf"
          width={160}
          height={160}
          className="relative drop-shadow-2xl animate-[float_6s_ease-in-out_infinite]"
        />
      </div>

      {/* TITLE */}
      <div className="flex flex-col items-center mt-6">
        <h1
          className="
            text-7xl md:text-8xl
            font-extrabold
            tracking-tight
            bg-gradient-to-b from-white via-green-200 to-green-400
            bg-clip-text text-transparent
            drop-shadow-[0_6px_20px_rgba(0,0,0,0.6)]
          "
        >
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
