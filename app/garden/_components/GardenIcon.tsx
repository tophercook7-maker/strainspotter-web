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
        w-28 h-28
        rounded-[28px]
        bg-white/80
        backdrop-blur-md
        shadow-[0_12px_30px_rgba(0,0,0,0.25)]
        flex flex-col items-center justify-center
        text-gray-800
        transition-transform
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
