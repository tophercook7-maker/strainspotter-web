"use client";

type Props = {
  label: string;
  icon: string;
  onClick: () => void;
};

export default function GardenIcon({ label, icon, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="
        h-28 w-28
        rounded-[28px]
        bg-white/90
        text-black
        flex flex-col items-center justify-center
        shadow-xl
        backdrop-blur-md
        transition
        active:scale-95
      "
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
