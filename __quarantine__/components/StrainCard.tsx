"use client";

import Image from "next/image";
import { usePortal } from "@/app/components/portal/PortalController";
import type { StrainData } from "@/types/strain";
import { InlineIcon } from "./icons/InlineIcon";

interface StrainCardProps {
  strain: StrainData;
}

export function StrainCard({ strain }: StrainCardProps) {
  const { openPortal } = usePortal();

  return (
    <div
      onClick={() => openPortal(strain.slug)}
      className="p-4 rounded-xl bg-black/40 
      border border-emerald-500/20 hover:border-emerald-300/40
      hover:scale-[1.04] transition-all cursor-pointer 
      backdrop-blur-md flex items-center gap-3"
    >
      {/* Hero image - 44px × 44px, centered */}
      <div 
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: '44px',
          height: '44px',
          backgroundColor: '#000',
          border: '1px solid rgba(16,255,180,0.45)',
          boxShadow: '0 0 12px rgba(16,255,180,0.55)',
          borderRadius: '50%',
        }}
      >
        <Image
          src="/emblem/hero-small.png"
          alt="Strain hero"
          width={44}
          height={44}
          style={{ objectFit: 'contain' }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-emerald-200">{strain.name}</p>
        <div className="flex items-center text-sm opacity-70">
          <InlineIcon size={14} />
          {strain.type ?? "Unknown Type"}
        </div>
      </div>
    </div>
  );
}
