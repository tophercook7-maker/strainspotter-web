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
      onClick={onClick}
      className="
        w-36 h-36
        rounded-[32px]
        bg-white/25
        backdrop-blur-xl
        border border-white/30
        shadow-[0_20px_40px_rgba(0,0,0,0.35)]
        flex flex-col items-center justify-center
        text-black
        transition
        hover:bg-white/35
        active:scale-95
      "
    >
      <div className="text-5xl mb-3">{icon}</div>
      <div className="text-sm font-semibold tracking-wide text-black/80">
        {label}
      </div>
    </button>
  );
}
