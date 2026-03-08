import type { ReactNode } from "react";
import GardenBottomBar from "./GardenBottomBar";
import ActivityPing from "@/app/_components/ActivityPing";

export default function GardenLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen w-full text-white"
      style={{
        backgroundImage: "url(/brand/core/strainspotter-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* light overlay so cannabis photo shows through */}
      <div className="absolute inset-0 bg-black/18 pointer-events-none" />

      {/* centered rail — extra bottom padding so content clears fixed bottom bar + safe area */}
      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px)+2rem)]">
        <ActivityPing />
        {children}
      </div>

      <GardenBottomBar />
    </div>
  );
}
