"use client";

type GardenIconProps = {
  label: string;
  icon: string;
  onClick: () => void;
};

export default function GardenIcon({ label, icon, onClick }: GardenIconProps) {
  return (
    <button
      onClick={onClick}
      className="
        w-28 h-28 md:w-32 md:h-32
        rounded-[28px]
        bg-white/14
        border border-white/22
        shadow-[0_14px_40px_rgba(0,0,0,0.40)]
        backdrop-blur-xl
        flex flex-col items-center justify-center
        active:scale-[0.98]
        hover:bg-white/18
        transition
      "
    >
      <div className="text-2xl md:text-3xl leading-none">{icon}</div>
      <div className="mt-2 text-[12px] md:text-[13px] font-semibold text-white/95 tracking-tight">
        {label}
      </div>
    </button>
  );
}
