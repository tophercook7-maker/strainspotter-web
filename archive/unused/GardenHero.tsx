'use client';

import Image from 'next/image';

export function GardenHero() {
  return (
    <div className="w-full text-center pt-14 pb-6">
      <div className="mx-auto w-40 h-40 relative">
        <Image
          src="/emblem/StrainSpotterEmblem.png"
          alt="StrainSpotter Emblem"
          fill
          className="object-contain animate-pulse-slow drop-shadow-[0_0_18px_rgba(16,255,180,0.55)]"
        />
      </div>

      <h1 className="text-3xl font-bold mt-4 text-[#00ffae] drop-shadow-lg">
        StrainSpotter
      </h1>

      <p className="text-md mt-2 opacity-90">
        Welcome to the Garden — your cannabis intelligence hub.
      </p>
    </div>
  );
}
