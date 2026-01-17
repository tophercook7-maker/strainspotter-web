// app/garden/GardenGlassCard.tsx
import Link from "next/link";

type GardenGlassCardProps = {
  title: string;
  description: string;
  href: string;
  variant?: "default" | "clear";
};

export function GardenGlassCard({
  title,
  description,
  href,
  variant = "default",
}: GardenGlassCardProps) {
  return (
    <Link
      href={href}
      className={`
        group relative block w-full rounded-2xl border
        px-5 py-6 text-center
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400
        ${
          variant === "clear"
            ? "border-green-400/40 bg-green-500/10 hover:bg-green-500/20"
            : "border-white/15 bg-white/10 hover:bg-white/20"
        }
      `}
    >
      <div className="pointer-events-none flex flex-col gap-2">
        <h3 className="text-base font-semibold text-white">
          {title}
        </h3>
        <p className="text-sm text-white/70">
          {description}
        </p>
      </div>

      {/* Hover affordance */}
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent group-hover:ring-white/30" />
    </Link>
  );
}
