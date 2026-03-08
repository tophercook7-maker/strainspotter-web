import type { ReactNode } from "react";
import GardenBottomBar from "./GardenBottomBar";
import ActivityPing from "@/app/_components/ActivityPing";

const BG_ASSET = "/brand/core/strainspotter-bg.jpg";

export default function GardenLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full text-white">
      {/* Fixed full-viewport background so it's visible regardless of root layout centering */}
      <div
        aria-hidden
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${BG_ASSET})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Minimal overlay so cannabis photo remains clearly visible */}
      <div className="fixed inset-0 z-0 bg-black/8 pointer-events-none" />

      {/* Content rail — above background */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px)+2rem)]">
        <ActivityPing />
        {children}
      </div>

      <GardenBottomBar />
    </div>
  );
}
