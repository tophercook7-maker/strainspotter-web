"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const BUTTONS = [
  { label: "Strains", icon: "🌿", path: "/garden/strains" },
  { label: "Scanner", icon: "📷", path: "/garden/scanner" },
  { label: "History", icon: "📜", path: "/garden/history" },
  { label: "Grow Coach", icon: "🌱", path: "/garden/grow-coach" },
  { label: "Dispensaries", icon: "🏪", path: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌰", path: "/garden/seed-vendors" },
  { label: "Effects", icon: "✨", path: "/garden/effects" },
  { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
  { label: "Settings", icon: "⚙️", path: "/garden/settings" },
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

      {/* DARK OVERLAY FOR READABILITY */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        {/* TITLE */}
        <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">
          The Garden
        </h1>
        <p className="text-white/80 mb-14 text-center max-w-xl">
          Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
        </p>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 gap-14">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              onClick={() => router.push(b.path)}
              className="
                w-40 h-40
                rounded-3xl
                bg-white/15
                backdrop-blur-xl
                border border-white/25
                shadow-2xl
                flex flex-col items-center justify-center
                text-white
                hover:bg-white/25
                hover:scale-105
                transition-all
              "
            >
              <div className="text-5xl mb-3">{b.icon}</div>
              <span className="text-lg font-semibold tracking-wide">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
