"use client";

import Image from "next/image";

interface BrandIconProps {
  size?: number;
  className?: string;
}

export default function BrandIcon({ size = 120, className = "" }: BrandIconProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <Image
        src="/emblem/StrainSpotterEmblem.png"
        alt="StrainSpotter"
        width={size}
        height={size}
        className="object-contain"
        unoptimized
      />
    </div>
  );
}

