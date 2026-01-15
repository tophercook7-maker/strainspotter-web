"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Strains", icon: "🧬", route: "/garden/strains" },
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "History", icon: "🕘", route: "/garden/history" },
  { label: "Grow Coach", icon: "🧑‍🌾", route: "/garden/grow-coach" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Ecosystem", icon: "🌍", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* BACKGROUND */}
      <div className="absolute inset-0">
        <Image
          src="/garden-bg.png"
          alt="Garden background"
          fill
          priority
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/80" />
        <div className="absolute inset-0 [background:radial-gradient(70%_60%_at_50%_20%,rgba(255,255,255,0.10),transparent_60%)]" />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-8 pb-16 pt-10 sm:pt-14">
        {/* HERO */}
        <div className="flex flex-col items-center text-center mb-10 sm:mb-12">
          <div className="relative w-[160px] h-[160px] sm:w-[190px] sm:h-[190px] rounded-3xl overflow-hidden ring-1 ring-white/15 shadow-[0_20px_80px_rgba(0,0,0,0.60)]">
            <Image
              src="/hero.png"
              alt="StrainSpotter Hero"
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/0 to-black/25" />
          </div>

          <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="mt-2 text-base sm:text-lg text-white/75 max-w-2xl">
            Your personal cannabis ecosystem — scans, history, favorites, and tools in one place.
          </p>
        </div>

        {/* GRID */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-6">
          {ROUTES.map((item) => (
            <button
              key={item.route}
              onClick={() => router.push(item.route)}
              className="
                group relative w-full
                rounded-[28px]
                px-5 sm:px-6
                py-8 sm:py-10
                text-left
                ring-1 ring-white/14
                bg-white/6
                shadow-[0_18px_55px_rgba(0,0,0,0.55)]
                backdrop-blur-xl
                transition
                hover:bg-white/10 hover:ring-white/22
                active:scale-[0.99]
              "
            >
              {/* subtle gloss */}
              <div className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0 transition group-hover:opacity-100 [background:radial-gradient(120%_80%_at_30%_20%,rgba(255,255,255,0.16),transparent_55%)]" />

              {/* icon + label */}
              <div className="flex items-center gap-4">
                <div
                  className="
                    flex items-center justify-center
                    w-16 h-16 sm:w-[86px] sm:h-[86px]
                    rounded-2xl
                    bg-black/25
                    ring-1 ring-white/12
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]
                  "
                >
                  <span className="text-4xl sm:text-5xl leading-none">
                    {item.icon}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="text-lg sm:text-2xl font-bold tracking-tight truncate">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm sm:text-base text-white/60">
                    Open
                  </div>
                </div>
              </div>

              {/* bottom fade for depth */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-[28px] bg-gradient-to-t from-black/25 to-transparent" />
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
