"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📸", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧑‍🌾", route: "/garden/grow-coach" },
  { label: "History", icon: "🕘", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      {/* BACKGROUND IMAGE */}
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
        <div className="mb-3">
          <Image
            src="/hero.png"
            alt="StrainSpotter"
            width={64}
            height={64}
            className="object-contain"
            draggable={false}
          />
        </div>

        {/* TITLE */}
        <h1 className="text-4xl font-extrabold tracking-wide text-green-400 mb-12">
          StrainSpotter
        </h1>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 gap-x-16 gap-y-16">
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
                backdrop-blur-xl
                border border-white/30
                shadow-[0_20px_40px_rgba(0,0,0,0.35)]
                hover:bg-white/30
                transition
                cursor-pointer
              "
            >
              <div className="text-4xl mb-2">{item.icon}</div>
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
