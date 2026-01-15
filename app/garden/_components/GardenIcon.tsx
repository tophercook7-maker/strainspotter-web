"use client";

interface Props {
  icon: string;
  label: string;
  onClick: () => void;
}

export default function GardenIcon({ icon, label, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="
        w-28 h-28
        rounded-3xl
        bg-white/90
        shadow-[0_8px_20px_rgba(0,0,0,0.25)]
        flex flex-col items-center justify-center
        transition-transform active:scale-95
      "
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-sm font-medium text-black text-center leading-tight">
        {label}
      </span>
    </button>
  );
}
