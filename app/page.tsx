// Absolute path: /Users/christophercook/Desktop/strainspotter-web/app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import HeroLeaf from "@/components/HeroLeaf";

export default function Home() {
  const router = useRouter();

  const handleEnterGarden = () => {
    router.push("/garden");
  };

  const handleScanner = () => {
    router.push("/scanner");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-transparent">
      <HeroLeaf />

      <div className="flex flex-col gap-4 w-full max-w-xs px-4">
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
    </main>
  );
}
