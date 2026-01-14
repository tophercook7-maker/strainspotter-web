"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Strains", icon: "🌱", path: "/garden/strains" },
  { label: "Scanner", icon: "📸", path: "/garden/scanner" },
  { label: "Dispensaries", icon: "🏪", path: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌰", path: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", path: "/garden/grow-coach" },
  { label: "History", icon: "🕒", path: "/garden/history" },
  { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧩", path: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", path: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center pt-10 pb-16">
        {/* HERO */}
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-14 h-14 object-contain mb-3"
          draggable={false}
        />

        {/* TITLE */}
        <h1 className="text-4xl font-extrabold tracking-wide text-green-400 mb-12">
          STRAINSPOTTER
        </h1>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 gap-x-16 gap-y-14">
          {ROUTES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.path)}
              className="
                flex flex-col items-center justify-center
                w-36 h-36
                rounded-[28px]
                bg-white/20
                backdrop-blur-xl
                border border-white/30
                shadow-[0_20px_40px_rgba(0,0,0,0.35)]
                hover:bg-white/30
                transition
                active:scale-95
              "
            >
              <div className="text-5xl mb-3">{item.icon}</div>
              <div className="text-sm font-semibold tracking-wide text-white/90">
                {item.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
