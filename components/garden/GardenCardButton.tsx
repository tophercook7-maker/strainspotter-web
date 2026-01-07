import Link from "next/link";

interface GardenCardButtonProps {
  href: string;
  title: string;
  description: string;
  isPrimary?: boolean;
}

export function GardenCardButton({
  href,
  title,
  description,
  isPrimary = false,
}: GardenCardButtonProps) {
  const isExternal = href.startsWith('http://') || href.startsWith('https://');
  const className = `
    rounded-xl
    backdrop-blur-md
    ${isPrimary ? 'bg-white/18 border-white/20' : 'bg-white/10 border-white/10'}
    border
    ${isPrimary ? 'p-7 min-h-[120px]' : 'p-6 min-h-[100px]'}
    hover:bg-white/15
    hover:border-white/20
    ${isPrimary ? 'hover:scale-[1.02] hover:bg-white/22' : ''}
    active:bg-white/12
    transition-all
    flex flex-col justify-center
    cursor-pointer
    block
  `;

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <div className={`${isPrimary ? 'text-lg font-semibold' : 'text-base font-medium'} text-white mb-1.5`}>
          {title}
        </div>
        <div className="text-sm text-white/70">
          {description}
        </div>
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={className}
    >
      <div className={`${isPrimary ? 'text-lg font-semibold' : 'text-base font-medium'} text-white mb-1.5`}>
        {title}
      </div>
      <div className="text-sm text-white/70">
        {description}
      </div>
    </Link>
  );
}

