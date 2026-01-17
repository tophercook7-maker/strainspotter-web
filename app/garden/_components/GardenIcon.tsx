"use client";

type GardenIconProps = {
  label: string;
  icon: string;
  onClick?: () => void;
};

export default function GardenIcon({
  label,
  icon,
  onClick,
}: GardenIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-36 h-36 rounded-full backdrop-blur-xl bg-white/80 shadow-xl flex flex-col items-center justify-center hover:scale-110 transition-transform duration-200"
    >
      <div className="text-5xl mb-3 select-none">{icon}</div>
      <div className="text-sm font-semibold tracking-wide opacity-90">
        {label}
      </div>
    </button>
  );
}
