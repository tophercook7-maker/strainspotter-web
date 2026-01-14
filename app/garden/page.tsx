"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", path: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", path: "/garden/strains" },
  { label: "Grow Coach", icon: "🧠", path: "/garden/grow-coach" },
  { label: "Seed Vendors", icon: "🌱", path: "/garden/seed-vendors" },
  { label: "Scanner", icon: "📷", path: "/garden/scanner" },
  { label: "History", icon: "🗂️", path: "/garden/history" },
  { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧩", path: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", path: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full text-white">
      {/* BACKGROUND IMAGE (DO NOT TOUCH) */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden Background"
        fill
        priority
        className="object-cover"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center pt-10 pb-24">
        {/* HERO */}
        <Image
          src="/hero.png"
          alt="StrainSpotter"
          width={64}
          height={64}
          draggable={false}
        />

        {/* TITLE */}
        <h1 className="mt-3 text-4xl font-extrabold text-green-400 tracking-wide">
          StrainSpotter
        </h1>

        {/* ICON GRID */}
        <div className="mt-14 grid grid-cols-3 gap-x-20 gap-y-16">
          {ROUTES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.path)}
              className="
                flex flex-col items-center justify-center
                w-36 h-36
                rounded-[28px]
                bg-white/20
                backdrop-blur-xl
                border border-white/30
                shadow-2xl
                hover:bg-white/30
                transition
              "
            >
              <span className="text-5xl mb-3">{item.icon}</span>
              <span className="text-sm font-semibold tracking-wide">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Grow Coach", icon: "🌱", route: "/garden/grow-coach" },
  { label: "Seed Vendors", icon: "🌰", route: "/garden/seed-vendors" },
  { label: "History", icon: "🕘", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧬", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen w-full text-white"
      style={{
        backgroundImage: "url(/garden-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex flex-col items-center pt-10">
        {/* HERO */}
        <div className="mb-3">
          <Image
            src="/hero.png"
            alt="StrainSpotter"
            width={56}
            height={56}
            priority
            draggable={false}
          />
        </div>

        {/* TITLE */}
        <h1 className="text-4xl font-extrabold tracking-wide text-green-400 mb-12">
          StrainSpotter
        </h1>

        {/* ICON GRID */}
        <div className="grid grid-cols-3 gap-x-20 gap-y-16">
          {ROUTES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.route)}
              className="
                w-36 h-36
                rounded-[28px]
                bg-white/20
                backdrop-blur-xl
                border border-white/30
                shadow-[0_18px_40px_rgba(0,0,0,0.45)]
                flex flex-col items-center justify-center
                text-white
                hover:bg-white/30
                active:scale-95
                transition
              "
            >
              <div className="text-5xl mb-2">{item.icon}</div>
              <div className="text-base font-semibold tracking-wide">
                {item.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Audit", icon: "🧪", route: "/garden/audit" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      <Image
        src="/garden-bg.jpg"
        alt="Garden Background"
        fill
        priority
        className="object-cover"
      />

      <div className="relative z-10 flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden md:flex w-24 flex-col items-center py-10 gap-8 bg-black/30 backdrop-blur-xl border-r border-white/10">
          <img
            src="/hero.png"
            alt="StrainSpotter"
            className="w-10 h-10 object-contain"
            draggable={false}
          />
          {ROUTES.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.route)}
              className="flex flex-col items-center text-white/80 hover:text-white transition"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          ))}
        </aside>

        {/* MAIN CONTENT */}
        <section className="flex-1 flex flex-col items-center pt-12 px-8">
          <img
            src="/hero.png"
            alt="StrainSpotter"
            className="w-14 h-14 object-contain"
            draggable={false}
          />

          <h1 className="mt-4 mb-12 text-4xl font-extrabold tracking-wide text-green-400">
            StrainSpotter
          </h1>

          <div className="w-full">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-12 sm:grid-cols-3 md:grid-cols-4 place-items-center">
              {ROUTES.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => router.push(item.route)}
                  className="
                    flex flex-col items-center justify-center
                    w-40 h-40
                    rounded-[2.2rem]
                    bg-white/25
                    backdrop-blur-2xl
                    border border-white/30
                    shadow-[0_25px_50px_rgba(0,0,0,0.45)]
                    hover:bg-white/35
                    transition
                  "
                >
                  <span className="text-6xl mb-4">{item.icon}</span>
                  <span className="text-base font-semibold tracking-wide text-white">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", route: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      {/* BACKGROUND IMAGE */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden Background"
        fill
        priority
        className="object-cover"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center pt-10">
        {/* HERO */}
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-16 h-16 object-contain"
          draggable={false}
        />

        {/* TITLE */}
        <h1 className="mt-4 mb-12 text-4xl font-extrabold tracking-wide text-green-400">
          StrainSpotter
        </h1>

        {/* ICON GRID — WIDE */}
        <div className="w-full px-10">
          <div className="mx-auto grid max-w-6xl grid-cols-3 gap-x-20 gap-y-20 md:grid-cols-4">
            {ROUTES.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => router.push(item.route)}
                className="
                  flex flex-col items-center justify-center
                  w-36 h-36
                  rounded-[2rem]
                  bg-white/20 backdrop-blur-2xl
                  border border-white/30
                  shadow-[0_20px_40px_rgba(0,0,0,0.35)]
                  hover:bg-white/30
                  transition
                "
              >
                <span className="text-5xl mb-3">{item.icon}</span>
                <span className="text-sm font-semibold tracking-wide text-white/90">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Dispensaries", icon: "🌿", route: "/garden/dispensaries" },
  { label: "Strains", icon: "🧬", route: "/garden/strains" },
  { label: "Scanner", icon: "📷", route: "/garden/scanner" },
  { label: "Seed Vendors", icon: "🌱", route: "/garden/seed-vendors" },
  { label: "Grow Coach", icon: "🧠", route: "/garden/grow-coach" },
  { label: "History", icon: "🕓", route: "/garden/history" },
  { label: "Favorites", icon: "⭐", route: "/garden/favorites" },
  { label: "Ecosystem", icon: "🕸️", route: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", route: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      {/* BACKGROUND IMAGE (DO NOT TOUCH) */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden Background"
        fill
        priority
        className="object-cover"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center pt-10">
        {/* HERO */}
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-14 h-14 object-contain"
          draggable={false}
        />

        {/* TITLE */}
        <h1 className="mt-4 mb-12 text-4xl font-extrabold tracking-wide text-green-400">
          StrainSpotter
        </h1>

        {/* ICON GRID — WIDE iPAD STYLE */}
        <div className="w-full px-10">
          <div className="mx-auto grid max-w-6xl grid-cols-3 gap-x-20 gap-y-20 md:grid-cols-4">
            {ROUTES.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => router.push(item.route)}
                className="
                  flex flex-col items-center justify-center
                  w-36 h-36
                  rounded-[2rem]
                  bg-white/20
                  backdrop-blur-2xl
                  border border-white/30
                  shadow-[0_20px_40px_rgba(0,0,0,0.35)]
                  hover:bg-white/30
                  transition
                "
              >
                <span className="text-5xl mb-3">{item.icon}</span>
                <span className="text-sm font-semibold tracking-wide text-white/90">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
"use client";

import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Dispensaries", icon: "🏪", path: "/garden/dispensaries" },
  { label: "Strains", icon: "🌿", path: "/garden/strains" },
  { label: "Scanner", icon: "📷", path: "/garden/scanner" },
  { label: "Grow Coach", icon: "🧑‍🌾", path: "/garden/grow-coach" },
  { label: "History", icon: "🕓", path: "/garden/history" },
  { label: "Seed Vendors", icon: "🌱", path: "/garden/seed-vendors" },
  { label: "Favorites", icon: "⭐", path: "/garden/favorites" },
  { label: "Ecosystem", icon: "🧠", path: "/garden/ecosystem" },
  { label: "Settings", icon: "⚙️", path: "/garden/settings" },
];

export default function GardenPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen w-full text-white"
      style={{
        backgroundImage: "url(/garden-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* CONTENT COLUMN */}
      <div className="flex flex-col items-center px-6 pt-10 pb-20">
        {/* HERO */}
        <img
          src="/hero.png"
          alt="StrainSpotter"
          className="w-16 h-16 object-contain"
          draggable={false}
        />

        {/* TITLE */}
        <h1 className="mt-4 mb-12 text-4xl font-extrabold tracking-wide text-green-400">
          StrainSpotter
        </h1>

        {/* ICON GRID */}
        <div
          className="
            grid
            grid-cols-3
            gap-x-14
            gap-y-16
          "
        >
          {ROUTES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.path)}
              className="
                w-36 h-36
                rounded-[28px]
                flex flex-col items-center justify-center
                bg-white/20
                backdrop-blur-xl
                border border-white/30
                shadow-[0_20px_40px_rgba(0,0,0,0.35)]
                hover:bg-white/30
                active:scale-95
                transition
              "
            >
              <div className="text-5xl mb-3">{item.icon}</div>
              <div className="text-sm font-semibold tracking-wide text-white/90">
                {item.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
