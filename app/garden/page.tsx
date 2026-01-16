"use client";

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
      className="
        min-h-screen w-full
        flex items-center justify-center
        bg-cover bg-center
      "
      style={{ backgroundImage: "url(/strainspotter-bg.jpeg)" }}
    >
      <section
        className="
          flex flex-col items-center
          justify-center
          gap-10
          w-full
          max-w-5xl
          px-6
          text-center
        "
      >
        {/* HERO */}
        <img
          src="/hero.png"
          alt="StrainSpotter leaf"
          className="w-32 h-32 md:w-40 md:h-40 drop-shadow-xl"
        />

        {/* TITLE */}
        <h1 className="text-3xl md:text-4xl font-semibold tracking-wide text-white">
          StrainSpotter AI
        </h1>

        {/* GRID */}
        <div
          className="
            grid grid-cols-3
            gap-x-16 gap-y-14
            mt-6
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
        </div>
      </section>
    </main>
  );
}
