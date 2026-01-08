"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Page() {
  const [ageConfirmed, setAgeConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("age_confirmed_21");
    setAgeConfirmed(stored === "true");
  }, []);

  const confirmAge = () => {
    localStorage.setItem("age_confirmed_21", "true");
    setAgeConfirmed(true);
  };

  if (ageConfirmed !== true) {
    return (
      <main className="relative min-h-screen w-full bg-[url('/backgrounds/garden-field.jpg')] bg-cover bg-center text-white flex items-center justify-center px-4 py-16">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 max-w-md w-full bg-white/10 border border-white/20 rounded-2xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold">Age confirmation</h1>
          <p className="text-sm text-white/80">
            You must be 21 years of age or older to use this application.
          </p>
          <div className="space-y-3">
            <button
              onClick={confirmAge}
              className="w-full px-4 py-3 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
            >
              I am 21 or older
            </button>
            <Link
              href="https://responsibility.org/"
              className="text-sm text-white/70 underline underline-offset-4 block"
            >
              I am not
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full bg-[url('/backgrounds/garden-field.jpg')] bg-cover bg-center text-white flex flex-col items-center px-4 py-16">
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center bg-transparent">
            <img
              src="/brand/core/hero.png"
              alt="StrainSpotter Hero"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Strainspotter
          </h1>
          <p className="text-white/80 max-w-xl text-base sm:text-lg">
            Document. Understand. Care over time.
          </p>
        </div>

        <div className="w-full max-w-md flex flex-col gap-3">
          <Link
            href="/scanner"
            className="w-full px-6 py-3.5 rounded-xl bg-emerald-500 text-black text-lg font-semibold text-center hover:bg-emerald-400"
          >
            Document plant
          </Link>
          <Link
            href="/garden"
            className="w-full px-6 py-3.5 rounded-xl bg-white/10 border border-white/25 text-white text-lg font-semibold text-center hover:bg-white/15"
          >
            Enter the Garden
          </Link>
        </div>
      </div>
    </main>
  );
}
