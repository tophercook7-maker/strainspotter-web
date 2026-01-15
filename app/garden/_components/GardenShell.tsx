"use client";

import Image from "next/image";
import { ReactNode } from "react";

export default function GardenShell({ children }: { children: ReactNode }) {
  return (
    <main
      className="min-h-screen w-full flex flex-col items-center text-white"
      style={{
        backgroundImage: "url(/strainspotter-bg.jpeg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {children}
    </main>
  );
}
