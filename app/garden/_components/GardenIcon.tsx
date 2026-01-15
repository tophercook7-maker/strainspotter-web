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
      className="h-28 w-28 rounded-3xl bg-white/90 shadow-xl backdrop-blur-sm flex flex-col items-center justify-center"
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-[13px] font-medium text-black text-center leading-tight">
        {label}
      </span>
    </button>
  );
}
