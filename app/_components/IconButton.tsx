import Link from "next/link";
import type { ReactNode } from "react";

type IconButtonProps = {
  href: string;
  icon: ReactNode; // emoji or an SVG
  label: string;
  subtitle?: string;
};

export function IconButton({ href, icon, label, subtitle }: IconButtonProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md p-5
                 hover:bg-black/35 hover:border-white/20 transition-colors
                 focus:outline-none focus:ring-2 focus:ring-white/30"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="min-w-0">
          <div className="font-semibold text-white">{label}</div>
          {subtitle ? (
            <div className="text-sm text-white/60 truncate">{subtitle}</div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
