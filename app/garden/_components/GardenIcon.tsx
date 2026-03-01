"use client";

export type GardenIconSize = "sm" | "md" | "lg";

interface GardenIconProps {
  label: string;
  icon: string;
  onClick?: () => void;
  size?: GardenIconSize;
}

const sizeClasses: Record<GardenIconSize, string> = {
  sm: "w-14 h-14 text-sm",
  md: "w-20 h-20 text-base",
  lg: "w-28 h-28 text-lg",
};

const iconSizeClasses: Record<GardenIconSize, string> = {
  sm: "text-2xl mb-1",
  md: "text-4xl mb-2",
  lg: "text-5xl mb-3",
};

export default function GardenIcon({
  label,
  icon,
  onClick,
  size = "md",
}: GardenIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center rounded-full backdrop-blur-xl bg-white/80 shadow-xl transition-transform duration-200 hover:scale-110 ${sizeClasses[size]}`}
    >
      <div className={`select-none ${iconSizeClasses[size]}`}>{icon}</div>
      <div className="text-sm font-semibold tracking-wide opacity-90">
        {label}
      </div>
    </button>
  );
}
