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
      <div className="flex flex-col items-center pt-10">
        {/* HERO */}
        <Image
          src="/hero.png"
          alt="StrainSpotter"
          width={96}
          height={96}
          draggable={false}
          priority
        />

        {/* TITLE */}
        <h1 className="mt-4 text-4xl font-extrabold tracking-wide text-green-400">
          StrainSpotter
        </h1>

        {/* ICON GRID */}
        <div className="mt-14 grid grid-cols-3 gap-x-24 gap-y-20 place-items-center">
          {ROUTES.map((item) => (
            <GardenIcon
              key={item.label}
              icon={item.icon}
              label={item.label}
              onClick={() => router.push(item.path)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
