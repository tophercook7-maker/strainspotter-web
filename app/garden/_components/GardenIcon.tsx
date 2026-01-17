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
      className="
        flex flex-col items-center justify-center
        w-32 h-32
        rounded-[28px]
        bg-white/18
        backdrop-blur-xl
        border border-white/25
        shadow-[0_10px_30px_rgba(0,0,0,0.35)]
        hover:bg-white/25
        hover:shadow-[0_14px_40px_rgba(0,0,0,0.45)]
        active:scale-95
        transition-all duration-200 ease-out
        text-white
      "
    >
      <div className="text-4xl mb-3 select-none">{icon}</div>
      <div className="text-sm font-semibold tracking-wide opacity-90">
        {label}
      </div>
    </button>
  );
}
