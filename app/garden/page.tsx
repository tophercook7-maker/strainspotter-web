"use client";

import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = {
  strains: { path: "/strains", label: "Strains", icon: "🌿" },
  scanner: { path: "/scanner", label: "Scanner", icon: "📸" },
  dispensaries: { path: "/garden/dispensaries", label: "Dispensaries", icon: "📍" },
  seedVendors: { path: "/seed-vendors", label: "Seed Vendors", icon: "🌱" },
  growCoach: { path: "/grow-coach", label: "Grow Coach", icon: "🧑‍🌾" },
  history: { path: "/history", label: "History", icon: "🕘" },
  favorites: { path: "/favorites", label: "Favorites", icon: "⭐" },
  ecosystem: { path: "/ecosystem", label: "Ecosystem", icon: "🌐" },
  settings: { path: "/settings", label: "Settings", icon: "⚙️" },
} as const;

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen flex flex-col items-center text-white"
      style={{
        backgroundImage: "url(/garden-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* HERO ICON */}
      <div className="mt-8 mb-3 flex justify-center">
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-24 h-24 object-contain"
          draggable={false}
        />
      </div>

      <h1 className="mt-2 mb-8 text-center text-5xl font-extrabold tracking-tight text-white drop-shadow-lg">
        StrainSpotter
      </h1>

      {/* APP GRID — IPAD STYLE */}
      <div className="mt-10 grid grid-cols-3 gap-x-16 gap-y-14 place-items-center">
        {Object.entries(ROUTES).map(([key, route]) => (
          <GardenIcon
            key={key}
            label={route.label}
            icon={route.icon}
            onClick={() => router.push(route.path)}
          />
        ))}
      </div>

    </main>
  );
}
