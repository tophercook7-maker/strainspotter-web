"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "History", icon: "🕘", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧩", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      {/* BACKGROUND */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center pt-10">
        {/* HERO */}
        <div className="mb-4">
          <Image
            src="/hero.png"
            alt="StrainSpotter"
            width={64}
            height={64}
            className="object-contain"
            draggable={false}
          />
        </div>

        {/* TITLE */}
        <h1 className="text-4xl font-extrabold tracking-wide text-green-400 mb-10">
          StrainSpotter
        </h1>

        {/* ICON GRID */}
        <div
          className="grid grid-cols-3 place-items-center"
          style={{
            columnGap: "4.5rem",
            rowGap: "4.5rem",
          }}
        >
          {ROUTES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.route)}
              className="
                flex flex-col items-center justify-center
                w-36 h-36
                rounded-[32px]
                bg-white/20
                backdrop-blur-xl
                shadow-2xl
                border border-white/30
                text-white
                hover:bg-white/30
                active:scale-95
                transition
              "
            >
              <div className="text-5xl mb-2">{item.icon}</div>
              <div className="text-sm font-semibold tracking-wide">
                {item.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
