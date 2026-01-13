"use client";

import { ReactNode } from "react";

export default function GardenIcon({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        w-32 h-32
        rounded-[30px]
        bg-white/70
        backdrop-blur-xl
        shadow-[0_20px_40px_rgba(0,0,0,0.35)]
        flex flex-col items-center justify-center
        transition-all duration-200 ease-out
        hover:scale-105
        active:scale-95
      "
    >
      <div className="text-4xl mb-2">{icon}</div>
      <span className="text-sm font-semibold text-black">
        {label}
      </span>
    </button>
  );
}
