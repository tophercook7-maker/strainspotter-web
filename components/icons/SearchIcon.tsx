// ============================================
// FIX SEARCH ICON + INLINE ICON ALIGNMENT
// ============================================
// Uses StrainSpotterEmblem (green ring + black background + leaf)
// Scales perfectly at any size
// Centers vertically with text
// Works on mobile + desktop

import Image from "next/image";

export function SearchIcon({ className = "" }) {
  return (
    <Image
      src="/emblem/emblem.png"
      alt="Search"
      width={20}
      height={20}
      className={`opacity-80 hover:opacity-100 transition-all inline-block align-middle ${className}`}
    />
  );
}
