"use client";

type Props = {
  icon: string;
  label: string;
  onClick: () => void;
};

export default function GardenIcon({ icon, label, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        flex flex-col items-center justify-center
        w-28 h-28
        rounded-3xl
        bg-white/20
        backdrop-blur-xl
        border border-white/30
        shadow-[0_20px_40px_rgba(0,0,0,0.35)]
        hover:bg-white/30
        active:scale-95
        transition
        text-white
      "
    >
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-sm font-semibold tracking-wide text-white/90">
        {label}
      </div>
    </button>
  );
}
