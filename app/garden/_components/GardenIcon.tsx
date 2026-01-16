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
      className={[
        // HARD-LOCK iPad tile size (prevents "pill bar" stretching)
        "group relative grid place-items-center",
        "h-28 w-28 md:h-32 md:w-32",
        "rounded-[28px]",

        // Apple-ish glass
        "bg-white/20 backdrop-blur-xl",
        "border border-white/30",
        "shadow-[0_18px_40px_rgba(0,0,0,0.45)]",

        // Interaction
        "transition-transform duration-200 ease-out",
        "hover:-translate-y-1 active:translate-y-0",
        "focus:outline-none focus:ring-2 focus:ring-green-400/70",
      ].join(" ")}
    >
      {/* subtle top highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/35 via-white/10 to-transparent opacity-80" />

      <div className="relative flex flex-col items-center justify-center gap-2">
        <div className="text-2xl md:text-3xl leading-none drop-shadow-sm">{icon}</div>
        <div className="text-[11px] md:text-[12px] font-semibold text-white/95 tracking-tight text-center leading-tight">
          {label}
        </div>
      </div>
    </Link>
  );
}
