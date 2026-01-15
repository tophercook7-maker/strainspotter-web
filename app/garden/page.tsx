"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import GardenShell from "./_components/GardenShell";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📸", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", route: "/garden/grow-coach" },
  { label: "History", icon: "📜", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <GardenShell>
      {/* HERO */}
      <div className="mt-10 mb-2 flex justify-center">
        <Image
          src="/hero.png"
          alt="StrainSpotter"
          width={56}
          height={56}
          priority
          draggable={false}
        />
      </div>

      {/* TITLE */}
      <h1 className="text-4xl font-extrabold tracking-wide text-green-400 mb-10">
        StrainSpotter
      </h1>

      {/* ICON GRID */}
      <div className="grid grid-cols-3 gap-x-24 gap-y-20 pb-20">
        {ROUTES.map((item) => (
          <GardenIcon
            key={item.route}
            icon={item.icon}
            label={item.label}
            onClick={() => router.push(item.route)}
          />
        ))}
      </div>
    </GardenShell>
  );
}
