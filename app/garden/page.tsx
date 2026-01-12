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

        <div
          className="
    mt-16
    w-full
    max-w-6xl
    mx-auto
    grid
    grid-cols-3
    gap-x-24
    gap-y-20
    px-16
    place-items-center
  "
        >
          {[
            { label: "Strain Browser", icon: "🌿", path: "/garden/strains" },
            { label: "Scanner", icon: "📷", path: "/garden/scanner" },
            { label: "Dispensaries", icon: "📍", path: "/garden/dispensaries" },
            { label: "Seed Vendors", icon: "🌱", path: "/garden/seed-vendors" },
            { label: "Grow Coach", icon: "🪴", path: "/garden/grow-coach" },
            { label: "History", icon: "📜", path: "/garden/history" },
            { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
            { label: "Ecosystem", icon: "🌎", path: "/garden/ecosystem" },
            { label: "Settings", icon: "⚙️", path: "/garden/settings" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.path)}
              className="
  flex flex-col items-center justify-center
  w-40 h-40
  rounded-[32px]
  bg-white/25
  backdrop-blur-2xl
  border border-white/30
  shadow-2xl
  text-white
  hover:bg-white/35
  transition-all
  duration-200
  cursor-pointer
"
            >
              <div className="text-6xl mb-4">{item.icon}</div>
              <div className="text-base font-semibold tracking-wide text-white">
                {item.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
