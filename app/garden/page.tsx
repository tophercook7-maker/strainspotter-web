"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "History", icon: "📜", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🕸️", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full text-white">
      {/* HERO */}
      <div className="flex flex-col items-center pt-10">
        <Image
          src="/hero.png"
          alt="StrainSpotter"
          width={48}
          height={48}
          priority
        />

        <h1 className="mt-4 text-4xl font-extrabold tracking-wide text-green-400">
          StrainSpotter
        </h1>
      </div>

      {/* ICON GRID */}
      <div className="mt-12 grid grid-cols-3 gap-16 place-items-center px-10">
        {ROUTES.map((item) => (
          <button
            key={item.route}
            type="button"
            onClick={() => router.push(item.route)}
            className="
              w-36 h-36
              rounded-[28px]
              bg-white/20
              backdrop-blur-xl
              border border-white/30
              shadow-2xl
              flex flex-col items-center justify-center
              text-white
              hover:bg-white/30
              transition
            "
          >
            <div className="text-5xl mb-2">{item.icon}</div>
            <div className="text-sm font-semibold tracking-wide">
              {item.label}
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
