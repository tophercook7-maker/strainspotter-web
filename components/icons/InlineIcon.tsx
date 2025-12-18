// ============================================
// FIX INLINE ICONS FOR DATA ROWS
// ============================================

import Image from "next/image";

export function InlineIcon({ size = 16, className = "" }) {
  return (
    <Image
      src="/StrainSpotterEmblem.png"
      alt="Icon"
      width={size}
      height={size}
      className={`inline-block mr-2 translate-y-[1px] opacity-90 ${className}`}
    />
  );
}
