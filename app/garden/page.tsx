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
      className="min-h-screen w-full text-white"
      style={{
        backgroundImage: "url(/strainspotter-bg.jpeg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* optional: light readability veil (keeps background visible) */}
      <div className="min-h-screen w-full bg-black/10">
        <div className="w-full min-h-screen flex flex-col items-center justify-start px-6 py-10">
          {/* HERO */}
          <div className="flex flex-col items-center">
            <Image
              src="/hero.png"
              alt="StrainSpotter hero"
              width={190}
              height={190}
              priority
              className="select-none"
            />
            <h1 className="mt-8 text-7xl md:text-8xl font-extrabold tracking-tight text-green-400 drop-shadow-xl">
              StrainSpotter AI
            </h1>
          </div>

          {/* GRID */}
          <div className="mt-20 grid grid-cols-3 gap-x-28 gap-y-24">
            {ROUTES.map((r) => (
              <GardenIcon key={r.route} label={r.label} icon={r.icon} route={r.route} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
