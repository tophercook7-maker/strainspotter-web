"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", path: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", path: "/garden/strains" },
  { label: "Scanner", icon: "📷", path: "/garden/scanner" },
  { label: "Grow Coach", icon: "🧠", path: "/garden/grow-coach" },
  { label: "History", icon: "📜", path: "/garden/history" },
  { label: "Seed Vendors", icon: "🌱", path: "/garden/seed-vendors" },
  { label: "Favorites", icon: "⭐️", path: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", path: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", path: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen w-full text-white"
      style={{
        backgroundImage: "url('/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-10">
        {/* HERO (unchanged visual intent: image only) */}
        <div className="mb-5 flex justify-center">
          <Image
            src="/hero.png"
            alt="StrainSpotter"
            width={88}
            height={88}
            priority
            draggable={false}
            className="h-[88px] w-[88px] object-contain"
          />
        </div>

        {/* TITLE */}
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-green-400 drop-shadow-[0_3px_18px_rgba(0,0,0,0.55)]">
          StrainSpotter
        </h1>

        {/* GRID (iPad spacing) */}
        <div className="mt-10 grid grid-cols-3 gap-x-16 gap-y-14 md:gap-x-20 md:gap-y-16">
          {ROUTES.map((r) => (
            <GardenIcon
              key={r.path}
              label={r.label}
              icon={r.icon}
              onClick={() => router.push(r.path)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
