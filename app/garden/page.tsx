"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import GardenIcon from "./_components/GardenIcon";

const ROUTES = [
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🍄", route: "/garden/grow-coach" },
  { label: "History", icon: "📜", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen w-full text-white overflow-hidden"
      style={{
        backgroundImage: "url('/strainspotter-bg.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* soft vignette to make text/icons readable */}
      <div className="min-h-screen w-full bg-black/25">
        {/* SPINE: single authoritative container */}
        <div className="mx-auto w-full max-w-[980px] px-6 sm:px-10">
          <div className="min-h-screen flex flex-col items-center justify-center">
            {/* HERO */}
            <div className="flex flex-col items-center">
              <Image
                src="/hero.png"
                alt="StrainSpotter Hero"
                width={150}
                height={150}
                priority
                className="select-none drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
              />

              <h1 className="mt-6 text-center font-extrabold tracking-tight text-3xl sm:text-4xl md:text-5xl text-white drop-shadow-[0_10px_22px_rgba(0,0,0,0.6)]">
                StrainSpotter AI
              </h1>
            </div>

            {/* GRID */}
            <div className="mt-10 sm:mt-12 md:mt-14 w-full flex justify-center">
              <div className="grid grid-cols-3 gap-x-10 gap-y-10 sm:gap-x-14 sm:gap-y-12 md:gap-x-16 md:gap-y-14">
                {ROUTES.map((item) => (
                  <GardenIcon
                    key={item.label}
                    label={item.label}
                    icon={item.icon}
                    onClick={() => router.push(item.route)}
                  />
                ))}
              </div>
            </div>

            {/* optional breathing room on very short viewports */}
            <div className="h-10" />
          </div>
        </div>
      </div>
    </main>
  );
}
