"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📸", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", route: "/garden/grow-coach" },
  { label: "History", icon: "🕓", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
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
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* HERO + TITLE */}
      <div className="flex flex-col items-center pt-10">
        <Image
          src="/hero.png"
          alt="StrainSpotter"
          width={110}
          height={110}
          priority
          draggable={false}
        />

        <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-wide text-green-400">
          StrainSpotter AI
        </h1>
      </div>

      {/* ICON GRID */}
      <div className="mt-16 flex justify-center">
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
      </div>
    </main>
  );
}
