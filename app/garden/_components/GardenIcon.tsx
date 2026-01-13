"use client";

type Props = {
  label: string;
  icon: string;
  onClick: () => void;
};

export default function GardenIcon({ label, icon, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group
        w-32 h-32
        rounded-[28px]
        bg-white/18
        backdrop-blur-2xl
        border border-white/25
        shadow-xl
        flex flex-col items-center justify-center
        gap-2
        select-none
        hover:bg-white/26
        active:scale-[0.98]
        transition
        focus:outline-none focus:ring-2 focus:ring-white/40
      "
    >
      <div className="text-5xl leading-none">{icon}</div>
      <div className="text-sm font-semibold tracking-wide text-white/90 text-center leading-tight px-2">
        {label}
      </div>
    </button>
  );
}
