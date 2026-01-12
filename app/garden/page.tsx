"use client";

import Image from "next/image";
import Link from "next/link";

const BUTTONS = [
  { label: "Dispensaries", icon: "🌿", href: "/garden/dispensaries" }, // LIVE
  { label: "Seed Vendors", icon: "🌱", href: "/garden/seed-vendors" }, // LIVE
  { label: "Strain Browser", icon: "🧬", href: "/garden/strains" }, // PREVIEW
  { label: "Scanner", icon: "📷", href: "/garden/scanner" }, // LOCKED
  { label: "History", icon: "📜", href: "/garden/history" }, // PREVIEW
  { label: "Grow Coach", icon: "🌾", href: "/garden/grow-coach" }, // LOCKED
  { label: "Settings", icon: "⚙️", href: "/garden/settings" }, // LIVE
  { label: "Ecosystem", icon: "🌎", href: "/garden/ecosystem" }, // LIVE
  { label: "About", icon: "ℹ️", href: "/garden/about" }, // LIVE
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen text-white overflow-hidden">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* OVERLAY */}
      <div className="relative z-10 flex flex-col items-center px-6 py-14">
        {/* HERO */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-green-400 shadow-2xl">
            <Image
              src="/brand/hero.png"
              alt="Hero"
              fill
              className="object-cover"
            />
          </div>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="mt-2 text-white/80 text-center max-w-md">
            Your personal cannabis ecosystem.
          </p>
        </div>

        {/* ICON GRID */}
        <div className="mt-6 grid grid-cols-3 md:grid-cols-4 gap-10 max-w-4xl">
          {BUTTONS.map((b) => (
            <Link key={b.label} href={b.href}>
              <button
                className="
                flex flex-col items-center justify-center
                w-32 h-32
                rounded-3xl
                bg-white/20
                backdrop-blur-xl
                border border-white/30
                shadow-xl
                hover:bg-white/30
                transition
              "
              >
                <div className="text-4xl mb-2">{b.icon}</div>
                <div className="text-sm font-semibold tracking-wide text-white/90">
                  {b.label}
                </div>
              </button>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
