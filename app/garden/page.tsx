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
      <div className="pt-10 flex flex-col items-center">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-14 h-14 object-contain"
          draggable={false}
        />
        <h1 className="mt-3 text-4xl font-bold tracking-wide text-green-400">
          StrainSpotter
        </h1>
      </div>

      {/* ICON GRID */}
      <div className="mt-16 grid grid-cols-3 gap-x-24 gap-y-20 place-items-center">
        {ROUTES.map((r) => (
          <GardenIcon
            key={r.label}
            icon={r.icon}
            label={r.label}
            onClick={() => router.push(r.route)}
          />
        ))}
      </div>
    </main>
  );
}
