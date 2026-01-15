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
      <div className="flex flex-col items-center mt-16 mb-10">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-32 h-32 object-contain"
          draggable={false}
        />
        <h1 className="mt-6 text-4xl font-extrabold text-green-400 tracking-tight">
          StrainSpotter
        </h1>
      </div>

      {/* IPAD GRID */}
      <div className="mt-14 grid grid-cols-3 gap-x-20 gap-y-16">
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
