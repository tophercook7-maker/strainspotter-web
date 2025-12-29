// Absolute path: /Users/christophercook/Desktop/strainspotter-web/app/page.tsx
"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleEnterGarden = () => {
    router.push("/garden");
  };

  const handleScanner = () => {
    router.push("/scanner");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="text-center px-4">
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
