"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ICONS = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", route: "/garden/dispensaries" },

  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", route: "/garden/grow-coach" },
  { label: "History", icon: "🕘", route: "/garden/history" },

  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌐", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-start pt-10">
      {/* HERO (small, top) */}
      <div className="mb-5">
        <Image
          src="/hero.png"
          alt="StrainSpotter"
          width={64}
          height={64}
          priority
          className="opacity-95"
        />
      </div>

      {/* TITLE (big) */}
      <h1 className="text-6xl font-extrabold tracking-tight mb-16">
        StrainSpotter
      </h1>

      {/* ICON GRID (perfect rows, fixed spacing) */}
      <section
        className="
          grid grid-cols-3
          gap-x-24 gap-y-16
          place-items-center
        "
      >
        {ICONS.map((item) => (
          <GardenIcon
            key={item.label}
            label={item.label}
            icon={item.icon}
            onClick={() => router.push(item.route)}
          />
        ))}
      </section>
    </main>
  );
}
