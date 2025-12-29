"use client";

import Image from "next/image";

interface BrandIconProps {
  size?: number;
  className?: string;
}

export default function BrandIcon({ size = 120, className = "" }: BrandIconProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-emerald-600 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        boxShadow: `0 0 ${size * 0.3}px rgba(34, 197, 94, 0.5)`,
      }}
    >
      <Image
        src="/icons/leaf.svg"
        alt="StrainSpotter"
        width={Math.round(size * 0.6)}
        height={Math.round(size * 0.6)}
        className="object-contain"
        unoptimized
      />
    </div>
  );
}

