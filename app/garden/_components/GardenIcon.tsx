"use client";

export default function GardenIcon({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="
        w-28 h-28
        rounded-[22px]
        bg-white/80
        backdrop-blur-xl
        shadow-lg
        flex flex-col items-center justify-center
        transition-transform duration-200
        hover:scale-105
        active:scale-95
        focus:outline-none
      "
      type="button"
    >
      <div className="text-3xl mb-2">{icon}</div>
      <span className="text-sm font-medium text-black">
        {label}
      </span>
    </button>
  );
}
