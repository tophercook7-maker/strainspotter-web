"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📸", route: "/garden/scanner" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "History", icon: "🕓", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧩", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
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
      <div className="relative z-10 flex flex-col items-center px-6 pb-24">
        {/* HERO */}
        <div className="mt-10 mb-3 flex justify-center">
          <img
            src="/hero.png"
            alt="StrainSpotter"
            className="w-14 h-14 object-contain"
            draggable={false}
          />
        </div>

        {/* TITLE */}
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-green-400 mb-14">
          StrainSpotter
        </h1>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-x-14 gap-y-16 place-items-center">
          {ROUTES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.route)}
              className="
                w-32 h-32
                rounded-[28px]
                flex flex-col items-center justify-center
                bg-white/20
                backdrop-blur-2xl
                border border-white/30
                shadow-[0_20px_40px_rgba(0,0,0,0.35)]
                hover:bg-white/30
                hover:scale-[1.03]
                transition-all duration-200
                active:scale-[0.97]
              "
            >
              <div className="text-4xl mb-3">{item.icon}</div>
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
