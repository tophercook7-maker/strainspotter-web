"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "History", icon: "📜", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen w-full flex flex-col items-center"
      style={{
        backgroundImage: "url('/strainspotter-bg.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* HERO */}
      <div className="pt-16 pb-6 flex justify-center">
        <Image
          src="/hero.png"
          alt="StrainSpotter"
          width={120}
          height={120}
          priority
          draggable={false}
        />
      </div>

      {/* TITLE */}
      <h1 className="text-3xl font-semibold text-green-400 mb-12">
        StrainSpotter
      </h1>

      {/* GRID */}
      <div className="grid grid-cols-3 gap-x-24 gap-y-20 justify-items-center pb-24">
        {ROUTES.map((item) => (
          <GardenIcon
            key={item.route}
            label={item.label}
            icon={item.icon}
            route={item.route}
          />
        ))}
      </div>
    </main>
  );
}
