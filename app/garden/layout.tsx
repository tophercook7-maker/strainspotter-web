import type { ReactNode } from "react";
import GardenBottomBar from "./GardenBottomBar";
import ActivityPing from "@/app/_components/ActivityPing";

const BG_ASSET = "/strainspotter-bg.jpeg";

export default function GardenLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full text-white">
      {/* Fixed full-viewport background using img for reliable loading (avoids background-image 404 fallback to black) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BG_ASSET}
        alt=""
        aria-hidden
        className="fixed inset-0 w-full h-full object-cover object-center z-0"
      />
      {/* Minimal overlay so cannabis photo remains clearly visible */}
      <div className="fixed inset-0 z-0 bg-black/[0.06] pointer-events-none" />

      {/* Content rail — above background */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-4 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px)+1.5rem)]">
        <ActivityPing />
        {children}
      </div>

      <GardenBottomBar />
    </div>
  );
}
