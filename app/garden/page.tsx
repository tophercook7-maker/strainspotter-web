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
      <div className="pt-10 pb-6 flex flex-col items-center">
        <Image
          src="/hero-leaf.png"
          alt="StrainSpotter"
          width={120}
          height={120}
          priority
        />
        <h1 className="mt-4 text-4xl font-extrabold text-green-400">
          StrainSpotter
        </h1>
      </div>

      {/* IPAD GRID */}
      <div className="mt-10 grid grid-cols-3 gap-x-14 gap-y-12">
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
