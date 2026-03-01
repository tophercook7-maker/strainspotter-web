import type { ReactNode } from "react";
import GardenBottomBar from "./GardenBottomBar";

export default function GardenLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen w-full text-white"
      style={{
        backgroundImage: "url(/strainspotter-bg.jpeg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* subtle dark wash for legibility */}
      <div className="absolute inset-0 bg-black/35 pointer-events-none" />
      {/* content frame - pb-24 so fixed bottom bar doesn't cover content */}
      <div className="mx-auto w-full max-w-6xl px-6 py-10 pb-24">
        {children}
      </div>
      <GardenBottomBar />
    </div>
  );
}
