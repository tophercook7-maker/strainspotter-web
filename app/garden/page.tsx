"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

type Btn = { label: string; icon: string; href: string };

const BUTTONS: Btn[] = [
  { label: "Strain Browser", icon: "🍃", href: "/garden/strains" },
  { label: "Scanner", icon: "📷", href: "/garden/scanner" },
  { label: "Dispensaries", icon: "📍", href: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", href: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🪴", href: "/garden/grow-coach" },
  { label: "History", icon: "📜", href: "/garden/history" },
  { label: "Favorites", icon: "⭐", href: "/garden/favorites" },
  { label: "Ecosystem", icon: "🌍", href: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", href: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/35" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center px-10 py-10">
        {/* HERO */}
        <div className="flex flex-col items-center">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/30 bg-black/40 shadow-2xl backdrop-blur-xl">
            <Image
              src="/brand/core/hero.png"
              alt="Hero"
              fill
              priority
              className="object-cover"
            />
          </div>

          <h1 className="mt-5 text-6xl font-extrabold tracking-tight drop-shadow-[0_6px_18px_rgba(0,0,0,0.7)]">
            The Garden
          </h1>

          <p className="mt-2 max-w-2xl text-center text-lg text-white/85 drop-shadow">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        {/* SPREAD-OUT ICON FIELD */}
        <div className="mt-16 grid w-full max-w-7xl grid-cols-3 gap-x-24 gap-y-20 md:grid-cols-3 lg:grid-cols-3">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => router.push(b.href)}
              className="
                flex flex-col items-center justify-center
                h-32 w-32
                rounded-[32px]
                bg-white/18
                backdrop-blur-2xl
                shadow-[0_22px_55px_rgba(0,0,0,0.5)]
                border border-white/30
                hover:bg-white/28
                hover:border-white/45
                active:scale-[0.97]
                transition
                cursor-pointer
                focus:outline-none
              "
            >
              <div className="text-5xl mb-2 drop-shadow">{b.icon}</div>
              <div className="text-sm font-semibold tracking-wide text-white/95 drop-shadow">
                {b.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
