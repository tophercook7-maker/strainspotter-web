"use client";

export function GardenIcon({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="
        group
        flex
        flex-col
        items-center
        justify-center
        w-24
        h-24
        rounded-2xl
        bg-white/20
        backdrop-blur-md
        shadow-lg
        transition
        hover:scale-105
        hover:bg-white/30
        active:scale-95
      "
    >
      <div className="text-2xl mb-1">{icon}</div>
      <span className="text-xs text-white/90 text-center">
        {label}
      </span>
    </a>
  );
}
