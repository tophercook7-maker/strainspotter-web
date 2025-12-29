// Absolute path: /Users/christophercook/Desktop/strainspotter-web/app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import HeroImage from "@/components/HeroImage";

export default function Home() {
  const router = useRouter();

  const handleEnterGarden = () => {
    router.push("/garden");
  };

  const handleScanner = () => {
    router.push("/scanner");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center" style={{ isolation: 'isolate' }}>
      {/* Hero Background */}
      <HeroImage />

      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/40" style={{ zIndex: 1 }} />

      {/* Content */}
      <div className="relative z-10 text-center px-4" style={{ position: 'relative', zIndex: 2 }}>
        {/* Two Buttons */}
        <div className="flex flex-col gap-4 max-w-xs mx-auto">
          <button
            onClick={handleEnterGarden}
            className="px-8 py-4 bg-emerald-600 text-black font-bold text-lg rounded-lg hover:bg-emerald-500 transition shadow-lg"
          >
            ENTER GARDEN
          </button>
          
          <button
            onClick={handleScanner}
            className="px-8 py-4 bg-emerald-600 text-black font-bold text-lg rounded-lg hover:bg-emerald-500 transition shadow-lg"
          >
            SCANNER
          </button>
        </div>

        {/* Temp visual marker */}
        <p className="mt-8 text-xs text-white/60">
          HOME ONLY — HERO ACTIVE
        </p>
      </div>
    </div>
  );
}
