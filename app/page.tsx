"use client";

import { useRouter } from "next/navigation";
import HeroLeaf from "@/components/HeroLeaf";

export default function HomePage() {
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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          alignItems: "center",
          width: "100%",
          maxWidth: "320px",
          padding: "0 16px",
        }}
      >
        <button
          onClick={handleEnterGarden}
          className="px-8 py-4 bg-emerald-600 text-black font-bold text-lg rounded-lg hover:bg-emerald-500 transition shadow-lg w-full"
        >
          Enter the Garden
        </button>
        <button
          onClick={handleScanner}
          className="px-8 py-4 bg-emerald-600 text-black font-bold text-lg rounded-lg hover:bg-emerald-500 transition shadow-lg w-full"
        >
          Scan a Strain
        </button>
      </div>
    </main>
  );
}
