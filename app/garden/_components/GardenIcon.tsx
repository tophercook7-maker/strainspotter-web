"use client";

import { useRouter } from "next/navigation";

interface GardenIconProps {
  label: string;
  icon: string;
  route: string;
}

export default function GardenIcon({ label, icon, route }: GardenIconProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(route)}
      className="
        group
        flex flex-col items-center justify-center
        h-28 w-28
        rounded-2xl
        bg-white/20
        backdrop-blur-xl
        border border-white/30
        shadow-[0_8px_30px_rgba(0,0,0,0.25)]
        transition-all duration-200 ease-out
        hover:bg-white/30
        hover:scale-[1.05]
        active:scale-[0.97]
      "
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-xs font-medium text-white/90 tracking-wide">
        {label}
      </span>
    </button>
  );
}
