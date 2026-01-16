"use client";

import Link from "next/link";

type Props = {
  label: string;
  icon: string;
  route: string;
};

export default function GardenIcon({ label, icon, route }: Props) {
  return (
    <Link
      href={route}
      className="
        h-32 w-32
        rounded-3xl
        backdrop-blur-xl
        bg-white/20
        border border-white/30
        shadow-[0_20px_40px_rgba(0,0,0,0.35)]
        flex flex-col items-center justify-center
        text-black
        transition-all duration-300
        hover:scale-[1.08]
        hover:bg-white/30
        active:scale-[0.98]
      "
    >
      <div className="text-2xl md:text-3xl leading-none drop-shadow-sm">{icon}</div>
      <div className="text-[11px] md:text-[12px] font-semibold text-white/95 tracking-tight text-center leading-tight">
        {label}
      </div>
    </Link>
  );
}
