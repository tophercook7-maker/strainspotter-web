"use client";

import Image from "next/image";

export default function GardenHeroShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-0">
      {/* Background image */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Foreground content */}
      <div className="absolute inset-0 z-10 overflow-y-auto">
        {/* Hero */}
        <div className="flex justify-center pt-16 pb-12">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-green-900/80 ring-4 ring-green-500/40 backdrop-blur">
            <Image
              src="/leaf-hero.png"
              alt="StrainSpotter leaf"
              width={72}
              height={72}
            />
          </div>
        </div>

        {/* Page content */}
        <div className="mx-auto max-w-6xl px-6 pb-32">
          {children}
        </div>
      </div>
    </div>
  );
}
