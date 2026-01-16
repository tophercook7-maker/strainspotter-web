"use client";

type GardenIconProps = {
  label: string;
  icon: string;
  onClick: () => void;
};

export default function GardenIcon({ label, icon, onClick }: GardenIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        flex flex-col items-center justify-center
        w-32 h-32
        rounded-[28px]
        bg-white/20
        backdrop-blur-xl
        border border-white/30
        shadow-[0_18px_40px_rgba(0,0,0,0.35)]
        text-white
        transition
        hover:bg-white/30
        active:scale-95
        focus:outline-none
      "
    >
      <div className="text-5xl mb-3 select-none">{icon}</div>
      <div className="text-sm font-semibold tracking-wide text-white/90">
        {label}
      </div>
    </button>
  );
}
