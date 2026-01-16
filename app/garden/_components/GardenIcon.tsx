"use client";

export type GardenIconProps = {
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
        rounded-3xl
        bg-white/20
        backdrop-blur-xl
        shadow-2xl
        border border-white/30
        text-white
        hover:bg-white/30
        active:scale-95
        transition
      "
    >
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-sm font-semibold tracking-wide text-white/90">
        {label}
      </div>
    </button>
  );
}
