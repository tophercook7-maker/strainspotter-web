"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", route: "/garden/grow-coach" },
  { label: "History", icon: "📜", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white">
      {/* BACKGROUND IMAGE */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center pt-10">
        {/* HERO */}
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-14 h-14 object-contain mb-3"
          draggable={false}
        />

        {/* TITLE */}
        <h1 className="text-4xl font-extrabold tracking-wide text-green-400 mb-12">
          StrainSpotter
        </h1>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 gap-x-20 gap-y-20 px-20">
          {ROUTES.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.route)}
              className="
                w-40 h-40
                rounded-[32px]
                bg-white/25
                backdrop-blur-xl
                border border-white/40
                shadow-[0_20px_40px_rgba(0,0,0,0.35)]
                flex flex-col items-center justify-center
                transition
                hover:bg-white/35
                active:scale-95
              "
            >
              <span className="text-5xl mb-4">{item.icon}</span>
              <span className="text-sm font-semibold tracking-wide text-white">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
