import Link from "next/link";
import { ReactNode } from "react";

interface GardenGlassButtonProps {
  title: string;
  description?: string;
  href: string;
  icon?: ReactNode;
}

export default function GardenGlassButton({
  title,
  description,
  href,
  icon,
}: GardenGlassButtonProps) {
  return (
    <Link
      href={href}
      className="
        group relative flex flex-col items-center justify-center
        rounded-2xl border border-white/15
        bg-white/10 px-6 py-8 text-center
        backdrop-blur-md transition
        hover:bg-white/15 hover:border-white/30
        hover:scale-[1.02]
      "
    >
      {icon && (
        <div className="mb-4 text-3xl text-green-400">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-white">
        {title}
      </h3>

      {description && (
        <p className="mt-2 text-sm text-white/70">
          {description}
        </p>
      )}
    </Link>
  );
}

