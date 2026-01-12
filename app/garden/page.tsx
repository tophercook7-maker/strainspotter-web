"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

type Btn = { label: string; icon: string; href: string };

const BUTTONS: Btn[] = [
  { label: "Dispensaries", icon: "📍", href: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", href: "/garden/seeds" },
  { label: "Strains", icon: "🍃", href: "/garden/strains" },
  { label: "Scanner", icon: "📷", href: "/garden/scanner" },
  { label: "History", icon: "📜", href: "/garden/history" },
  { label: "Grow Coach", icon: "🪴", href: "/garden/grow" },
  { label: "Ecosystem", icon: "🌍", href: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", href: "/garden/settings" },
  { label: "Profile", icon: "👤", href: "/garden/profile" },
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
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-10">
        {/* HERO + TITLE */}
        <div className="flex flex-col items-center">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/25 bg-black/30 shadow-2xl backdrop-blur-xl">
            <Image
              src="/brand/core/hero.png"
              alt="Hero"
              fill
              priority
              className="object-cover"
            />
          </div>

          <h1 className="mt-5 text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.7)]">
            The Garden
          </h1>

          <p className="mt-2 max-w-2xl text-center text-lg text-white/85 drop-shadow">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        {/* ICON GRID (REAL APP ICONS) */}
        <div className="mt-10 grid w-full grid-cols-3 place-items-center gap-10 sm:gap-12 md:grid-cols-4">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              onClick={() => router.push(b.href)}
              className="
                group
                flex flex-col items-center justify-center
                h-28 w-28 sm:h-32 sm:w-32
                rounded-[30px]
                bg-white/16
                backdrop-blur-2xl
                shadow-[0_18px_45px_rgba(0,0,0,0.45)]
                border border-white/25
                hover:bg-white/24
                hover:border-white/35
                active:scale-[0.98]
                transition
                select-none
              "
            >
              <div className="text-5xl leading-none drop-shadow mb-2">
                {b.icon}
              </div>
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
