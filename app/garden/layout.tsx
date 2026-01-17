import type { ReactNode } from "react";

export default function GardenLayout({ children }: { children: ReactNode }) {
  return (
    <main
      className="min-h-screen w-full text-white"
      style={{
        backgroundImage: "url('/strainspotter-bg.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {children}
    </main>
  );
}
