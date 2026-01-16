"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = [
  { key: "strains", label: "Strains", icon: "🌿", route: "/garden/strains" },
  {
    key: "scanner",
    label: "Scanner",
    icon: "📸",
    route: "/garden/scanner",
  },
  {
    key: "dispensaries",
    label: "Dispensaries",
    icon: "🏪",
    route: "/garden/dispensaries",
  },
  {
    key: "seed-vendors",
    label: "Seed Vendors",
    icon: "🌱",
    route: "/garden/seed-vendors",
  },
  {
    key: "grow-coach",
    label: "Grow Coach",
    icon: "🍄",
    route: "/garden/grow-coach",
  },
  { key: "history", label: "History", icon: "📜", route: "/garden/history" },
  { key: "favorites", label: "Favorites", icon: "⭐️", route: "/garden/favorites" },
  {
    key: "ecosystem",
    label: "Ecosystem",
    icon: "🧬",
    route: "/garden/ecosystem",
  },
  { key: "settings", label: "Settings", icon: "⚙️", route: "/garden/settings" },
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
      {/* BACKDROP OVERLAY */}
      <div className="min-h-screen w-full bg-black/30">
        {/* LAUNCHER ZONE (SPINE) */}
        <section className="min-h-screen w-full flex items-center justify-center px-6">
          <div className="w-full max-w-[720px] flex flex-col items-center">
            {/* HERO */}
            <div className="flex items-center justify-center pt-10">
              <Image
                src="/hero.png"
                alt="StrainSpotter Hero"
                width={150}
                height={150}
                priority
                className="select-none drop-shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
              />
            </div>

            {/* TITLE */}
            <h1 className="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_10px_22px_rgba(0,0,0,0.65)]">
              StrainSpotter AI
            </h1>

            {/* GRID */}
            <div className="mt-10 grid grid-cols-3 gap-x-12 gap-y-10">
              {ROUTES.map((item) => (
                <GardenIcon
                  key={item.key}
                  label={item.label}
                  icon={item.icon}
                  onClick={() => router.push(item.route)}
                />
              ))}
            </div>

            {/* BOTTOM AIR */}
            <div className="h-16" />
          </div>
        </section>
      </div>
    </main>
  );
}
