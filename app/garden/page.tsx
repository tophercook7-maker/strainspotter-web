"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

const ICONS = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📸", route: "/garden/scanner" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "History", icon: "🗂", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white">
      
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center pt-24 pb-20">
        
        {/* HERO */}
        <div className="mb-14 flex flex-col items-center">
          <Image
            src="/brand/hero.png"
            alt="Hero"
            width={140}
            height={140}
            className="rounded-full mb-4"
          />
          <h1 className="text-4xl font-extrabold tracking-wide">
            The Garden
          </h1>
        </div>

        {/* ICON GRID — IPAD STYLE */}
        <div className="
          grid
          grid-cols-3
          gap-x-24
          gap-y-20
        ">
          {ICONS.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.route)}
              className="
                flex flex-col items-center justify-center
                w-36 h-36
                rounded-3xl
                bg-white/20
                backdrop-blur-xl
                border border-white/30
                shadow-2xl
                hover:bg-white/30
                transition
                focus:outline-none
              "
            >
              <div className="text-5xl mb-3">{item.icon}</div>
              <div className="text-base font-semibold tracking-wide">
                {item.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
