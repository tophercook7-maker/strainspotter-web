// Absolute path: /Users/christophercook/Desktop/strainspotter-web/app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import BrandIcon from "@/components/BrandIcon";

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
        {/* HARD VERIFY: Direct image render */}
        <img
          src="/brand/leaf-icon.png"
          alt="StrainSpotter Leaf"
          style={{
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            boxShadow: "0 0 25px rgba(0,255,0,0.6)",
            display: "block",
            margin: "0 auto",
            zIndex: 50,
            position: "relative"
          }}
        />

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
      </div>
    </div>
  );
}
