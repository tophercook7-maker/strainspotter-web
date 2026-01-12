"use client";

import Link from "next/link";
import Image from "next/image";

const BUTTONS = [
  { label: "Dispensaries", icon: "🌿", href: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", href: "/garden/seed-vendors" },
  { label: "Strains", icon: "🧬", href: "/garden/strains" },
  { label: "Scanner", icon: "📷", href: "/garden/scanner" },
  { label: "History", icon: "📜", href: "/garden/history" },
  { label: "Grow Coach", icon: "🧠", href: "/garden/grow-coach" },
  { label: "Ecosystem", icon: "🌎", href: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", href: "/garden/settings" },
  { label: "Profile", icon: "👤", href: "/garden/profile" },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover opacity-60"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center px-6 py-20">

        {/* HERO */}
        <div className="mb-10 flex flex-col items-center">
          <div className="w-28 h-28 rounded-full overflow-hidden mb-4 border border-white/30 backdrop-blur-xl">
            <Image
              src="/brand/hero.png"
              alt="Hero"
              width={112}
              height={112}
              className="object-cover"
            />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            The Garden
          </h1>
        </div>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 gap-10 sm:grid-cols-3 md:grid-cols-4 max-w-4xl mx-auto">
          {BUTTONS.map((b) => (
            <Link key={b.label} href={b.href}>
              <div
                className="
                  flex flex-col items-center justify-center
                  w-32 h-32
                  rounded-3xl
                  bg-white/20
                  backdrop-blur-xl
                  shadow-xl
                  border border-white/30
                  text-white
                  hover:bg-white/30
                  transition
                  cursor-pointer
                "
              >
                <div className="text-4xl mb-2">{b.icon}</div>
                <div className="text-sm font-semibold tracking-wide text-white/90">
                  {b.label}
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
