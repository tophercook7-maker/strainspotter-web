import type { ReactNode } from "react";
import GardenBottomBar from "./GardenBottomBar";
import ActivityPing from "@/app/_components/ActivityPing";

export default function GardenLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen w-full text-white"
      style={{
        backgroundImage: "url(/strainspotter-bg.jpeg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* dark overlay */}
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      {/* centered rail */}
      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-4 pb-28">
        <ActivityPing />
        {children}
      </div>

      <GardenBottomBar />
    </div>
  );
}
