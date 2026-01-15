"use client";

export default function GardenIcon({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        w-32 h-32
        rounded-[28px]
        bg-white/20
        backdrop-blur-xl
        shadow-2xl
        border border-white/30
        flex flex-col items-center justify-center
        text-white
        hover:bg-white/30
        transition
        active:scale-95
      "
    >
      <div className="text-5xl mb-2">{icon}</div>
      <div className="text-sm font-semibold tracking-wide">{label}</div>
    </button>
  );
}
