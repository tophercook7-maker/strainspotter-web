"use client";

import Link from "next/link";

type GardenButton = {
  label: string;
  icon: string;
  href?: string;
  disabled?: boolean;
};

const BUTTONS: GardenButton[] = [
  { label: "Strains", icon: "🌿", href: "/garden/strains" },
  { label: "Dispensaries", icon: "📍", href: "/garden/dispensaries" },
  { label: "Seed Vendors", icon: "🌱", href: "/garden/seeds" },
  { label: "My Stash", icon: "🫙", href: "/garden/stash" },
  { label: "Grow Log", icon: "🗓️", href: "/garden/grow-log" },
  { label: "Terpenes", icon: "🧪", href: "/garden/terpenes" },
  { label: "Effects", icon: "✨", href: "/garden/effects" },
  { label: "Favorites", icon: "⭐", href: "/garden/favorites" },
  { label: "Settings", icon: "⚙️", href: "/garden/settings" },
];

export default function GardenPage() {
  return (
    <main className="relative min-h-screen text-white overflow-hidden">
      {/* FULL BACKGROUND IMAGE */}
      <div className="absolute inset-0 -z-10">
        {/* Use <img> so it NEVER fails due to next/image config */}
        <img
          src="/garden-bg.jpg"
          alt="Garden background"
          className="h-full w-full object-cover"
        />
        {/* Darken + soften so glass pops */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      {/* CONTENT WRAP (no black header bar) */}
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-10 sm:pt-12 pb-16">
        {/* HERO */}
        <div className="flex flex-col items-center text-center mb-10 sm:mb-12">
          {/* If your hero file is named differently, change ONLY this src:
              examples: /hero.jpg  /hero.png  /garden-hero.png
          */}
          <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden ring-1 ring-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            <img
              src="/hero.png"
              alt="Hero"
              className="h-full w-full object-cover"
            />
            {/* subtle glass sheen */}
            <div className="absolute inset-0 bg-white/10" />
          </div>

          <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight">
            The Garden
          </h1>
          <p className="mt-2 text-white/75 max-w-xl">
            Your personal cannabis ecosystem — calm, grounded, and built on supported truth.
          </p>
        </div>

        {/* GLASS PANEL (shrunk + centered, not huge white box) */}
        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
          <div className="p-5 sm:p-7">
            {/* ICON GRID — BIG, SEPARATED, GLASSY */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-6">
              {BUTTONS.map((b) => {
                const common =
                  "group relative flex flex-col items-center justify-center text-center " +
                  "rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl " +
                  "shadow-[0_10px_30px_rgba(0,0,0,0.35)] " +
                  "transition-transform duration-200 active:scale-[0.98] " +
                  "hover:bg-white/15 hover:border-white/25 " +
                  "min-h-[120px] sm:min-h-[140px] px-4";

                const inner = (
                  <>
                    {/* top glow */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent opacity-70" />
                    {/* icon */}
                    <div className="relative text-3xl sm:text-4xl drop-shadow">
                      {b.icon}
                    </div>
                    {/* label */}
                    <div className="relative mt-3 text-sm sm:text-base font-semibold tracking-wide text-white">
                      {b.label}
                    </div>
                  </>
                );

                if (b.disabled) {
                  return (
                    <button
                      key={b.label}
                      disabled
                      className={common + " opacity-45 cursor-not-allowed"}
                      aria-disabled="true"
                    >
                      {inner}
                    </button>
                  );
                }

                return (
                  <Link key={b.label} href={b.href || "/garden"} className={common}>
                    {inner}
                  </Link>
                );
              })}
            </div>

            {/* footer spacing */}
            <div className="mt-6 sm:mt-7 text-center text-xs sm:text-sm text-white/60">
              Tip: if the hero still doesn’t show, rename your hero file to <span className="font-semibold text-white/80">hero.png</span> inside <span className="font-semibold text-white/80">/public</span>.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
