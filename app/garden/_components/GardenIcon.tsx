"use client";

import React from "react";

export default function GardenIcon({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group
        w-36 h-36
        rounded-[28px]
        bg-white/18
        backdrop-blur-xl
        border border-white/25
        shadow-2xl
        flex flex-col items-center justify-center
        hover:bg-white/26
        select-none
        active:scale-[0.98]
        transition
        focus:outline-none focus:ring-2 focus:ring-white/40
      "
    >
      <div className="text-5xl mb-3 leading-none">{icon}</div>
      <div className="text-base font-semibold tracking-wide text-white/90">
        {label}
      </div>
    </button>
  );
}
