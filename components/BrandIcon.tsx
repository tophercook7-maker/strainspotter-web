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
      }}
    >
      <Image
        src="/icons/leaf.svg"
        alt="StrainSpotter"
        width={size * 0.6}
        height={size * 0.6}
        className="object-contain"
      />
    </div>
  );
}

