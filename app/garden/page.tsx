"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
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
    <main className="min-h-screen w-full text-white relative overflow-hidden">
      {/* BACKGROUND (do not remove if you already have it working) */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover -z-10"
      />

      {/* HERO */}
      <div className="flex flex-col items-center pt-10">
        <Image
          src="/hero.png"
          alt="StrainSpotter"
          width={64}
          height={64}
          priority
          draggable={false}
          className="select-none"
        />

        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-green-400">
          StrainSpotter
        </h1>
      </div>

      {/* ICON GRID */}
      <div className="mt-16 grid grid-cols-3 gap-16 place-items-center px-8 pb-16">
        {ROUTES.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => router.push(item.route)}
            className="
              flex flex-col items-center justify-center
              w-40 h-40
              rounded-[32px]
              bg-white/20
              backdrop-blur-xl
              border border-white/30
              shadow-2xl
              hover:bg-white/30
              active:scale-[0.98]
              transition
              cursor-pointer
              select-none
            "
          >
            <div className="text-6xl mb-3">{item.icon}</div>
            <div className="text-sm font-semibold tracking-wide text-white/90">
              {item.label}
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
