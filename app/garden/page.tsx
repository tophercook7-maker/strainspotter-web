"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const BUTTONS = [
  { label: "Strain Browser", icon: "🌿", href: "/strains" },
  { label: "Scanner", icon: "📷", href: "/scanner" },
  { label: "History", icon: "📜", href: "/history" },
  { label: "Grow Coach", icon: "🌱", href: "/grow" },
  { label: "Dispensaries", icon: "🏪", href: "/dispensaries" },
  { label: "Seed Vendors", icon: "🌰", href: "/seed-vendors" },
  { label: "Favorites", icon: "⭐", href: "/favorites" },
  { label: "Learn", icon: "📘", href: "/learn" },
  { label: "Settings", icon: "⚙️", href: "/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full overflow-y-auto text-white">
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex flex-col items-center px-8 pt-16 pb-32">
        <div className="mb-8">
          <div className="relative w-44 h-44 rounded-full overflow-hidden ring-4 ring-green-500 shadow-2xl">
            <Image
              src="/brand/core/hero.png"
              alt="StrainSpotter Hero"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <h1 className="text-6xl font-extrabold mb-3">The Garden</h1>
        <p className="text-lg text-white/80 mb-16 text-center max-w-xl">
          Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
        </p>

        <div className="grid grid-cols-3 gap-16">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              onClick={() => router.push(b.href)}
              className="
                w-48 h-48
                rounded-[2.5rem]
                bg-white/25 backdrop-blur-2xl
                border border-white/30
                shadow-2xl
                flex flex-col items-center justify-center
                hover:scale-110 hover:bg-white/35
                transition-all duration-200
              "
            >
              <div className="text-7xl mb-4">{b.icon}</div>
              <span className="text-lg font-semibold text-center">
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
