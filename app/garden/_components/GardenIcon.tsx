"use client";

interface GardenIconProps {
  icon: string;
  label: string;
  onClick: () => void;
}

export default function GardenIcon({
  icon,
  label,
  onClick,
}: GardenIconProps) {
  return (
    <button
      onClick={onClick}
      className="
        w-[112px] h-[112px]
        rounded-[28px]
        bg-white/95
        shadow-[0_10px_24px_rgba(0,0,0,0.28)]
        flex flex-col items-center justify-center
        gap-2
        transition-transform
        active:scale-[0.96]
      "
    >
      <span className="text-4xl leading-none">{icon}</span>
      <span className="text-[13px] font-medium text-black text-center leading-tight">
        {label}
      </span>
    </button>
  );
}
