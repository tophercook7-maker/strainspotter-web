"use client";

import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = [
  { label: "Strains", icon: "🌿", path: "/garden/strains" },
  { label: "Scanner", icon: "📷", path: "/garden/scanner" },
  { label: "Dispensaries", icon: "🏪", path: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", path: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", path: "/garden/grow-coach" },
  { label: "History", icon: "📜", path: "/garden/history" },
  { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", path: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", path: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen w-full text-white flex flex-col items-center"
      style={{
        backgroundImage: "url('/strainspotter-bg.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* TITLE ONLY — NO HERO */}
      <h1 className="mt-16 mb-12 text-4xl font-extrabold tracking-tight text-green-400">
        StrainSpotter
      </h1>

      {/* IPAD-STYLE GRID */}
      <div className="grid grid-cols-3 gap-x-24 gap-y-20 pb-24">
        {ROUTES.map((route) => (
          <GardenIcon
            key={route.path}
            label={route.label}
            icon={route.icon}
            onClick={() => router.push(route.path)}
          />
        ))}
      </div>
    </main>
  );
}
