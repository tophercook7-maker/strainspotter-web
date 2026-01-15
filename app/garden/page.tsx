"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "History", icon: "📜", route: "/garden/history" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen w-full text-white flex flex-col items-center"
      style={{
        backgroundImage: "url(/garden-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* HERO */}
      <div className="mt-10 mb-6 flex justify-center">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-28 h-28 object-contain select-none"
          draggable={false}
        />
      </div>

      <h1 className="mb-12 text-center text-4xl font-bold text-green-400">
        StrainSpotter
      </h1>

      {/* IPAD GRID */}
      <div className="grid grid-cols-3 gap-x-24 gap-y-20">
        {ROUTES.map((item) => (
          <GardenIcon
            key={item.label}
            icon={item.icon}
            label={item.label}
            onClick={() => router.push(item.route)}
          />
        ))}
      </div>
    </main>
  );
}
