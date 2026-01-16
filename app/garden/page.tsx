"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = [
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "History", icon: "🕒", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌍", route: "/garden/ecosystem" },
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
      <div className="flex flex-col items-center pt-10">
        {/* HERO */}
        <Image
          src="/hero.png"
          alt="StrainSpotter"
          width={96}
          height={96}
          priority
          draggable={false}
        />

        {/* TITLE */}
        <h1 className="mt-4 text-4xl font-semibold tracking-wide text-green-400">
          StrainSpotter AI
        </h1>
      </div>

      {/* ICON GRID */}
      <div className="mt-16 grid grid-cols-3 gap-x-24 gap-y-20 place-items-center">
        {ROUTES.map((item) => (
          <GardenIcon
            key={item.label}
            label={item.label}
            icon={item.icon}
            onClick={() => router.push(item.route)}
          />
        ))}
      </div>
    </main>
  );
}
