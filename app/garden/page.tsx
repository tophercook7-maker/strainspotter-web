"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

type Btn = { label: string; icon: string; route: keyof typeof ROUTES };

const ROUTES = {
  strains: "/garden/strains",
  scanner: "/garden/scanner",
  dispensaries: "/garden/dispensaries",
  seedVendors: "/garden/seed-vendors",
  growCoach: "/garden/grow-coach",
  history: "/garden/history",
  favorites: "/garden/favorites",
  ecosystem: "/garden/ecosystem",
  settings: "/garden/settings",
};

export default function GardenPage() {
  const router = useRouter();

  const BUTTONS: Btn[] = [
    { label: "Strain Browser", icon: "🍃", route: "strains" },
    { label: "Scanner", icon: "📷", route: "scanner" },
    { label: "Dispensaries", icon: "📍", route: "dispensaries" },
    { label: "Seed Vendors", icon: "🌱", route: "seedVendors" },
    { label: "Grow Coach", icon: "🪴", route: "growCoach" },
    { label: "History", icon: "📜", route: "history" },
    { label: "Favorites", icon: "⭐", route: "favorites" },
    { label: "Ecosystem", icon: "🌍", route: "ecosystem" },
    { label: "Settings", icon: "⚙️", route: "settings" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/35" />

      {/* CONTENT */}
      <div className="relative z-10 min-h-screen w-full px-10 py-10">
        {/* HERO */}
        <div className="flex flex-col items-center">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/30 bg-black/40 shadow-2xl backdrop-blur-xl">
            <Image
              src="/brand/core/hero.png"
              alt="Hero"
              fill
              priority
              className="object-cover"
            />
          </div>

          <h1 className="mt-5 text-6xl font-extrabold tracking-tight drop-shadow-[0_6px_18px_rgba(0,0,0,0.7)]">
            The Garden
          </h1>

          <p className="mt-2 max-w-2xl text-center text-lg text-white/85 drop-shadow">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        <div
          className="
    mt-16
    grid
    grid-cols-3
    gap-14
    place-items-center
  "
        >
          {BUTTONS.map((item) => (
            <GardenIcon
              key={item.label}
              label={item.label}
              icon={item.icon}
              onClick={() => router.push(ROUTES[item.route])}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
