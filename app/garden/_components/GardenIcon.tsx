"use client";

import Link from "next/link";

type GardenIconProps = {
  label: string;
  icon: string;
  href: string;
};

export default function GardenIcon({ label, icon, href }: GardenIconProps) {
  return (
    <Link
      href={href}
      className="
        flex flex-col items-center justify-center
        w-36 h-36
        rounded-[32px]
        bg-white/20
        backdrop-blur-xl
        border border-white/30
        shadow-[0_20px_40px_rgba(0,0,0,0.35)]
        hover:bg-white/30
        transition-all duration-200
        active:scale-95
        cursor-pointer
      "
    >
      <div className="text-5xl mb-3">
        {icon}
      </div>
      <div className="text-sm font-semibold tracking-wide text-white">
        {label}
      </div>
    </Link>
  );
}
