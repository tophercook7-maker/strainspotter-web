"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Strains", icon: "🌿", path: "/garden/strains" },
  { label: "Scanner", icon: "📷", path: "/garden/scanner" },
  { label: "Dispensaries", icon: "🏪", path: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", path: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", path: "/garden/grow-coach" },
  { label: "History", icon: "📜", path: "/garden/history" },
  { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", path: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", path: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* BACKGROUND */}
      <Image
        src="/background.jpg"
        alt="Background"
        fill
        priority
        className="object-cover"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">

        {/* HERO */}
        <div className="mb-6">
          <Image
            src="/hero.png"
            alt="StrainSpotter"
            width={110}
            height={110}
            draggable={false}
            className="object-contain"
          />
        </div>

        {/* TITLE */}
        <h1
          className="
            mb-16
            text-5xl
            font-extrabold
            tracking-tight
            text-green-400
            select-none
          "
        >
          StrainSpotter
        </h1>

        {/* GRID */}
        <div className="grid grid-cols-3 gap-x-24 gap-y-20">
          {ROUTES.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className="
                h-36 w-36
                rounded-[28px]
                bg-white/90
                backdrop-blur-xl
                shadow-[0_20px_45px_rgba(0,0,0,0.35)]
                flex flex-col items-center justify-center
                transition-all
                hover:scale-105 hover:shadow-[0_26px_60px_rgba(0,0,0,0.45)]
                active:scale-95
                focus:outline-none
              "
            >
              <span className="text-4xl leading-none">{item.icon}</span>
              <span className="mt-4 text-sm font-semibold text-black text-center">
                {item.label}
              </span>
            </button>
          ))}
        </div>

      </div>
    </main>
  );
}
