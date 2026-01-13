"use client";

import { useRouter } from "next/navigation";

const ICONS = [
  { label: "Strains", icon: "🌿", route: "/garden/strains", x: "20%", y: "35%" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner", x: "45%", y: "35%" },
  { label: "Dispensaries", icon: "📍", route: "/garden/dispensaries", x: "70%", y: "35%" },

  { label: "Seed Vendors", icon: "🌰", route: "/garden/seed-vendors", x: "20%", y: "55%" },
  { label: "Grow Coach", icon: "🌱", route: "/garden/grow-coach", x: "45%", y: "55%" },
  { label: "History", icon: "📜", route: "/garden/history", x: "70%", y: "55%" },

  { label: "Favorites", icon: "⭐", route: "/garden/favorites", x: "32%", y: "75%" },
  { label: "Ecosystem", icon: "🌍", route: "/garden/ecosystem", x: "57%", y: "75%" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white">
      
      {/* BACKGROUND */}
      <img
        src="/garden-bg.jpg"
        alt="Garden background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/30" />

      {/* HERO */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 text-center z-10">
        <div className="w-32 h-32 mx-auto rounded-full bg-black/80 flex items-center justify-center shadow-2xl">
          <img
            src="/brand/core/hero.png"
            alt="Hero"
            className="w-24 h-24 object-contain"
          />
        </div>
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight">
          The Garden
        </h1>
        <p className="mt-2 text-white/80 max-w-xl mx-auto">
          Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
        </p>
      </div>

      {/* ICONS */}
      {ICONS.map((item) => (
        <button
          key={item.label}
          onClick={() => router.push(item.route)}
          className="
            absolute
            flex flex-col items-center justify-center
            w-32 h-32
            rounded-3xl
            bg-white/20
            backdrop-blur-xl
            border border-white/30
            shadow-2xl
            hover:bg-white/30
            transition
            z-10
          "
          style={{ left: item.x, top: item.y, transform: "translate(-50%, -50%)" }}
        >
          <span className="text-5xl mb-2">{item.icon}</span>
          <span className="text-sm font-semibold tracking-wide">
            {item.label}
          </span>
        </button>
      ))}
    </main>
  );
}
