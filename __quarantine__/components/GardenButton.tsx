import Link from "next/link";

export default function GardenButton({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link href={href} className="group block">
      <div
        className="
          flex items-center gap-4
          px-6 py-4
          rounded-2xl
          bg-white/15
          backdrop-blur-xl
          border border-white/25
          text-white
          shadow-lg
          hover:bg-white/25
          hover:scale-[1.01]
          transition
        "
      >
        <div className="text-2xl">{icon}</div>
        <div className="flex flex-col">
          <span className="font-semibold">{title}</span>
          {subtitle && (
            <span className="text-sm text-white/70">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
