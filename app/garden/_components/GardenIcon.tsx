"use client";

import * as React from "react";

type Props = {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
};

export default function GardenIcon({ label, icon, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group select-none",
        "flex flex-col items-center justify-center",
        "w-[96px] h-[96px] sm:w-[110px] sm:h-[110px] md:w-[120px] md:h-[120px]",
        "rounded-[26px]",
        "bg-white/90 backdrop-blur-xl",
        "shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
        "ring-1 ring-white/60",
        "transition-transform duration-150 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(0,0,0,0.45)]",
        "active:translate-y-0 active:scale-[0.98]",
      ].join(" ")}
    >
      <div className="text-[22px] leading-none drop-shadow-sm">{icon}</div>
      <div className="mt-2 text-[12px] font-medium text-black/80">
        {label}
      </div>
    </button>
  );
}
