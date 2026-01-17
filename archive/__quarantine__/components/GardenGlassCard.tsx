// components/GardenGlassCard.tsx
"use client";

import Link from "next/link";
import clsx from "clsx";

type GardenGlassCardProps = {
  title: string;
  description?: string;
  href: string;
  variant?: "clear" | "blur";
};

export function GardenGlassCard({
  title,
  description,
  href,
  variant = "blur",
}: GardenGlassCardProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "group relative rounded-2xl p-6 transition-all duration-300",
        "border border-white/10",
        "hover:scale-[1.02]",
        variant === "clear"
          ? [
              "bg-white/20",
              "backdrop-blur-sm",
              "shadow-[0_0_40px_rgba(34,197,94,0.25)]",
              "hover:shadow-[0_0_60px_rgba(34,197,94,0.35)]",
            ]
          : [
              "bg-white/10",
              "backdrop-blur-md",
              "opacity-90",
              "hover:opacity-100",
            ]
      )}
    >
      <div className="flex flex-col items-center text-center gap-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description && (
          <p className="text-sm text-white/70 max-w-[18rem]">
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}

