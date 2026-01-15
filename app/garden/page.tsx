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
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover -z-10"
      />

      {/* HERO */}
      <div className="flex justify-center pt-10 pb-4">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-20 h-20 object-contain"
          draggable={false}
        />
      </div>
      <h1 className="text-4xl font-semibold tracking-tight text-green-400 text-center mb-10">
        StrainSpotter
      </h1>

      {/* ICON GRID */}
      <div className="w-full flex justify-center">
        <div className="grid grid-cols-3 gap-x-14 gap-y-12">
          {ROUTES.map((r) => (
            <GardenIcon
              key={r.label}
              icon={r.icon}
              label={r.label}
              onClick={() => router.push(r.route)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
