"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/brand/strainspotter-hero.png')",
        }}
      />

      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        {/* Hero Image */}
        <div className="mb-12">
          <img 
            src="/brand/strainspotter-hero.png" 
            alt="StrainSpotter" 
            className="max-w-md mx-auto w-full h-auto"
          />
        </div>

        {/* Two Buttons */}
        <div className="flex flex-col gap-4 max-w-xs mx-auto">
          <Link
            href="/garden"
            className="px-8 py-4 bg-emerald-600 text-black font-bold text-lg rounded-lg hover:bg-emerald-500 transition shadow-lg"
          >
            ENTER GARDEN
          </Link>
          
          <Link
            href="/scanner"
            className="px-8 py-4 bg-emerald-600 text-black font-bold text-lg rounded-lg hover:bg-emerald-500 transition shadow-lg"
          >
            SCANNER
          </Link>
        </div>

        {/* Small legal note */}
        <p className="mt-8 text-xs text-white/60">
          You must be 21+ to use this service
        </p>
      </div>
    </div>
  );
}
