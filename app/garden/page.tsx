"use client";

import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ICONS = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", route: "/garden/grow-coach" },
  { label: "History", icon: "📜", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌐", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full bg-black text-white overflow-y-auto">
      {/* BACKGROUND IMAGE (LOCKED) */}
      <div
        className="fixed inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: "url(/brand/core/hero.png)" }}
      />
      {/* DARK OVERLAY (LOCKED) */}
      <div className="fixed inset-0 -z-10 bg-black/35" />

      {/* CONTENT (NORMAL FLOW — NO FLOATING / NO BOTTOM STICKING) */}
      <div className="w-full flex flex-col items-center px-8 pb-24">
        {/* SMALL HERO TOP */}
        <div className="pt-10 flex flex-col items-center">
          <img
            src="/brand/core/hero.png"
            alt="StrainSpotter"
            className="w-20 h-20 object-contain"
            draggable={false}
          />
          <h1 className="mt-4 text-6xl font-extrabold tracking-tight drop-shadow">
            StrainSpotter
          </h1>
          <p className="mt-2 text-white/70 text-center max-w-2xl">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        {/* ICON GRID — PERFECT ROWS + EVEN SPACING */}
        <div className="w-full max-w-5xl mt-12">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-x-14 gap-y-12 justify-items-center">
            {ICONS.map((item) => (
              <GardenIcon
                key={item.route}
                label={item.label}
                icon={item.icon}
                onClick={() => router.push(item.route)}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
