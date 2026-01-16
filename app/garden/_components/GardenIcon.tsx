"use client";

import { ReactNode } from "react";

interface GardenIconProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

export default function GardenIcon({ icon, label, onClick }: GardenIconProps) {
  return (
    <button
      onClick={onClick}
      className="
        flex flex-col items-center justify-center
        w-28 h-28
        rounded-[28px]
        bg-white/75
        backdrop-blur-xl
        shadow-[0_12px_30px_rgba(0,0,0,0.25)]
        border border-white/60
        transition-all duration-200
        active:scale-[0.97]
        hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)]
      "
    >
      <div className="text-2xl mb-2">{icon}</div>
      <span className="text-xs font-medium text-black/80">
        {label}
      </span>
    </button>
  );
}
