"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", path: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", path: "/garden/strains" },
  { label: "Scanner", icon: "📷", path: "/garden/scanner" },
  { label: "Seed Vendors", icon: "🌱", path: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", path: "/garden/grow-coach" },
  { label: "History", icon: "🕓", path: "/garden/history" },
  { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", path: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", path: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen w-full text-white"
      style={{
        backgroundImage: "url(/strainspotter-bg.jpeg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* HERO */}
      <div className="mt-10 mb-4 flex justify-center">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-20 h-20 object-contain"
          draggable={false}
        />
      </div>

      {/* TITLE */}
      <h1 className="mt-4 text-4xl font-extrabold tracking-wide text-green-400">
        StrainSpotter
      </h1>

      {/* ICON GRID */}
      <div className="mt-16 grid grid-cols-3 gap-x-24 gap-y-20">
        {ROUTES.map((item) => (
          <GardenIcon
            key={item.label}
            icon={item.icon}
            label={item.label}
            onClick={() => router.push(item.path)}
          />
        ))}
      </div>
    </main>
  );
}
