"use client";

import Image from "next/image";

export default function GardenHeroShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <Image
        src="/garden-bg.jpg"
        alt="Garden background"
        fill
        priority
        className="object-cover"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10">
        {/* Hero */}
        <div className="flex justify-center pt-16 pb-10">
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
        <div className="mx-auto max-w-6xl px-6 pb-24">
          {children}
        </div>
      </div>
    </div>
  );
}

