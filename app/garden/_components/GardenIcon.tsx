"use client";

type GardenIconProps = {
  label: string;
  icon: string;
  onClick?: () => void;
};

export default function GardenIcon({ label, icon, onClick }: GardenIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        flex flex-col items-center justify-center
        w-36 h-36
        rounded-[28px]
        bg-white/25
        backdrop-blur-xl
        shadow-[0_20px_40px_rgba(0,0,0,0.35)]
        border border-white/30
        transition-transform transition-shadow
        hover:scale-[1.06]
        hover:shadow-[0_28px_55px_rgba(0,0,0,0.45)]
        active:scale-[0.98]
        focus:outline-none
      "
    >
      <div className="text-5xl mb-3">{icon}</div>
      <div className="text-sm font-semibold tracking-wide text-white">
        {label}
      </div>
    </button>
  );
}
