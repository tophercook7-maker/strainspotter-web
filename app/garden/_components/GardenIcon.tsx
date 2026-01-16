"use client";

export type GardenIconProps = {
  label: string;
  icon: string;
  onClick?: () => void;
  className?: string;
};

export default function GardenIcon({
  label,
  icon,
  onClick,
  className = "",
}: GardenIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        // iPad / Apple-ish launcher tile
        "group relative flex flex-col items-center justify-center",
        "h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32",
        "rounded-3xl",
        // glass
        "bg-white/14 backdrop-blur-xl",
        "border border-white/20",
        "shadow-[0_12px_30px_rgba(0,0,0,0.35)]",
        // interaction
        "transition-all duration-200",
        "hover:bg-white/18 hover:border-white/30 hover:-translate-y-0.5",
        "active:translate-y-0 active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-green-400/60 focus:ring-offset-0",
        className,
      ].join(" ")}
      aria-label={label}
    >
      <div className="text-2xl sm:text-3xl md:text-4xl leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
        {icon}
      </div>
      <div className="mt-1 text-[10px] sm:text-[11px] md:text-[12px] font-medium text-white/90 text-center leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
        {label}
      </div>

      {/* subtle top highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/18 to-transparent opacity-70" />
      {/* subtle bottom shade */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-t from-black/20 to-transparent opacity-60" />
    </button>
  );
}
