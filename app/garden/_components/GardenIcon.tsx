"use client";

type GardenIconProps = {
  label: string;
  icon: string;
  onClick: () => void;
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
        bg-white/25
        backdrop-blur-2xl
        shadow-[0_20px_40px_rgba(0,0,0,0.35)]
        border border-white/40
        text-white
        hover:bg-white/35
        hover:shadow-[0_30px_60px_rgba(0,0,0,0.45)]
        active:scale-[0.97]
        transition-all duration-200 ease-out
        focus:outline-none
      "
    >
      <div className="text-5xl mb-3 leading-none select-none">
        {icon}
      </div>
      <div className="text-sm font-semibold tracking-wide text-white/95">
        {label}
      </div>
    </button>
  );
}
