"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ICONS = [
  { label: "Strains", route: "/garden/strains", icon: "🌿" },
  { label: "Scanner", route: "/garden/scanner", icon: "📷" },
  { label: "Dispensaries", route: "/garden/dispensaries", icon: "🏪" },
  { label: "Seed Vendors", route: "/garden/seed-vendors", icon: "🌱" },
  { label: "Grow Coach", route: "/garden/grow-coach", icon: "🧑‍🌾" },
  { label: "History", route: "/garden/history", icon: "📜" },
  { label: "Favorites", route: "/garden/favorites", icon: "⭐" },
  { label: "Ecosystem", route: "/garden/ecosystem", icon: "🧬" },
  { label: "Settings", route: "/garden/settings", icon: "⚙️" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen w-full bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/strainspotter-bg.jpeg')" }}
    >
      {/* CENTERED APPLE-STYLE SPINE */}
      <section className="flex flex-col items-center w-full max-w-3xl px-6">
        {/* HERO */}
        <div className="mb-6">
          <Image
            src="/hero.png"
            alt="StrainSpotter Leaf"
            width={140}
            height={140}
            priority
          />
        </div>

        {/* TITLE */}
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-12">
          StrainSpotter AI
        </h1>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 gap-x-14 gap-y-14">
          {ICONS.map((item) => (
            <GardenIcon
              key={item.label}
              label={item.label}
              icon={item.icon}
              onClick={() => router.push(item.route)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
