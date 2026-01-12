"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

type Btn = { label: string; icon: string; onClick: () => void };

export default function GardenPage() {
  const router = useRouter();

  const BUTTONS: Btn[] = [
    { label: "Strain Browser", icon: "🍃", onClick: () => router.push("/garden/strains") },
    { label: "Scanner", icon: "📷", onClick: () => router.push("/garden/scanner") },
    { label: "Dispensaries", icon: "📍", onClick: () => router.push("/garden/dispensaries") },
    { label: "Seed Vendors", icon: "🌱", onClick: () => router.push("/garden/seed-vendors") },
    { label: "Grow Coach", icon: "🪴", onClick: () => router.push("/garden/grow-coach") },
    { label: "History", icon: "📜", onClick: () => router.push("/garden/history") },
    { label: "Favorites", icon: "⭐", onClick: () => router.push("/garden/favorites") },
    { label: "Ecosystem", icon: "🌍", onClick: () => router.push("/garden/ecosystem") },
    { label: "Settings", icon: "⚙️", onClick: () => router.push("/garden/settings") },
  ];

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
      <div className="relative z-10 min-h-screen w-full px-10 py-10">
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

        {/* ICON GRID START */}
        <div
          className="
    relative
    mt-24
    grid
    grid-cols-3
    gap-x-28
    gap-y-24
    px-24
    w-full
    max-w-none
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
        w-36 h-36
        rounded-[36px]
        bg-white/20
        backdrop-blur-2xl
        border border-white/30
        shadow-2xl
        text-white
        hover:bg-white/35
        hover:scale-105
        transition-all duration-200
      "
            >
              <span className="text-6xl mb-3">{item.icon}</span>
              <span className="text-base font-semibold tracking-wide text-white/90">
                {item.label}
              </span>
            </button>
          ))}
        </div>
        {/* ICON GRID END */}
      </div>
    </main>
  );
}
