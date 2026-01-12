"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

type GardenButton = {
  label: string;
  icon: string;
  href: string;
};

const BUTTONS: GardenButton[] = [
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
      <div className="absolute inset-0 bg-black/40" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-10">
        {/* HERO */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/25 bg-black/40 shadow-2xl backdrop-blur-xl">
            <Image
              src="/brand/core/hero.png"
              alt="Hero"
              fill
              priority
              className="object-cover"
            />
          </div>

          <h1 className="mt-4 text-5xl font-extrabold tracking-tight drop-shadow">
            The Garden
          </h1>
          <p className="mt-2 max-w-xl text-center text-white/80">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        {/* iPAD ICON GRID */}
        <div className="mt-6 grid w-full max-w-5xl grid-cols-3 gap-10 sm:gap-12 md:grid-cols-4">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              onClick={() => router.push(b.href)}
              className="
                group
                flex flex-col items-center justify-center
                h-28 w-28 sm:h-32 sm:w-32
                rounded-[28px]
                bg-white/18
                backdrop-blur-2xl
                shadow-2xl
                border border-white/25
                hover:bg-white/26
                hover:border-white/35
                active:scale-[0.98]
                transition
              "
            >
              <div className="text-4xl sm:text-5xl leading-none drop-shadow mb-2">
                {b.icon}
              </div>
              <div className="text-[12px] sm:text-sm font-semibold tracking-wide text-white/95 drop-shadow">
                {b.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
