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
        flex flex-col items-center justify-center
        w-40 h-40
        rounded-3xl
        bg-white/20
        backdrop-blur-xl
        border border-white/30
        shadow-2xl
        text-white
        hover:bg-white/30
        hover:scale-105
        transition-all
        active:scale-95
        focus:outline-none
      "
    >
      <div className="text-6xl mb-3">{icon}</div>
      <div className="text-base font-semibold tracking-wide text-white/90 text-center">
        {label}
      </div>
    </button>
  );
}
